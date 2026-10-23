use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct Settings {
    pub save_dir: String,
    pub image_format: String, // "png" | "jpg" | "webp"
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
    pub window_shadow: bool,
    pub window_padding: u32,
    pub scale_retina_1x: bool,
    pub file_name_template: String, // tokens: {date} {time} {counter}
    pub ask_for_name: bool,
    pub shutter_sound: String, // "default" | "subtle" | "pop" | "classic" | "none"
    pub notifications: bool,
    pub show_menu_bar_icon: bool,
    pub qa_follow_active_screen: bool,
    pub onboarded: bool,
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
            window_shadow: true,
            window_padding: 0,
            scale_retina_1x: false,
            file_name_template: "NeatShotX {date} at {time}".into(),
            ask_for_name: false,
            shutter_sound: "default".into(),
            notifications: false,
            show_menu_bar_icon: true,
            qa_follow_active_screen: true,
            onboarded: false,
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

/// Persists and applies settings (shortcuts, tray menu, tray visibility).
pub fn save(app: &AppHandle, settings: Settings) -> Result<(), String> {
    let p = path(app);
    fs::create_dir_all(p.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::write(&p, serde_json::to_vec_pretty(&settings).unwrap()).map_err(|e| e.to_string())?;
    *app.state::<SettingsState>().0.lock().unwrap() = settings;
    crate::shortcuts::register(app);
    crate::tray::refresh(app); // shortcut hints in the menu
    crate::tray::apply_visibility(app);
    Ok(())
}

#[tauri::command]
pub fn set_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    save(&app, settings)
}

/// Marks the welcome guide as seen without clobbering other fields a stale Preferences window holds.
pub fn mark_onboarded(app: &AppHandle) {
    let mut s = get(app);
    s.onboarded = true;
    let _ = save(app, s);
}

/// Config dir file holding the persisted `{counter}` value.
pub fn counter_path(app: &AppHandle) -> PathBuf {
    app.path().app_config_dir().unwrap().join("counter")
}
