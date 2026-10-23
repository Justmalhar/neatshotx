use image::{imageops, RgbaImage};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::Mutex, thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;
use xcap::{Monitor, Window};

use crate::{desktop, settings, windows};

/// A frozen snapshot of one monitor, shown behind the selection overlay.
pub struct Frozen {
    pub image: RgbaImage,
    /// Index into `xcap::Monitor::all()` (also avfoundation's screen index on macOS).
    pub xcap_index: usize,
    /// Monitor origin/size in xcap's coordinate space (points on macOS, pixels elsewhere).
    pub xcap_rect: (i32, i32, u32, u32),
}

#[derive(Clone, Copy, Serialize, Deserialize, Debug)]
pub struct Region {
    pub monitor: usize,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

#[derive(Default)]
pub struct CaptureState {
    pub frozen: Mutex<Vec<Frozen>>,
    pub mode: Mutex<String>,
    pub last_region: Mutex<Option<Region>>,
    pub icons_hidden_by_us: Mutex<bool>,
}

fn state(app: &AppHandle) -> &CaptureState {
    app.state::<CaptureState>().inner()
}

pub fn history_dir(app: &AppHandle) -> PathBuf {
    let d = app.path().app_data_dir().unwrap().join("history");
    let _ = std::fs::create_dir_all(&d);
    d
}

pub fn new_capture_path(app: &AppHandle, ext: &str) -> PathBuf {
    crate::naming::capture_path(app, &history_dir(app), &settings::get(app).file_name_template, ext)
}

/// Backing scale factor of an xcap monitor (1.0 when unknown).
pub fn monitor_scale(xcap_index: usize) -> f64 {
    Monitor::all()
        .ok()
        .and_then(|v| v.into_iter().nth(xcap_index))
        .and_then(|m| m.scale_factor().ok())
        .unwrap_or(1.0) as f64
}

/// Freeze every monitor and open one selection overlay per monitor.
pub fn start_selection(app: &AppHandle, mode: &str) -> Result<(), String> {
    windows::close_prefixed(app, "selector-");
    *state(app).mode.lock().unwrap() = mode.to_string();
    let s = settings::get(app);
    if s.hide_desktop_icons_while_capturing && desktop::set_icons_visible(false).is_ok() {
        *state(app).icons_hidden_by_us.lock().unwrap() = true;
        thread::sleep(Duration::from_millis(600));
    }
    let qa = app.get_webview_window("quick-access");
    if let Some(w) = &qa {
        let _ = w.hide();
    }

    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let tauri_monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let mut frozen = Vec::new();
    for (i, m) in monitors.iter().enumerate() {
        let image = m.capture_image().map_err(|e| e.to_string())?;
        let rect = (m.x().unwrap_or(0), m.y().unwrap_or(0), m.width().unwrap_or(1), m.height().unwrap_or(1));
        let tm = match_monitor(&tauri_monitors, rect);
        let (pos, size) = tm
            .map(|t| (*t.position(), *t.size()))
            .unwrap_or((PhysicalPosition::new(rect.0, rect.1), PhysicalSize::new(image.width(), image.height())));
        frozen.push((Frozen { image, xcap_index: i, xcap_rect: rect }, pos, size));
    }
    if let Some(w) = qa {
        let _ = w.show();
    }

    let mut st = state(app).frozen.lock().unwrap();
    st.clear();
    let placements: Vec<_> = frozen
        .into_iter()
        .map(|(f, pos, size)| {
            st.push(f);
            (pos, size)
        })
        .collect();
    drop(st);

    for (i, (pos, size)) in placements.into_iter().enumerate() {
        let route = format!("/selector?m={i}&mode={mode}");
        // The page shows itself once the frozen image has loaded, avoiding a flash.
        windows::cover_monitor(app, &format!("selector-{i}"), &route, pos, size, false).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// xcap reports points on macOS and pixels elsewhere; Tauri reports physical pixels.
fn match_monitor(ms: &[tauri::Monitor], (x, y, _, _): (i32, i32, u32, u32)) -> Option<&tauri::Monitor> {
    ms.iter().min_by_key(|m| {
        let p = m.position();
        let s = m.scale_factor();
        let phys = (p.x - x).abs() + (p.y - y).abs();
        let logical = ((p.x as f64 / s) as i32 - x).abs() + ((p.y as f64 / s) as i32 - y).abs();
        phys.min(logical)
    })
}

/// Serves frozen monitor snapshots to the selector page as BMP (no encode cost).
pub fn serve_frozen(app: &AppHandle, path: &str) -> tauri::http::Response<Vec<u8>> {
    let idx: usize = path.trim_matches('/').parse().unwrap_or(usize::MAX);
    let st = state(app).frozen.lock().unwrap();
    let Some(f) = st.get(idx) else {
        return tauri::http::Response::builder().status(404).body(vec![]).unwrap();
    };
    let mut buf = std::io::Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(f.image.clone()).to_rgb8().write_to(&mut buf, image::ImageFormat::Bmp).ok();
    tauri::http::Response::builder()
        .header("Content-Type", "image/bmp")
        .header("Access-Control-Allow-Origin", "*")
        .body(buf.into_inner())
        .unwrap()
}

#[derive(Serialize)]
pub struct WindowRect {
    id: u32,
    title: String,
    app: String,
    x: i32,
    y: i32,
    w: u32,
    h: u32,
}

/// Visible windows on a frozen monitor, front-to-back, in that monitor's image pixels.
#[tauri::command]
pub async fn list_windows(app: AppHandle, monitor: usize) -> Result<Vec<WindowRect>, String> {
    let (mx, my, mw, iw) = {
        let st = state(&app).frozen.lock().unwrap();
        let f = st.get(monitor).ok_or("no frozen monitor")?;
        (f.xcap_rect.0, f.xcap_rect.1, f.xcap_rect.2, f.image.width())
    };
    let scale = iw as f64 / mw as f64;
    let mut ws: Vec<_> = Window::all()
        .map_err(|e| e.to_string())?
        .into_iter()
        .filter(|w| !w.is_minimized().unwrap_or(true))
        .filter(|w| !is_system_window(&w.app_name().unwrap_or_default()))
        .filter(|w| w.width().unwrap_or(0) > 40 && w.height().unwrap_or(0) > 40)
        .collect();
    ws.sort_by_key(|w| std::cmp::Reverse(w.z().unwrap_or(0)));
    Ok(ws
        .into_iter()
        .map(|w| WindowRect {
            id: w.id().unwrap_or(0),
            title: w.title().unwrap_or_default(),
            app: w.app_name().unwrap_or_default(),
            x: ((w.x().unwrap_or(0) - mx) as f64 * scale) as i32,
            y: ((w.y().unwrap_or(0) - my) as f64 * scale) as i32,
            w: (w.width().unwrap_or(0) as f64 * scale) as u32,
            h: (w.height().unwrap_or(0) as f64 * scale) as u32,
        })
        .collect())
}

/// Our own overlays and OS chrome (e.g. the Dock's invisible full-screen window on macOS) aren't pickable windows.
fn is_system_window(app_name: &str) -> bool {
    const SKIP: &[&str] = &[
        "neatshotx", "dock", "window server", "windowserver", "control center", "controlcenter",
        "systemuiserver", "notification center", "notificationcenter", "screenshot", "wallpaper",
    ];
    let n = app_name.to_lowercase();
    SKIP.iter().any(|s| n.contains(s))
}

fn end_selection(app: &AppHandle) {
    windows::close_prefixed(app, "selector-");
    let st = state(app);
    let mut hidden = st.icons_hidden_by_us.lock().unwrap();
    if *hidden {
        let _ = desktop::set_icons_visible(true);
        *hidden = false;
    }
}

#[tauri::command]
pub async fn cancel_selection(app: AppHandle) {
    end_selection(&app);
    state(&app).frozen.lock().unwrap().clear();
}

/// Called by the selector with a region in frozen-image pixels.
#[tauri::command]
pub async fn finish_selection(app: AppHandle, region: Region, window_id: Option<u32>) -> Result<(), String> {
    end_selection(&app);
    let mode = state(&app).mode.lock().unwrap().clone();
    let (crop, xcap_index, xcap_rect, image_w) = {
        let st = state(&app).frozen.lock().unwrap();
        let f = st.get(region.monitor).ok_or("no frozen monitor")?;
        let r = clamp(region, f.image.width(), f.image.height());
        (imageops::crop_imm(&f.image, r.x, r.y, r.w, r.h).to_image(), f.xcap_index, f.xcap_rect, f.image.width())
    };
    let region = clamp(region, u32::MAX, u32::MAX);
    match mode.as_str() {
        "scroll" => crate::scroll::start(&app, region, xcap_index, xcap_rect, image_w)?,
        "timer" => {
            *state(&app).last_region.lock().unwrap() = Some(region);
            let secs = settings::get(&app).self_timer_secs;
            countdown(&app, secs);
            let img = without_overlay(&app, || capture_live(xcap_index, region))?;
            handle_capture(&app, img, xcap_index)?;
        }
        _ => {
            *state(&app).last_region.lock().unwrap() = Some(region);
            let s = settings::get(&app);
            let img = match window_id.and_then(capture_window) {
                Some(img) => crate::window_style::style(img, s.window_shadow, s.window_padding),
                None => crop,
            };
            handle_capture(&app, img, xcap_index)?;
        }
    }
    state(&app).frozen.lock().unwrap().clear();
    Ok(())
}

fn clamp(r: Region, maxw: u32, maxh: u32) -> Region {
    let x = r.x.min(maxw.saturating_sub(1));
    let y = r.y.min(maxh.saturating_sub(1));
    Region { monitor: r.monitor, x, y, w: r.w.clamp(1, maxw - x), h: r.h.clamp(1, maxh - y) }
}

fn capture_window(id: u32) -> Option<RgbaImage> {
    Window::all().ok()?.into_iter().find(|w| w.id().ok() == Some(id))?.capture_image().ok()
}

/// Runs a live grab with the Quick Access Overlay hidden so it never lands in the shot.
fn without_overlay<T>(app: &AppHandle, grab: impl FnOnce() -> T) -> T {
    let qa = app.get_webview_window("quick-access").filter(|w| w.is_visible().unwrap_or(false));
    if let Some(w) = &qa {
        let _ = w.hide();
        thread::sleep(Duration::from_millis(80)); // let the compositor drop it
    }
    let out = grab();
    if let Some(w) = qa {
        let _ = w.show();
    }
    out
}

pub fn capture_live(xcap_index: usize, r: Region) -> Result<RgbaImage, String> {
    let m = Monitor::all().map_err(|e| e.to_string())?.into_iter().nth(xcap_index).ok_or("monitor gone")?;
    let img = m.capture_image().map_err(|e| e.to_string())?;
    let r = clamp(r, img.width(), img.height());
    Ok(imageops::crop_imm(&img, r.x, r.y, r.w, r.h).to_image())
}

pub fn countdown(app: &AppHandle, secs: u64) {
    if secs == 0 {
        return;
    }
    let label = "countdown";
    let _ = windows::overlay(app, label, &format!("/countdown?s={secs}"))
        .inner_size(180.0, 180.0)
        .center()
        .focused(false)
        .build();
    thread::sleep(Duration::from_secs(secs));
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.destroy();
    }
    thread::sleep(Duration::from_millis(150));
}

/// Every display, or only `display` (0-based) when given.
pub fn capture_fullscreen(app: &AppHandle, display: Option<usize>) -> Result<(), String> {
    let s = settings::get(app);
    let hid = s.hide_desktop_icons_while_capturing && desktop::set_icons_visible(false).is_ok();
    if hid {
        thread::sleep(Duration::from_millis(600));
    }
    let shots: Vec<_> = without_overlay(app, || {
        Monitor::all().map(|ms| {
            ms.iter()
                .enumerate()
                .filter(|(i, _)| display.is_none_or(|d| d == *i))
                .filter_map(|(i, m)| Some((m.capture_image().ok()?, i)))
                .collect()
        })
    })
    .map_err(|e| e.to_string())?;
    if hid {
        let _ = desktop::set_icons_visible(true);
    }
    if shots.is_empty() {
        return Err("No such display".into());
    }
    for (img, i) in shots {
        handle_capture(app, img, i)?;
    }
    Ok(())
}

/// Captures an exact region without the selector (URL scheme). x/y/w/h are in xcap units
/// (points on macOS, pixels elsewhere), relative to the display's origin.
pub fn capture_rect(app: &AppHandle, display: usize, (x, y, w, h): (f64, f64, f64, f64)) -> Result<(), String> {
    let m = Monitor::all().map_err(|e| e.to_string())?.into_iter().nth(display).ok_or("No such display")?;
    let img = without_overlay(app, || m.capture_image()).map_err(|e| e.to_string())?;
    let k = img.width() as f64 / m.width().unwrap_or(img.width()).max(1) as f64;
    let px = |v: f64| (v * k).round().max(0.0) as u32;
    let r = clamp(Region { monitor: display, x: px(x), y: px(y), w: px(w), h: px(h) }, img.width(), img.height());
    *state(app).last_region.lock().unwrap() = Some(r);
    handle_capture(app, imageops::crop_imm(&img, r.x, r.y, r.w, r.h).to_image(), display).map(|_| ())
}

pub fn capture_previous_area(app: &AppHandle) -> Result<(), String> {
    let r = state(app).last_region.lock().unwrap().ok_or("No previous area yet")?;
    let img = without_overlay(app, || capture_live(r.monitor, r))?;
    handle_capture(app, img, r.monitor).map(|_| ())
}

/// Post-capture pipeline: persist to history, optional save/copy, Quick Access Overlay.
/// `monitor` is the xcap index the pixels came from (for "Scale Retina screenshots to 1x").
pub fn handle_capture(app: &AppHandle, mut img: RgbaImage, monitor: usize) -> Result<PathBuf, String> {
    let s = settings::get(app);
    if s.scale_retina_1x {
        let k = monitor_scale(monitor);
        if k > 1.0 {
            img = imageops::resize(&img, (img.width() as f64 / k).round().max(1.0) as u32, (img.height() as f64 / k).round().max(1.0) as u32, imageops::FilterType::Lanczos3);
        }
    }
    let ext = match s.image_format.as_str() {
        "jpg" => "jpg",
        "webp" => "webp",
        _ => "png",
    };
    let path = new_capture_path(app, ext);
    if ext == "jpg" {
        image::DynamicImage::ImageRgba8(img.clone()).to_rgb8().save(&path)
    } else {
        img.save(&path) // webp: the image crate's encoder is lossless-only
    }
    .map_err(|e| e.to_string())?;
    if s.save_after_capture && !s.save_dir.is_empty() {
        let name = path.file_name().unwrap();
        let dest = if s.ask_for_name {
            app.dialog()
                .file()
                .set_directory(&s.save_dir)
                .set_file_name(name.to_string_lossy())
                .blocking_save_file()
                .and_then(|f| f.into_path().ok())
        } else {
            Some(PathBuf::from(&s.save_dir).join(name))
        };
        if let Some(dest) = dest {
            let _ = std::fs::copy(&path, dest);
        }
    }
    if s.copy_after_capture {
        let _ = app.clipboard().write_image(&tauri::image::Image::new(img.as_raw(), img.width(), img.height()));
    }
    announce(app, &path);
    Ok(path)
}

/// After-capture actions for a finished screenshot (the Settings matrix).
pub fn announce(app: &AppHandle, path: &std::path::Path) {
    let s = settings::get(app);
    let p = path.to_string_lossy().to_string();
    if s.screenshot_annotate {
        crate::open_editor_window(app, &p);
    }
    if s.screenshot_pin {
        crate::open_pin_window(app, &p);
    }
    let quick_access = s.show_quick_access;
    let _ = app.emit("capture-added", &p);
    if quick_access {
        crate::open_quick_access(app, &p);
    } else if s.notifications {
        let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
        let _ = app.notification().builder().title("Screenshot saved").body(name).show();
    }
}

#[tauri::command]
pub async fn copy_image(app: AppHandle, path: String) -> Result<(), String> {
    let img = image::open(&path).map_err(|e| e.to_string())?.to_rgba8();
    app.clipboard()
        .write_image(&tauri::image::Image::new(img.as_raw(), img.width(), img.height()))
        .map_err(|e| e.to_string())
}

/// Writes editor output (base64 PNG) to `path`, or a new history file when absent.
#[tauri::command]
pub async fn write_png(app: AppHandle, data_b64: String, path: Option<String>, copy: bool) -> Result<String, String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_b64.trim_start_matches("data:image/png;base64,"))
        .map_err(|e| e.to_string())?;
    let out = path.map(PathBuf::from).unwrap_or_else(|| new_capture_path(&app, "png"));
    std::fs::write(&out, &bytes).map_err(|e| e.to_string())?;
    if copy {
        copy_image(app.clone(), out.to_string_lossy().into()).await?;
    }
    let _ = app.emit("capture-updated", out.to_string_lossy().to_string());
    Ok(out.to_string_lossy().into())
}

