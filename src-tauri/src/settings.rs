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
    // After-capture matrix (screenshot columns reuse the original three flags above).
    pub screenshot_annotate: bool,
    pub screenshot_pin: bool,
    pub qa_position: String, // "left" | "right"
    pub qa_auto_close_secs: u64, // 0 = never
    pub qa_close_after_drag: bool,
    pub scroll_auto: bool,
    pub selector_remember_last: bool,
    pub selector_show_magnifier: bool,
    pub play_sounds: bool,
    pub history_keep_days: u32, // 0 = forever
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
            ("scrolling-capture", "Alt+Shift+6"),
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
            screenshot_annotate: false,
            screenshot_pin: false,
            qa_position: "left".into(),
            qa_auto_close_secs: 0,
            qa_close_after_drag: true,
            scroll_auto: true,
            selector_remember_last: false,
            selector_show_magnifier: false,
            play_sounds: true,
            history_keep_days: 0,
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
