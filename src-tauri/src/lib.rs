mod capture;
mod desktop;
mod link;
mod naming;
mod scroll;
mod settings;
mod shortcuts;
mod tray;
mod window_style;
mod windows;

use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, RunEvent};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

/// Paths waiting to be shown in the Quick Access Overlay, and the monitor it is anchored to.
#[derive(Default)]
struct QuickAccessQueue(Mutex<Vec<String>>, Mutex<Option<tauri::Monitor>>);

/// Single dispatch point for tray, shortcuts, deep links (neatshotx://<action>) and CLI args.
pub fn run_action(app: &AppHandle, action: &str) {
    let (app, action) = (app.clone(), action.to_string());
    std::thread::spawn(move || {
        let res: Result<(), String> = match action.as_str() {
            "capture-area" => capture::start_selection(&app, "area"),
            "capture-window" => capture::start_selection(&app, "window"),
            "scrolling-capture" => capture::start_selection(&app, "scroll"),
            "self-timer" => capture::start_selection(&app, "timer"),
            "capture-fullscreen" => capture::capture_fullscreen(&app, None),
            "capture-previous-area" => capture::capture_previous_area(&app),
            "toggle-desktop-icons" => desktop::set_icons_visible(desktop::icons_hidden()).map(|_| tray::refresh(&app)),
            "hide-desktop-icons" => desktop::set_icons_visible(false).map(|_| tray::refresh(&app)),
            "show-desktop-icons" => desktop::set_icons_visible(true).map(|_| tray::refresh(&app)),
            "open-history" | "history" => open_home(&app, "history"),
            "open-settings" | "settings" => open_home(&app, "settings"),
            "welcome-guide" => open_welcome(&app),
            "annotate" | "open" => pick_image(&app).map(|p| open_editor_window(&app, &p)),
            "pin-image" => pick_image(&app).map(|p| open_pin_window(&app, &p)),
            "open-from-clipboard" => from_clipboard(&app).map(|p| open_editor_window(&app, &p)),
            "restore-recently-closed" => tauri::async_runtime::block_on(capture::list_history(app.clone()))
                .into_iter()
                .next()
                .map(|i| open_quick_access(&app, &i.path))
                .ok_or("Nothing to restore".into()),
            "quit" => {
                app.exit(0);
                Ok(())
            }
            other => Err(format!("Unknown action: {other}")),
        };
        if let Err(e) = res {
            report(&app, e);
        }
    });
}

pub fn report(app: &AppHandle, e: String) {
    app.dialog().message(e).kind(MessageDialogKind::Error).title("NeatShotX").show(|_| {});
}

fn pick_image(app: &AppHandle) -> Result<String, String> {
    app.dialog()
        .file()
        .add_filter("Images", &["png", "jpg", "jpeg", "webp", "bmp", "gif"])
        .blocking_pick_file()
        .and_then(|f| f.into_path().ok())
        .map(|p| p.to_string_lossy().into())
        .ok_or("No file selected".into())
}

fn from_clipboard(app: &AppHandle) -> Result<String, String> {
    let img = app.clipboard().read_image().map_err(|_| "No image on the clipboard")?;
    let rgba = image::RgbaImage::from_raw(img.width(), img.height(), img.rgba().to_vec()).ok_or("Bad clipboard image")?;
    let path = capture::new_capture_path(app, "png");
    rgba.save(&path).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into())
}

fn enc(s: &str) -> String {
    s.bytes()
        .map(|b| if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) { (b as char).to_string() } else { format!("%{b:02X}") })
        .collect()
}

fn open_home(app: &AppHandle, tab: &str) -> Result<(), String> {
    let w = windows::normal(app, "main", &format!("/home?tab={tab}"), "NeatShotX", 880.0, 660.0).map_err(|e| e.to_string())?;
    let _ = w.emit("nav", tab);
    Ok(())
}

/// First-run guide (also reachable from About).
fn open_welcome(app: &AppHandle) -> Result<(), String> {
    let w = windows::normal(app, "welcome", "/welcome", "Welcome to NeatShotX", 520.0, 560.0).map_err(|e| e.to_string())?;
    let _ = w.set_resizable(false);
    Ok(())
}

