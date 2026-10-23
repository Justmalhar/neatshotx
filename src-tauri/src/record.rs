//! Screen recording via a system ffmpeg (avfoundation / gdigrab / x11grab).
use std::{
    io::Write,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

use crate::{capture::Region, settings, windows};

#[derive(Default)]
pub struct RecState {
    child: Mutex<Option<(Child, PathBuf)>>,
    input_running: Arc<AtomicBool>,
}

pub fn ffmpeg() -> PathBuf {
    for p in ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"] {
        if std::path::Path::new(p).exists() {
            return p.into();
        }
    }
    "ffmpeg".into() // PATH (Windows: ffmpeg.exe)
}

fn even(v: u32) -> u32 {
    (v / 2 * 2).max(2)
}

fn build_args(s: &settings::Settings, r: Region, phys: (i32, i32), screen: usize, out: &str) -> Vec<String> {
    let fps = s.record_fps.to_string();
    let (w, h) = (even(r.w), even(r.h));
    let mut a: Vec<String> = vec!["-y".into()];
    let mut audio_inputs = 0;
    if cfg!(target_os = "macos") {
        let mic = if s.record_mic {
            audio_inputs = 1;
            if s.record_mic_device.is_empty() { "default".to_string() } else { s.record_mic_device.clone() }
        } else {
            "none".into()
        };
        a.extend(["-f", "avfoundation", "-capture_cursor", "1", "-framerate", &fps].map(String::from));
        a.extend(["-i".into(), format!("Capture screen {screen}:{mic}")]);
        a.extend(["-vf".into(), format!("crop={w}:{h}:{}:{}", r.x, r.y)]);
    } else if cfg!(target_os = "windows") {
        a.extend(["-f", "gdigrab", "-draw_mouse", "1", "-framerate", &fps].map(String::from));
        a.extend(["-offset_x".into(), (phys.0 + r.x as i32).to_string(), "-offset_y".into(), (phys.1 + r.y as i32).to_string()]);
        a.extend(["-video_size".into(), format!("{w}x{h}"), "-i".into(), "desktop".into()]);
        if s.record_mic && !s.record_mic_device.is_empty() {
            a.extend(["-f".into(), "dshow".into(), "-i".into(), format!("audio={}", s.record_mic_device)]);
            audio_inputs += 1;
        }
    } else {
        let display = std::env::var("DISPLAY").unwrap_or_else(|_| ":0".into());
        a.extend(["-f", "x11grab", "-draw_mouse", "1", "-framerate", &fps].map(String::from));
        a.extend(["-video_size".into(), format!("{w}x{h}"), "-i".into(), format!("{display}+{},{}", phys.0 + r.x as i32, phys.1 + r.y as i32)]);
        if s.record_mic {
            let dev = if s.record_mic_device.is_empty() { "default" } else { &s.record_mic_device };
            a.extend(["-f", "pulse", "-i", dev].map(String::from));
            audio_inputs += 1;
        }
        if s.record_system_audio {
            a.extend(["-f", "pulse", "-i", "@DEFAULT_MONITOR@"].map(String::from));
            audio_inputs += 1;
        }
    }
    if audio_inputs == 2 {
        a.extend(["-filter_complex", "[1:a][2:a]amix=inputs=2[aout]", "-map", "0:v", "-map", "[aout]"].map(String::from));
    }
    a.extend(["-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p"].map(String::from));
    if audio_inputs > 0 {
        a.extend(["-c:a", "aac", "-b:a", "160k"].map(String::from));
    }
    a.extend(["-movflags".into(), "+faststart".into(), out.into()]);
    a
}

pub fn start(app: &AppHandle, r: Region, phys: (i32, i32), screen: usize) -> Result<(), String> {
    let st = app.state::<RecState>();
    if st.child.lock().unwrap().is_some() {
        return Err("Already recording".into());
    }
    let s = settings::get(app);
    let out = crate::capture::new_capture_path(app, "mp4");
    let args = build_args(&s, r, phys, screen, &out.to_string_lossy());
    let child = Command::new(ffmpeg())
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Could not start ffmpeg ({e}). Install ffmpeg and make sure it is on PATH."))?;
    *st.child.lock().unwrap() = Some((child, out));

    let _ = windows::overlay(app, "record-bar", "/record-bar")
        .inner_size(300.0, 56.0)
        .position(24.0, 24.0)
        .focused(false)
        .build();
    if s.record_webcam {
        let _ = windows::overlay(app, "webcam", "/webcam").inner_size(220.0, 220.0).position(40.0, 120.0).build();
    }
    if s.record_show_clicks || s.record_show_keys {
        start_input_overlay(app, &s, screen);
    }
    Ok(())
}