#[derive(Serialize)]
pub struct HistoryItem {
    pub path: String,
    /// Modified time, ms since the Unix epoch (day-grouping fallback for custom file names).
    pub mtime: u64,
}

#[tauri::command]
pub async fn list_history(app: AppHandle) -> Vec<HistoryItem> {
    let mut items: Vec<_> = std::fs::read_dir(history_dir(&app))
        .map(|rd| rd.flatten().filter_map(|e| Some((e.path(), e.metadata().ok()?.modified().ok()?))).collect())
        .unwrap_or_else(|_| vec![]);
    items.sort_by_key(|(_, t)| std::cmp::Reverse(*t));
    items
        .into_iter()
        .map(|(p, t)| HistoryItem {
            path: p.to_string_lossy().into(),
            mtime: t.duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0),
        })
        .collect()
}

#[tauri::command]
pub async fn delete_capture(app: AppHandle, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.starts_with(history_dir(&app)) {
        return Err("Refusing to delete outside history".into());
    }
    // Also remove the auto-saved copy in the export folder (Quick Access "trash").
    let save_dir = settings::get(&app).save_dir;
    if let (false, Some(name)) = (save_dir.is_empty(), p.file_name()) {
        let _ = std::fs::remove_file(PathBuf::from(save_dir).join(name));
    }
    std::fs::remove_file(p).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_file(src: String, dest: String) -> Result<(), String> {
    std::fs::copy(src, dest).map(|_| ()).map_err(|e| e.to_string())
}

/// Raw file bytes for the webview; a Blob URL keeps canvases untainted (asset:// is cross-origin).
#[tauri::command]
pub async fn read_file(path: String) -> Result<tauri::ipc::Response, String> {
    std::fs::read(path).map(tauri::ipc::Response::new).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_png(app: AppHandle, data_b64: String) -> Result<(), String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_b64.trim_start_matches("data:image/png;base64,"))
        .map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?.to_rgba8();
    app.clipboard()
        .write_image(&tauri::image::Image::new(img.as_raw(), img.width(), img.height()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_history(app: AppHandle) -> Result<(), String> {
    let dir = history_dir(&app);
    std::fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())
}

/// Drops history older than `history_keep_days` (0 = keep forever). Runs at startup.
pub fn prune_history(app: &AppHandle) {
    let days = settings::get(app).history_keep_days;
    if days == 0 {
        return;
    }
    let cutoff = std::time::SystemTime::now() - Duration::from_secs(days as u64 * 86_400);
    for e in std::fs::read_dir(history_dir(app)).into_iter().flatten().flatten() {
        if e.metadata().and_then(|m| m.modified()).map(|t| t < cutoff).unwrap_or(false) {
            let _ = std::fs::remove_file(e.path());
        }
    }
}

/// Last confirmed selection for the selector's "Remember last selection".
#[tauri::command]
pub fn last_region(app: AppHandle) -> Option<Region> {
    *state(&app).last_region.lock().unwrap()
}

/// Editable project files (.neatshot JSON) are plain text.
#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|e| e.to_string())
}
