import { getCurrentWindow } from "@tauri-apps/api/window";

const os = /Mac/.test(navigator.userAgent) ? "mac" : /Windows/.test(navigator.userAgent) ? "windows" : "linux";

/** Desktop-app behavior for every window (see DESIGN-SYSTEM.md §4). */
export function installDesktopBehavior(route: string, { vibrancy, closable }: { vibrancy: boolean; closable: boolean }) {
  const html = document.documentElement;
  html.dataset.os = os;
  // Native window material is applied in Rust for these routes (not on Linux).
  if (vibrancy && os !== "linux") html.dataset.vibrancy = "";
  html.dataset.route = route;

  // No webview context menu (Reload/Inspect) outside editable fields.
  addEventListener("contextmenu", (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest("input, textarea, [contenteditable='true']")) e.preventDefault();
  });

  // ⌘W / Ctrl+W closes the window, like every desktop app.
  addEventListener("keydown", (e) => {
    if (closable && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
      e.preventDefault();
      getCurrentWindow().close();
    }
  });
}