/// Click-through overlay over the recorded monitor, fed by polled global input.
fn start_input_overlay(app: &AppHandle, s: &settings::Settings, screen: usize) {
    let monitors = app.available_monitors().unwrap_or_default();
    let Some(m) = monitors.get(screen).or(monitors.first()) else { return };
    let route = format!("/input-overlay?clicks={}&keys={}", s.record_show_clicks, s.record_show_keys);
    if let Ok(w) = windows::cover_monitor(app, "input-overlay", &route, *m.position(), *m.size(), true) {
        let _ = w.set_ignore_cursor_events(true);
    }
    let running = app.state::<RecState>().input_running.clone();
    running.store(true, Ordering::SeqCst);
    let app = app.clone();
    thread::spawn(move || {
        use device_query::{DeviceQuery, DeviceState};
        // ponytail: polling at 60Hz, swap for OS event hooks if missed fast taps matter.
        let Some(dev) = DeviceState::checked_new() else { return };
        let (mut prev_down, mut prev_keys) = (false, Vec::new());
        while running.load(Ordering::SeqCst) {
            let mouse = dev.get_mouse();
            let down = mouse.button_pressed.iter().any(|b| *b);
            if down && !prev_down {
                let _ = app.emit_to("input-overlay", "input-click", mouse.coords);
            }
            prev_down = down;
            let keys: Vec<String> = dev.get_keys().iter().map(|k| format!("{k:?}")).collect();
            if keys != prev_keys && !keys.is_empty() {
                let _ = app.emit_to("input-overlay", "input-keys", &keys);
            }
            prev_keys = keys;
            thread::sleep(Duration::from_millis(16));
        }
    });
}

fn teardown(app: &AppHandle) -> Option<(Child, PathBuf)> {
    let st = app.state::<RecState>();
    st.input_running.store(false, Ordering::SeqCst);
    for l in ["record-bar", "webcam", "input-overlay"] {
        if let Some(w) = app.get_webview_window(l) {
            let _ = w.destroy();
        }
    }
    let taken = st.child.lock().unwrap().take();
    taken
}

#[tauri::command]
pub async fn stop_recording(app: AppHandle, as_gif: bool) -> Result<String, String> {
    let (mut child, mp4) = teardown(&app).ok_or("Not recording")?;
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(b"q"); // graceful stop so the mp4 moov atom is written
    }
    let _ = child.wait();
    let out = if as_gif {
        let gif = gif_from(&mp4)?;
        let _ = std::fs::remove_file(&mp4);
        gif
    } else {
        mp4
    };
    crate::capture::announce(&app, &out);
    Ok(out.to_string_lossy().into())
}

#[tauri::command]
pub async fn cancel_recording(app: AppHandle) {
    if let Some((mut child, mp4)) = teardown(&app) {
        let _ = child.kill();
        let _ = child.wait();
        let _ = std::fs::remove_file(mp4);
    }
}

fn gif_from(video: &std::path::Path) -> Result<PathBuf, String> {
    let gif = video.with_extension("gif");
    let ok = Command::new(ffmpeg())
        .args(["-y", "-i"])
        .arg(video)
        .args(["-vf", "fps=15,scale='min(960,iw)':-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse"])
        .arg(&gif)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|e| e.to_string())?
        .success();
    ok.then_some(gif).ok_or("GIF conversion failed".into())
}

#[tauri::command]
pub async fn convert_to_gif(path: String) -> Result<String, String> {
    gif_from(std::path::Path::new(&path)).map(|p| p.to_string_lossy().into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn args_crop_is_even_and_output_last() {
        let s = settings::Settings::default();
        let a = build_args(&s, Region { monitor: 0, x: 10, y: 20, w: 101, h: 51 }, (0, 0), 0, "out.mp4");
        assert_eq!(a.last().unwrap(), "out.mp4");
        let joined = a.join(" ");
        assert!(joined.contains("100") && joined.contains("50"), "{joined}");
    }
}
