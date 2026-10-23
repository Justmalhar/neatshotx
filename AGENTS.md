# AGENTS.md — notes for AI agents

- Stack: Tauri 2 + React 19 + Vite + Tailwind v4. Package manager **bun**. Rust crate in `src-tauri/`.
- One HTML entry; every window is a hash route (`index.html#/editor?p=...`), mapped in `src/main.tsx`.
  New window = new `src/views/<Name>.tsx` + entry in `routes` + a builder call in Rust.
- **All actions** (tray, global shortcut, deep link, CLI arg) funnel through `run_action` in `src-tauri/src/lib.rs`.
  Add a feature there once; it becomes available everywhere. Keep names in sync with `MENU`.
- Window creation must not happen inside a *sync* Tauri command (deadlocks on Windows). Commands that open windows are `async`;
  `run_action` spawns a thread.
- Coordinates: the selector works in **frozen-image pixels** (`Region`). xcap monitor/window rects are points on macOS and
  pixels elsewhere; `match_monitor` reconciles them with Tauri's physical positions. ffmpeg offsets use `Frozen.phys_origin`.
- Frozen screenshots are served from memory through the custom `frozen://` protocol as BMP (no PNG encode latency).
- Canvas export needs same-origin images: load files with `api.blobUrl()` (binary IPC), not `convertFileSrc`, wherever
  pixels are read (editor, OCR). `convertFileSrc` is fine for display-only `<img>`/`<video>`.
- `xcap` 0.9 getters return `Result` — always `unwrap_or` them.
- Disk on the dev machine can be tight: dev profile has `debug = 0`. Don't re-enable without checking free space.
- Tests: `cd src-tauri && cargo test --lib` (scroll stitcher, ffmpeg args). Frontend: `bunx tsc --noEmit`.
- Recording depends on a system ffmpeg (`record::ffmpeg()` searches Homebrew paths then PATH). Bundling as a sidecar is a TODO.
