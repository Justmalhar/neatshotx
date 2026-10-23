use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct Settings {
    pub save_dir: String,
    pub image_format: String, // "png" | "jpg"
    pub copy_after_capture: bool,
    pub save_after_capture: bool,
    pub show_quick_access: bool,
    pub self_timer_secs: u64,
    pub hide_desktop_icons_while_capturing: bool,
    pub record_fps: u32,
    pub record_mic: bool,
    pub record_mic_device: String, // ffmpeg device name; "" = platform default
    pub record_system_audio: bool,
    pub record_show_clicks: bool,
    pub record_show_keys: bool,
    pub record_webcam: bool,
    pub record_countdown: bool,
    pub keystrokes_only_modifiers: bool,
    pub qa_position: String, // "left" | "right"
    pub qa_auto_close_secs: u64, // 0 = never
    pub qa_close_after_drag: bool,
    pub qa_close_after_upload: bool,
    pub selector_remember_last: bool,
    pub selector_show_magnifier: bool,
    pub play_sounds: bool,
    pub history_keep_days: u32, // 0 = forever
    pub upload_url: String,
    pub upload_field: String,
    pub upload_headers: BTreeMap<String, String>,
    pub shortcuts: BTreeMap<String, String>, // action -> accelerator
}

impl Default for Settings {
    fn default() -> Self {
        let save_dir = dirs_desktop().to_string_lossy().into_owned();
        let shortcuts = [
            ("capture-fullscreen", "Alt+Shift+1"),
            ("capture-area", "Alt+Shift+2"),
            ("capture-window", "Alt+Shift+3"),
            ("capture-previous-area", "Alt+Shift+4"),
            ("record-screen", "Alt+Shift+5"),
            ("scrolling-capture", "Alt+Shift+6"),
            ("capture-text", "Alt+Shift+7"),
            ("self-timer", "Alt+Shift+8"),
        ]
        .into_iter()
        .map(|(a, b)| (a.to_string(), b.to_string()))
        .collect();
        Self {
            save_dir,
            image_format: "png".into(),
            copy_after_capture: true,
            save_after_capture: true,
            show_quick_access: true,
            self_timer_secs: 5,
            hide_desktop_icons_while_capturing: false,
            record_fps: 30,
            record_mic: false,
            record_mic_device: String::new(),
            record_system_audio: false,
            record_show_clicks: true,
            record_show_keys: false,
            record_webcam: false,
            record_countdown: true,
            keystrokes_only_modifiers: false,
            qa_position: "left".into(),
            qa_auto_close_secs: 0,
            qa_close_after_drag: true,
            qa_close_after_upload: false,
            selector_remember_last: false,
            selector_show_magnifier: true,
            play_sounds: true,
            history_keep_days: 0,
            upload_url: String::new(),
            upload_field: "file".into(),
            upload_headers: BTreeMap::new(),
            shortcuts,
        }
    }
}

fn dirs_desktop() -> PathBuf {
    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_default();
    let desktop = home.join("Desktop");
    if desktop.is_dir() { desktop } else { home }
}

pub struct SettingsState(pub Mutex<Settings>);

fn path(app: &AppHandle) -> PathBuf {
    app.path().app_config_dir().unwrap().join("settings.json")
}

pub fn load(app: &AppHandle) -> Settings {
    fs::read(path(app))
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

pub fn get(app: &AppHandle) -> Settings {
    app.state::<SettingsState>().0.lock().unwrap().clone()
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Settings {
    get(&app)
}

#[tauri::command]
pub fn set_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let p = path(&app);
    fs::create_dir_all(p.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::write(&p, serde_json::to_vec_pretty(&settings).unwrap()).map_err(|e| e.to_string())?;
    *app.state::<SettingsState>().0.lock().unwrap() = settings;
    crate::shortcuts::register(&app);
    crate::tray::refresh(&app); // shortcut hints in the menu
    Ok(())
}
