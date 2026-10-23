use std::sync::atomic::{AtomicU32, Ordering};
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

static SEQ: AtomicU32 = AtomicU32::new(0);

pub fn next_label(prefix: &str) -> String {
    format!("{prefix}-{}", SEQ.fetch_add(1, Ordering::Relaxed))
}

fn url(route: &str) -> WebviewUrl {
    WebviewUrl::App(format!("index.html#{route}").into())
}

/// Borderless, always-on-top, non-activating-looking overlay window.
pub fn overlay<'a>(app: &'a AppHandle, label: &str, route: &str) -> WebviewWindowBuilder<'a, tauri::Wry, AppHandle> {
    WebviewWindowBuilder::new(app, label, url(route))
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .shadow(false)
        .visible_on_all_workspaces(true)
        .accept_first_mouse(true) // first click acts instead of only activating the app
}

/// Covers an entire monitor (physical coords), drawn above the macOS menu bar.
pub fn cover_monitor(app: &AppHandle, label: &str, route: &str, pos: PhysicalPosition<i32>, size: PhysicalSize<u32>, visible: bool) -> tauri::Result<WebviewWindow> {
    let w = overlay(app, label, route).visible(false).focused(true).build()?;
    // Size first: on macOS a resize keeps the bottom-left origin, which would shift a positioned window.
    w.set_size(size)?;
    w.set_position(pos)?;
    raise_above_menubar(&w);
    if visible {
        w.show()?;
    }
    Ok(w)
}

pub fn normal(app: &AppHandle, label: &str, route: &str, title: &str, w: f64, h: f64) -> tauri::Result<WebviewWindow> {
    if let Some(existing) = app.get_webview_window(label) {
        existing.show()?;
        existing.set_focus()?;
        return Ok(existing);
    }
    let b = WebviewWindowBuilder::new(app, label, url(route))
        .title(title)
        .inner_size(w, h)
        .min_inner_size(480.0, 360.0)
        .center();
    // macOS: unified title bar + toolbar (content draws under the traffic lights, like Preview).
    #[cfg(target_os = "macos")]
    let b = b.title_bar_style(tauri::TitleBarStyle::Overlay).hidden_title(true);
    b.build()
}

pub fn close_prefixed(app: &AppHandle, prefix: &str) {
    for (label, w) in app.webview_windows() {
        if label.starts_with(prefix) {
            let _ = w.destroy();
        }
    }
}

#[cfg(target_os = "macos")]
pub fn raise_above_menubar(w: &WebviewWindow) {
    let w2 = w.clone();
    let _ = w.run_on_main_thread(move || {
        use objc2::{msg_send, runtime::AnyObject};
        if let Ok(ptr) = w2.ns_window() {
            // NSScreenSaverWindowLevel: above menu bar and Dock.
            unsafe {
                let obj = &*(ptr as *mut AnyObject);
                let _: () = msg_send![obj, setLevel: 1000isize];
            }
        }
    });
}

#[cfg(not(target_os = "macos"))]
pub fn raise_above_menubar(_w: &WebviewWindow) {}

/// Native HUD material for borderless overlay windows (vibrancy on macOS, acrylic on Windows).
/// CSS backdrop-filter can't blur the desktop behind a transparent window; this can.
pub fn hud_effects(radius: f64) -> tauri::utils::config::WindowEffectsConfig {
    use tauri::window::{Effect, EffectState};
    #[cfg(target_os = "macos")]
    let effects = vec![Effect::HudWindow];
    #[cfg(target_os = "windows")]
    let effects = vec![Effect::Acrylic];
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let effects = vec![];
    tauri::utils::config::WindowEffectsConfig { effects, state: Some(EffectState::Active), radius: Some(radius), color: None, ..Default::default() }
}