pub fn open_editor_window(app: &AppHandle, path: &str) {
    let label = windows::next_label("editor");
    if let Ok(w) = windows::normal(app, &label, &format!("/editor?p={}", enc(path)), "NeatShotX — Annotate", 1240.0, 800.0) {
        // The CleanShot-style top bar doesn't collapse; keep it from overflowing.
        let _ = w.set_min_size(Some(tauri::LogicalSize::new(1180.0, 560.0)));
    }
}

pub fn open_pin_window(app: &AppHandle, path: &str) {
    let (w, h) = image::image_dimensions(path).unwrap_or((400, 300));
    let scale = app.primary_monitor().ok().flatten().map(|m| m.scale_factor()).unwrap_or(1.0);
    let (lw, lh) = (w as f64 / scale, h as f64 / scale);
    let fit = (900.0 / lw).min(700.0 / lh).min(1.0);
    let _ = windows::overlay(app, &windows::next_label("pin"), &format!("/pin?p={}", enc(path)))
        .transparent(false)
        .shadow(true)
        .resizable(true)
        .inner_size(lw * fit, lh * fit)
        .center()
        .build();
}

pub fn open_quick_access(app: &AppHandle, path: &str) {
    let q = app.state::<QuickAccessQueue>();
    q.0.lock().unwrap().push(path.to_string());
    *q.1.lock().unwrap() = settings::get(app).qa_follow_active_screen.then(|| monitor_at_cursor(app)).flatten();
    if let Some(w) = app.get_webview_window("quick-access") {
        let _ = app.emit_to("quick-access", "qa-pending", ());
        // Re-anchor in case the cursor moved to another screen.
        if let (Ok(sz), Ok(s)) = (w.inner_size(), w.scale_factor()) {
            let _ = qa_resize(app.clone(), sz.height as f64 / s);
        }
        return;
    }
    let _ = windows::overlay(app, "quick-access", "/quick-access").inner_size(QA_W, 200.0).focused(false).build();
    let _ = qa_resize(app.clone(), 200.0);
    watch_qa_pointer(app);
}

/// The monitor containing the mouse cursor.
fn monitor_at_cursor(app: &AppHandle) -> Option<tauri::Monitor> {
    let c = app.cursor_position().ok()?;
    app.available_monitors().ok()?.into_iter().find(|m| {
        let (p, s) = (m.position(), m.size());
        c.x >= p.x as f64 && c.y >= p.y as f64 && c.x < (p.x + s.width as i32) as f64 && c.y < (p.y + s.height as i32) as f64
    })
}

const QA_W: f64 = 232.0;

/// macOS sends no mouse-move events to windows of an inactive app, so CSS :hover never fires on
/// the overlay. Poll the global cursor and forward it (window-local, logical px); None = outside.
fn watch_qa_pointer(app: &AppHandle) {
    let app = app.clone();
    std::thread::spawn(move || {
        let mut last: Option<(i32, i32)> = None;
        // ponytail: 25 Hz poll while the overlay lives; an NSTrackingArea would be event-driven.
        while let Some(w) = app.get_webview_window("quick-access") {
            let (Ok(c), Ok(p), Ok(sz), Ok(s)) = (app.cursor_position(), w.outer_position(), w.outer_size(), w.scale_factor()) else { break };
            let (x, y) = (c.x - p.x as f64, c.y - p.y as f64);
            let inside = x >= 0.0 && y >= 0.0 && x < sz.width as f64 && y < sz.height as f64;
            let now = inside.then(|| ((x / s) as i32, (y / s) as i32));
            if now != last {
                let _ = app.emit_to("quick-access", "qa-pointer", now);
                last = now;
            }
            std::thread::sleep(std::time::Duration::from_millis(40));
        }
    });
}

#[tauri::command]
fn take_pending(app: AppHandle) -> Vec<String> {
    std::mem::take(&mut *app.state::<QuickAccessQueue>().0.lock().unwrap())
}

