//! Menu-bar / system-tray menu, laid out like CleanShot X's.
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    image::Image,
    menu::{AboutMetadata, IconMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle,
};

use crate::{desktop, settings};

pub enum Entry {
    Item { id: &'static str, label: &'static str, icon: &'static str },
    Sep,
}
use Entry::*;

pub const MENU: &[Entry] = &[
    Item { id: "capture-area", label: "Capture Area", icon: "scan" },
    Item { id: "capture-fullscreen", label: "Capture Fullscreen", icon: "monitor" },
    Item { id: "capture-window", label: "Capture Window", icon: "app-window" },
    Item { id: "capture-previous-area", label: "Capture Previous Area", icon: "rotate-ccw-square" },
    Item { id: "scrolling-capture", label: "Scrolling Capture", icon: "arrow-down-to-line" },
    Item { id: "self-timer", label: "Self-Timer", icon: "timer" },
    Sep,
    Item { id: "toggle-desktop-icons", label: "", icon: "" }, // label/icon depend on state
    Sep,
    Item { id: "annotate", label: "Open…", icon: "pencil" },
    Item { id: "open-from-clipboard", label: "Open from Clipboard", icon: "clipboard" },
    Item { id: "pin-image", label: "Pin to the Screen…", icon: "pin" },
    Item { id: "restore-recently-closed", label: "Restore Recently Closed", icon: "undo-2" },
    Sep,
    Item { id: "open-history", label: "Capture History…", icon: "history" },
];

pub fn is_action(name: &str) -> bool {
    ["open-settings", "hide-desktop-icons", "show-desktop-icons"].contains(&name)
        || MENU.iter().any(|e| matches!(e, Item { id, .. } if *id == name))
}

macro_rules! icons {
    ($($name:literal),* $(,)?) => {
        fn icon_png(name: &str, light: bool) -> Option<&'static [u8]> {
            match (name, light) {
                $(
                    ($name, false) => Some(include_bytes!(concat!("../icons/menu/", $name, "-dark.png"))),
                    ($name, true) => Some(include_bytes!(concat!("../icons/menu/", $name, "-light.png"))),
                )*
                _ => None,
            }
        }
    };
}
icons!(
    "scan", "monitor", "app-window", "rotate-ccw-square", "arrow-down-to-line", "timer",
    "eye-off", "eye", "pencil", "clipboard", "pin", "undo-2", "history",
);

/// True when menus render dark, so icons must be light. Win32/GTK tray menus default to light.
fn dark_menus() -> bool {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("defaults")
            .args(["read", "-g", "AppleInterfaceStyle"])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "Dark")
            .unwrap_or(false)
    }
    #[cfg(not(target_os = "macos"))]
    false
}

static BUILT_DARK: AtomicBool = AtomicBool::new(false);

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let dark = dark_menus();
    BUILT_DARK.store(dark, Ordering::Relaxed);
    let shortcuts = settings::get(app).shortcuts;
    let menu = Menu::new(app)?;
    for e in MENU {
        let Item { id, label, icon } = e else {
            menu.append(&PredefinedMenuItem::separator(app)?)?;
            continue;
        };
        let (label, icon) = match *id {
            "toggle-desktop-icons" if desktop::icons_hidden() => ("Show Desktop Icons", "eye"),
            "toggle-desktop-icons" => ("Hide Desktop Icons", "eye-off"),
            _ => (*label, *icon),
        };
        let image = icon_png(icon, dark).and_then(|b| Image::from_bytes(b).ok());
        let accel = shortcuts.get(*id).filter(|a| !a.is_empty()).map(String::as_str);
        let item = IconMenuItem::with_id(app, *id, label, true, image.clone(), accel)
            // An accelerator muda can't parse shouldn't drop the item.
            .or_else(|_| IconMenuItem::with_id(app, *id, label, true, image, None::<&str>))?;
        menu.append(&item)?;
    }
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    let about = AboutMetadata {
        name: Some("NeatShotX".into()),
        version: Some(app.package_info().version.to_string()),
        comments: Some("Cross-platform screenshots".into()),
        ..Default::default()
    };
    menu.append(&PredefinedMenuItem::about(app, Some("About NeatShotX…"), Some(about))?)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&MenuItem::with_id(app, "open-settings", "Settings…", true, Some("CmdOrCtrl+,"))?)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&MenuItem::with_id(app, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?)?;
    Ok(menu)
}

/// Rebuild after settings, desktop-icon state, or appearance changes.
pub fn refresh(app: &AppHandle) {
    if let (Some(tray), Ok(menu)) = (app.tray_by_id("main"), build_menu(app)) {
        let _ = tray.set_menu(Some(menu));
    }
}

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    TrayIconBuilder::with_id("main")
        .icon(Image::from_bytes(include_bytes!("../icons/tray.png"))?)
        .icon_as_template(true)
        .tooltip("NeatShotX")
        .menu(&build_menu(app)?)
        .on_menu_event(|app, e| crate::run_action(app, e.id().as_ref()))
        .on_tray_icon_event(|tray, e| {
            // Cheap appearance check on hover so icons match light/dark before the menu opens.
            if matches!(e, TrayIconEvent::Enter { .. }) && dark_menus() != BUILT_DARK.load(Ordering::Relaxed) {
                refresh(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}
