# NeatShotX — System Design

## 1. Requirements

**Functional:** capture area/window/fullscreen/previous/self-timer/scrolling (automatic or manual), Quick Access Overlay, annotate, pin, history, hide desktop icons, global shortcuts,
URL scheme, launch at login. Full list in [PRD.md](PRD.md).

**Non-functional**
- Cross-platform: macOS 11+, Windows 10+, Linux (X11; Wayland partial).
- Latency: overlay visible < 250 ms after the shortcut; clipboard < 300 ms after mouse-up.
- Footprint: native webview (no Chromium bundle); idle RAM < 60 MB with no windows open.
- Privacy: everything local. No network access.
- Cost: free, no backend.

## 2. High-level design

```
 ┌───────────── Rust core (src-tauri) ─────────────┐        ┌────────── WebViews (React) ──────────┐
 │ Tray menu ─┐                                     │        │ #/selector    frozen screen + loupe  │
 │ Shortcuts ─┼─► run_action(name) ──► capture.rs ──┼─emit──►│ #/quick-access overlay stack         │
 │ Deep link ─┤          │             scroll.rs    │◄invoke─│ #/editor      Konva annotate         │
 │ CLI args  ─┘          │             desktop.rs   │        │ #/pin #/countdown                    │
 │                       ▼             tray.rs      │        │ #/scroll-bar                         │
 │                 windows.rs (builders) tray.rs    │        │ #/input-overlay  #/home (history/    │
 │ settings.rs (JSON in app config dir)             │        │                         settings)    │
 └──────────┬──────────────┬──────────────┬─────────┘        └──────────────────────────────────────┘
            │ xcap                        │ enigo (scroll wheel)
     OS screen capture   avfoundation /   global mouse/keys
     (CG/SCK, DXGI/GDI,  gdigrab / x11grab
      X11/PipeWire)
```

## 3. Low-level design

### Capture flow (area / window / scroll / timer)
1. `run_action` → thread → `capture::start_selection(mode)`.
2. Optionally hide desktop icons; hide the Quick Access window; `xcap::Monitor::all()` → `capture_image()` per monitor →
   `CaptureState.frozen`.
3. Per monitor, a borderless window covers it (size, then position — macOS keeps the bottom-left origin on resize), raised to
   `NSScreenSaverWindowLevel` on macOS. Page loads `frozen://<i>` (BMP from memory) and shows itself on `onload`.
4. The selector converts CSS px → image px (`naturalWidth / innerWidth`) and calls `finish_selection(Region, windowId?)`.
5. Dispatch by mode:
   - `area`/`window` → crop frozen image (or `Window::capture_image` for true window pixels) → `handle_capture`.
   - `timer` → countdown window → live recapture of the region.
   - `scroll` → `scroll::start` (automatic scrolling via enigo, or manual).
6. `handle_capture`: write to `appData/history`, optionally copy to the save dir and the clipboard, emit `capture-added`,
   queue the path for Quick Access (`take_pending` pull avoids a create/emit race).

### Scrolling capture (`scroll.rs`)
Automatic mode moves the cursor to the region centre and sends wheel events (enigo), adapting the step so frames overlap ~2/3; it stops after 3 frames without new rows (bottom) or 40 000 px, then restores the cursor. If nothing moves at all (macOS Accessibility not granted / not scrollable) it falls back to manual scrolling.

Poll the region every 120 ms. For frames *prev*, *cur*: take a 32-row band of *cur* starting at h/4 (skips sticky headers), slide
it over *prev* rows [h/4, h−32], and score with sampled luma SAD (early exit). Best position p ⇒ dy = p − h/4. Accept when
dy > 0 and the mean diff is < 6, then append the bottom dy rows of *cur*. Cost ≈ h·16·w/4 per frame. Covered by a unit test.

### Editor (`src/views/Editor.tsx`, `src/components/editor/*`)
- State: `Doc { base: blobURL, shapes: Shape[] }` with past/future stacks (50 deep). Crop is destructive: it flattens the stage
  region into a new base, so undo restores the previous base.
- Shapes live in base-image pixels inside a `Group` offset by the background padding; the stage is scaled to fit.
- Pixelate/blur = cropped `Konva.Image` of the base with filters (cached). Spotlight = one even-odd path with holes.
- Export = `stage.toDataURL({ pixelRatio: 1/scale })`, giving full native resolution, sent as base64 to `write_png` / `copy_png`.

### Commands (IPC surface, in place of REST)
| Command | Purpose |
|---|---|
| `list_windows(monitor)` | Window rects in frozen-image px, front-to-back |
| `finish_selection(region, windowId?)` / `cancel_selection` | Selector result |
| `copy_image(path)`, `copy_png(dataB64)`, `write_png(dataB64, path?, copy)` | Clipboard / save |
| `read_file(path)` | Raw bytes (binary IPC) for same-origin Blob URLs |
| `list_history`, `delete_capture(path)`, `copy_file(src,dest)` | History |
| `finish_scroll(keep)` | Scrolling capture |
| `take_pending`, `qa_resize(height)` | Quick Access queue / layout |
| `open_editor`, `open_pin`, `action(name)` | Window/action triggers |
| `get_settings`, `set_settings` | Persisted JSON, re-registers shortcuts |

Events: `capture-added`, `capture-updated`, `qa-pending`, `scroll-progress`, `scroll-mode`, `qa-pointer`, `nav`.

### Storage ("DB schema")
No database. Everything is on the filesystem:
- `appConfig/settings.json`: the `Settings` struct (`src-tauri/src/settings.rs`).
- `appData/history/NeatShotX YYYY-MM-DD at HH.MM.SS.mmm.{png,jpg}`: newest-first by mtime.

### Dependencies
Rust: `tauri 2` (tray, asset protocol, macOS private API), `xcap` (capture), `image`, `device_query` (input overlay),
`chrono`, `base64`, `objc2` (macOS window level), plus the `global-shortcut`, `clipboard-manager`,
`dialog`, `opener`, `autostart`, `deep-link`, `single-instance` and `drag` plugins.
JS: React 19, Vite, Tailwind v4, `konva`/`react-konva`, `motion`, `lucide-react`, `@crabnebula/tauri-plugin-drag`.

## 4. Known limits and upgrade paths
- The input overlay polls at 60 Hz and can miss sub-16 ms taps. OS hooks would fix that.
- Wayland: xcap has partial support; enigo scrolling needs X11 (or its libei feature).
- Shapes can be moved but not resized (the Transformer has resize disabled). Enabling it needs per-kind w/h sync.
