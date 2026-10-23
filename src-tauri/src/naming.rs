//! Capture file names from the `file_name_template` setting.
use std::{fs, path::{Path, PathBuf}};
use tauri::AppHandle;

/// Expands {date} (YYYY-MM-DD), {time} (HH.MM.SS), {counter}; swaps characters illegal in file names.
pub fn render(template: &str, now: chrono::DateTime<chrono::Local>, counter: u64) -> String {
    let name = template
        .replace("{date}", &now.format("%Y-%m-%d").to_string())
        .replace("{time}", &now.format("%H.%M.%S").to_string())
        .replace("{counter}", &counter.to_string());
    let name: String = name.chars().map(|c| if c.is_control() || "/\\:*?\"<>|".contains(c) { '-' } else { c }).collect();
    let name = name.trim().trim_matches('.').to_string();
    if name.is_empty() { "NeatShotX".into() } else { name }
}

/// Reads and increments the persisted counter (1-based).
fn next_counter(app: &AppHandle) -> u64 {
    let p = crate::settings::counter_path(app);
    let n = fs::read_to_string(&p).ok().and_then(|s| s.trim().parse::<u64>().ok()).unwrap_or(0) + 1;
    let _ = fs::create_dir_all(p.parent().unwrap());
    let _ = fs::write(&p, n.to_string());
    n
}

/// `dir/<name>.<ext>`, with " 2", " 3"... appended while the file exists.
pub fn unique(dir: &Path, stem: &str, ext: &str) -> PathBuf {
    let mut p = dir.join(format!("{stem}.{ext}"));
    let mut i = 2;
    while p.exists() {
        p = dir.join(format!("{stem} {i}.{ext}"));
        i += 1;
    }
    p
}

pub fn capture_path(app: &AppHandle, dir: &Path, template: &str, ext: &str) -> PathBuf {
    let counter = if template.contains("{counter}") { next_counter(app) } else { 0 };
    unique(dir, &render(template, chrono::Local::now(), counter), ext)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn renders_tokens_and_sanitizes() {
        let t = chrono::Local.with_ymd_and_hms(2026, 3, 4, 5, 6, 7).unwrap();
        assert_eq!(render("Shot {date} at {time} #{counter}", t, 9), "Shot 2026-03-04 at 05.06.07 #9");
        assert_eq!(render("a/b:c*?", t, 1), "a-b-c--");
        assert_eq!(render("  ", t, 1), "NeatShotX");
    }
}
