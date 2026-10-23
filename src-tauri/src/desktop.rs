//! Hide/show desktop icons (CleanShot's "Hide desktop icons").
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};

static HIDDEN: AtomicBool = AtomicBool::new(false);

pub fn icons_hidden() -> bool {
    HIDDEN.load(Ordering::SeqCst)
}

#[cfg(target_os = "macos")]
fn apply(visible: bool) -> Result<(), String> {
    let v = if visible { "true" } else { "false" };
    Command::new("defaults").args(["write", "com.apple.finder", "CreateDesktop", "-bool", v]).status().map_err(|e| e.to_string())?;
    Command::new("killall").arg("Finder").status().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn apply(visible: bool) -> Result<(), String> {
    // Toggle the desktop ListView, which lives under Progman or a WorkerW.
    let script = format!(
        r#"Add-Type @'
using System; using System.Runtime.InteropServices;
public class D {{
  [DllImport("user32.dll")] public static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string t);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}}
'@
$v = [IntPtr]::Zero
$p = [D]::FindWindowEx([IntPtr]::Zero, [IntPtr]::Zero, "Progman", $null)
$d = [D]::FindWindowEx($p, [IntPtr]::Zero, "SHELLDLL_DefView", $null)
while ($d -eq [IntPtr]::Zero) {{
  $v = [D]::FindWindowEx([IntPtr]::Zero, $v, "WorkerW", $null)
  if ($v -eq [IntPtr]::Zero) {{ break }}
  $d = [D]::FindWindowEx($v, [IntPtr]::Zero, "SHELLDLL_DefView", $null)
}}
$l = [D]::FindWindowEx($d, [IntPtr]::Zero, "SysListView32", $null)
[D]::ShowWindow($l, {}) | Out-Null"#,
        if visible { 5 } else { 0 }
    );
    Command::new("powershell").args(["-NoProfile", "-Command", &script]).status().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(target_os = "linux")]
fn apply(visible: bool) -> Result<(), String> {
    // GNOME "Desktop Icons NG"; other desktops have no common switch.
    let ok = Command::new("gsettings")
        .args(["set", "org.gnome.shell.extensions.ding", "show-home", if visible { "true" } else { "false" }])
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    ok.then_some(()).ok_or("Hiding desktop icons is only supported on GNOME (DING)".into())
}

pub fn set_icons_visible(visible: bool) -> Result<(), String> {
    apply(visible)?;
    HIDDEN.store(!visible, Ordering::SeqCst);
    Ok(())
}
