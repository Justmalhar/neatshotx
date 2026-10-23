//! Upload to a user-configured HTTP endpoint (self-hosted alternative to CleanShot Cloud).
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::settings;

/// Picks the share link out of common response shapes: {"url"}, {"link"}, {"data":{"link"}}, or plain text.
fn extract_url(body: &str) -> Option<String> {
    fn walk(v: &serde_json::Value) -> Option<String> {
        match v {
            serde_json::Value::String(s) if s.starts_with("http") => Some(s.clone()),
            serde_json::Value::Object(m) => ["url", "link", "data"].iter().filter_map(|k| m.get(*k)).find_map(walk).or_else(|| m.values().find_map(walk)),
            serde_json::Value::Array(a) => a.iter().find_map(walk),
            _ => None,
        }
    }
    match serde_json::from_str::<serde_json::Value>(body) {
        Ok(v) => walk(&v),
        Err(_) => body.trim().starts_with("http").then(|| body.trim().to_string()),
    }
}

#[tauri::command]
pub async fn upload(app: AppHandle, path: String) -> Result<String, String> {
    upload_file(&app, path).await
}

/// Uploads and copies the share link. Shared by the command and after-capture automation.
pub async fn upload_file(app: &AppHandle, path: String) -> Result<String, String> {
    let s = settings::get(app);
    if s.upload_url.is_empty() {
        return Err("Set an upload endpoint in Settings → Cloud".into());
    }
    let url = tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let form = reqwest::blocking::multipart::Form::new().file(s.upload_field.clone(), &path).map_err(|e| e.to_string())?;
        let mut req = reqwest::blocking::Client::new().post(&s.upload_url).multipart(form);
        for (k, v) in &s.upload_headers {
            req = req.header(k, v);
        }
        let res = req.send().map_err(|e| e.to_string())?;
        let status = res.status();
        let body = res.text().map_err(|e| e.to_string())?;
        if !status.is_success() {
            return Err(format!("Upload failed: {status}"));
        }
        extract_url(&body).ok_or_else(|| "Upload succeeded but no URL in response".into())
    })
    .await
    .map_err(|e| e.to_string())??;
    let _ = app.clipboard().write_text(url.clone());
    Ok(url)
}

#[cfg(test)]
mod tests {
    #[test]
    fn extracts_urls() {
        assert_eq!(super::extract_url(r#"{"data":{"link":"https://x/1"}}"#).unwrap(), "https://x/1");
        assert_eq!(super::extract_url("https://x/2\n").unwrap(), "https://x/2");
        assert!(super::extract_url(r#"{"ok":true}"#).is_none());
    }
}
