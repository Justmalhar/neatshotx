mod capture;
mod desktop;
mod record;
mod scroll;
mod settings;
mod shortcuts;
mod tray;
mod upload;
mod windows;

use std::sync::Mutex;
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, RunEvent,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

/// Paths waiting to be shown in the Quick Access Overlay.
#[derive(Default)]
struct QuickAccessQueue(Mutex<Vec<String>>);

/// Single dispatch point for tray, shortcuts, deep links (neatshotx://<action>) and CLI args.
pub fn run_action(app: &AppHandle, action: &str) {
    let (app, action) = (app.clone(), action.to_string());
    std::thread::spawn(move || {
        let res: Result<(), String> = match action.as_str() {
            "capture-area" => capture::start_selection(&app, "area"),
            "capture-window" => capture::start_selection(&app, "window"),
            "record-screen" | "record" => capture::start_selection(&app, "record"),
            "scrolling-capture" => capture::start_selection(&app, "scroll"),
            "capture-text" => capture::start_selection(&app, "ocr"),
            "self-timer" => capture::start_selection(&app, "timer"),
            "capture-fullscreen" => capture::capture_fullscreen(&app),
            "capture-previous-area" => capture::capture_previous_area(&app),
            "toggle-desktop-icons" => desktop::set_icons_visible(desktop::icons_hidden()).map(|_| tray::refresh(&app)),
            "hide-desktop-icons" => desktop::set_icons_visible(false).map(|_| tray::refresh(&app)),
            "show-desktop-icons" => desktop::set_icons_visible(true).map(|_| tray::refresh(&app)),
            "open-history" | "history" => open_home(&app, "history"),
            "open-settings" | "settings" => open_home(&app, "settings"),
            "annotate" | "open" => pick_image(&app).map(|p| open_editor_window(&app, &p)),
            "pin-image" => pick_image(&app).map(|p| open_pin_window(&app, &p)),
            "open-from-clipboard" => from_clipboard(&app).map(|p| open_editor_window(&app, &p)),
            "restore-recently-closed" => tauri::async_runtime::block_on(capture::list_history(app.clone()))
                .into_iter()
                .next()
                .map(|p| open_quick_access(&app, &p))
                .ok_or("Nothing to restore".into()),
            "quit" => {
                app.exit(0);
                Ok(())
            }
            other => Err(format!("Unknown action: {other}")),
        };
        if let Err(e) = res {
            app.dialog().message(e).kind(MessageDialogKind::Error).title("NeatShotX").show(|_| {});
        }
    });
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
    let w = windows::normal(app, "main", &format!("/home?tab={tab}"), "NeatShotX", 760.0, 640.0).map_err(|e| e.to_string())?;
    let _ = w.emit("nav", tab);
    Ok(())
}

pub fn open_editor_window(app: &AppHandle, path: &str) {
    let label = windows::next_label("editor");
    let _ = windows::normal(app, &label, &format!("/editor?p={}", enc(path)), "NeatShotX — Annotate", 1200.0, 800.0);
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

pub fn open_ocr(app: &AppHandle, path: &std::path::Path) {
    let _ = windows::overlay(app, &windows::next_label("ocr"), &format!("/ocr?p={}", enc(&path.to_string_lossy())))
        .inner_size(380.0, 220.0)
        .center()
        .build();
}

pub fn open_quick_access(app: &AppHandle, path: &str) {
    app.state::<QuickAccessQueue>().0.lock().unwrap().push(path.to_string());
    if app.get_webview_window("quick-access").is_some() {
        let _ = app.emit_to("quick-access", "qa-pending", ());
        return;
    }
    let _ = windows::overlay(app, "quick-access", "/quick-access").inner_size(280.0, 200.0).focused(false).build();
    let _ = qa_resize(app.clone(), 200.0);
}

#[tauri::command]
fn take_pending(app: AppHandle) -> Vec<String> {
    std::mem::take(&mut *app.state::<QuickAccessQueue>().0.lock().unwrap())
}

/// Keeps the Quick Access Overlay anchored to the bottom-left of the primary screen.
#[tauri::command]
fn qa_resize(app: AppHandle, height: f64) -> Result<(), String> {
    let w = app.get_webview_window("quick-access").ok_or("no overlay")?;
    let m = app.primary_monitor().map_err(|e| e.to_string())?.ok_or("no monitor")?;
    let s = m.scale_factor();
    let area = m.work_area(); // excludes Dock / taskbar
    let (ax, ay, ah) = (area.position.x as f64 / s, area.position.y as f64 / s, area.size.height as f64 / s);
    let h = height.min(ah - 32.0);
    w.set_size(LogicalSize::new(280.0, h)).map_err(|e| e.to_string())?;
    let x = if settings::get(&app).qa_position == "right" { ax + area.size.width as f64 / s - 280.0 - 16.0 } else { ax + 16.0 };
    w.set_position(LogicalPosition::new(x, ay + ah - h - 16.0))
        .map_err(|e| e.to_string())
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
        let name = a.strip_prefix("neatshotx://").unwrap_or(a).trim_end_matches('/');
        if tray::is_action(name) || name.starts_with("capture") || name.starts_with("record") {
            run_action(app, name);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _| handle_args(app, &args)))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .manage(capture::CaptureState::default())
        .manage(record::RecState::default())
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
                    if let Some(host) = u.host_str() {
                        run_action(&h, host);
                    }
                }
            });
            handle_args(&handle, &std::env::args().collect::<Vec<_>>());
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
            capture::clear_history,
            capture::last_region,
            record::stop_recording,
            record::cancel_recording,
            record::convert_to_gif,
            scroll::finish_scroll,
            upload::upload,
            take_pending,
            qa_resize,
            open_editor,
            open_pin,
            action,
            platform,
        ])
        .build(tauri::generate_context!())
        .expect("error while building NeatShotX")
        .run(|_, e| {
            // Menu-bar app: keep running when the last window closes.
            if let RunEvent::ExitRequested { api, code: None, .. } = e {
                api.prevent_exit();
            }
        });
}
