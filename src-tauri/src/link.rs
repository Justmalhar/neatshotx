//! `neatshotx://<action>?query` URLs and CLI args (CleanShot-style API). Plain action names work too.
use std::collections::HashMap;
use tauri::{AppHandle, Url};

use crate::{capture, run_action, tray};

/// An absolute path to an existing file, or None.
fn file_param(q: &HashMap<String, String>) -> Option<String> {
    let p = q.get("filepath")?;
    (std::path::Path::new(p).is_absolute() && std::path::Path::new(p).is_file()).then(|| p.clone())
}

/// Parsed form of a link: action name + query params.
pub fn parse(raw: &str) -> (String, HashMap<String, String>) {
    match Url::parse(raw) {
        Ok(u) if u.scheme() == "neatshotx" => (
            u.host_str().unwrap_or_default().trim_end_matches('/').to_string(),
            u.query_pairs().map(|(k, v)| (k.into_owned(), v.into_owned())).collect(),
        ),
        _ => (raw.trim_end_matches('/').to_string(), HashMap::new()),
    }
}

pub fn handle(app: &AppHandle, raw: &str) {
    let (name, q) = parse(raw);
    let num = |k: &str| q.get(k).and_then(|v| v.parse::<f64>().ok());
    let display = q.get("display").and_then(|v| v.parse::<usize>().ok());
    match name.as_str() {
        "capture-area" if num("width").is_some() && num("height").is_some() => {
            let rect = (num("x").unwrap_or(0.0), num("y").unwrap_or(0.0), num("width").unwrap(), num("height").unwrap());
            let (app, display) = (app.clone(), display.unwrap_or(0));
            std::thread::spawn(move || {
                if let Err(e) = capture::capture_rect(&app, display, rect) {
                    crate::report(&app, e);
                }
            });
        }
        "capture-fullscreen" if display.is_some() => {
            let app = app.clone();
            std::thread::spawn(move || {
                if let Err(e) = capture::capture_fullscreen(&app, display) {
                    crate::report(&app, e);
                }
            });
        }
        "open-annotate" | "annotate" | "open" if file_param(&q).is_some() => crate::open_editor_window(app, &file_param(&q).unwrap()),
        "pin" | "pin-image" if file_param(&q).is_some() => crate::open_pin_window(app, &file_param(&q).unwrap()),
        n if tray::is_action(n) || n.starts_with("capture") => run_action(app, n),
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_query_and_bare_names() {
        let (n, q) = parse("neatshotx://capture-area?x=100&y=200&width=800&height=600&display=1");
        assert_eq!(n, "capture-area");
        assert_eq!(q["width"], "800");
        assert_eq!(q["display"], "1");
        let (n, q) = parse("neatshotx://open-annotate?filepath=/tmp/a%20b.png");
        assert_eq!((n.as_str(), q["filepath"].as_str()), ("open-annotate", "/tmp/a b.png"));
        assert_eq!(parse("capture-area").0, "capture-area");
        assert_eq!(parse("neatshotx://history/").0, "history");
    }
}
