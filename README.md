# NeatShotX

Cross-platform (macOS · Windows · Linux) screenshot & screen-recording tool modelled on CleanShot X.
Built with **Tauri 2 (Rust)** + **React/TypeScript**. Lives in the menu bar / system tray.

## Features

| Area | What you get |
|---|---|
| Capture | Area (frozen screen, crosshair + magnifier), Window (hover detect), Fullscreen (all monitors), Previous Area, Self-Timer, Scrolling Capture |
| Record | MP4 or GIF of any area, microphone, webcam bubble, click highlights, keystroke HUD |
| After capture | Quick Access Overlay (copy, save/delete, drag-out, annotate, pin, convert to GIF), auto copy/save |
| Annotate | Arrow, rectangle, filled rectangle, ellipse, line, pen, highlighter, text, counter, pixelate, blur, spotlight, emoji, crop, background (gradient/padding/radius/shadow), undo/redo |
| Pin | Floating always-on-top screenshots (wheel = opacity, double-click = close) |
| Other | History, Hide desktop icons, rebindable global shortcuts, launch at login, `neatshotx://` URL scheme |

## Requirements

- Rust (stable), [Bun](https://bun.sh)
- **ffmpeg** on PATH for recording/GIF (`brew install ffmpeg`, `winget install ffmpeg`, `apt install ffmpeg`)
- Linux: `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev libxdo-dev libpipewire-0.3-dev` (Tauri + xcap prerequisites); X11 session for recording
- macOS: grant **Screen Recording** (and **Accessibility** for keystroke/click overlay) in System Settings → Privacy & Security

## Run

```bash
bun install
bun tauri dev        # development
bun tauri build      # installers: .dmg/.app, .msi/.exe, .deb/.AppImage/.rpm
cd src-tauri && cargo test   # Rust unit tests
```

## Default shortcuts

| Action | Shortcut |
|---|---|
| Capture Fullscreen | ⌥⇧1 / Alt+Shift+1 |
| Capture Area | ⌥⇧2 |
| Capture Window | ⌥⇧3 |
| Capture Previous Area | ⌥⇧4 |
| Record Screen | ⌥⇧5 |
| Scrolling Capture | ⌥⇧6 |
| Self-Timer | ⌥⇧8 |

In the selector: drag = area, **Space** = toggle window mode, **Esc**/right-click = cancel.
Editor: V A R F E L P H T N X B S J C select tools, ⌘Z / ⇧⌘Z, ⌘C copy, ⌘S save, Enter applies crop.

## URL scheme / CLI

`neatshotx://capture-area`, `capture-fullscreen`, `capture-window`, `capture-previous-area`, `record-screen`,
`scrolling-capture`, `self-timer`, `annotate`, `open-from-clipboard`, `pin-image`,
`restore-recently-closed`, `toggle-desktop-icons`, `hide-desktop-icons`, `show-desktop-icons`, `open-history`, `open-settings`.
The same names work as CLI arguments: `neatshotx capture-area`.