/// Keeps the Quick Access Overlay anchored to the bottom corner of the active (or primary) screen's work area.
#[tauri::command]
fn qa_resize(app: AppHandle, height: f64) -> Result<(), String> {
    let w = app.get_webview_window("quick-access").ok_or("no overlay")?;
    let anchored = app.state::<QuickAccessQueue>().1.lock().unwrap().clone();
    let m = match anchored {
        Some(m) => m,
        None => app.primary_monitor().map_err(|e| e.to_string())?.ok_or("no monitor")?,
    };
    // Physical math on the target monitor's scale: LogicalSize would use the window's current screen.
    let s = m.scale_factor();
    let area = m.work_area(); // excludes Dock / taskbar
    let h = (height * s).min(area.size.height as f64 - 32.0 * s);
    let margin = (16.0 * s) as i32;
    let size = PhysicalSize::new((QA_W * s) as u32, h as u32);
    let x = if settings::get(&app).qa_position == "right" { area.position.x + area.size.width as i32 - size.width as i32 - margin } else { area.position.x + margin };
    let pos = PhysicalPosition::new(x, area.position.y + area.size.height as i32 - size.height as i32 - margin);
    // Move first so the size is interpreted on the target screen, then settle the origin.
    w.set_position(pos).map_err(|e| e.to_string())?;
    w.set_size(size).map_err(|e| e.to_string())?;
    w.set_position(pos).map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_editor(app: AppHandle, path: String) {
    open_editor_window(&app, &path);
}

#[tauri::command]
async fn open_pin(app: AppHandle, path: String) {
    open_pin_window(&app, &path);
}

#[tauri::command]
fn action(app: AppHandle, name: String) {
    run_action(&app, &name);
}

#[tauri::command]
fn platform() -> &'static str {
    std::env::consts::OS
}

fn handle_args(app: &AppHandle, args: &[String]) {
    for a in args.iter().skip(1) {
        link::handle(app, a);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _| {
            // Re-launching with no arguments opens Preferences (the way back in when the menu bar icon is hidden).
            if args.len() <= 1 {
                run_action(app, "open-settings");
            } else {
                handle_args(app, &args);
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .manage(capture::CaptureState::default())
        .manage(scroll::ScrollState::default())
        .manage(QuickAccessQueue::default())
        .register_uri_scheme_protocol("frozen", |ctx, req| capture::serve_frozen(ctx.app_handle(), req.uri().path()))
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let handle = app.handle().clone();
            app.manage(settings::SettingsState(Mutex::new(settings::load(&handle))));
            tray::build(&handle)?;
            shortcuts::register(&handle);
            capture::prune_history(&handle);

            #[cfg(any(windows, target_os = "linux"))]
            let _ = app.deep_link().register_all();
            let h = handle.clone();
            app.deep_link().on_open_url(move |e| {
                for u in e.urls() {
                    link::handle(&h, u.as_str());
                }
            });
            handle_args(&handle, &std::env::args().collect::<Vec<_>>());
            if !settings::get(&handle).onboarded {
                let _ = open_welcome(&handle);
                settings::mark_onboarded(&handle); // shown once even if closed with the window button
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings::get_settings,
            settings::set_settings,
            capture::list_windows,
            capture::cancel_selection,
            capture::finish_selection,
            capture::copy_image,
            capture::write_png,
            capture::list_history,
            capture::delete_capture,
            capture::copy_file,
            capture::read_file,
            capture::copy_png,
            capture::read_text_file,
            capture::write_text_file,
            capture::clear_history,
            capture::last_region,
            scroll::finish_scroll,
            take_pending,
            qa_resize,
            open_editor,
            open_pin,
            action,
            platform,
        ])
        .build(tauri::generate_context!())
        .expect("error while building NeatShotX")
        .run(|app, e| match e {
            // Menu-bar app: keep running when the last window closes.
            RunEvent::ExitRequested { api, code: None, .. } => api.prevent_exit(),
            // Launching the app again from Finder/Spotlight while it runs hidden.
            #[cfg(target_os = "macos")]
            RunEvent::Reopen { has_visible_windows: false, .. } => run_action(app, "open-settings"),
            _ => {
                let _ = app;
            }
        });
}
