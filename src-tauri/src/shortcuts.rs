use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

/// (Re)registers global shortcuts from settings.
pub fn register(app: &AppHandle) {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    for (action, accel) in crate::settings::get(app).shortcuts {
        if accel.trim().is_empty() {
            continue;
        }
        let res = gs.on_shortcut(accel.as_str(), move |app, _, e| {
            if e.state == ShortcutState::Pressed {
                crate::run_action(app, &action);
            }
        });
        if let Err(e) = res {
            eprintln!("shortcut {accel}: {e}");
        }
    }
}
