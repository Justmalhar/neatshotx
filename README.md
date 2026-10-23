# NeatShotX

Cross-platform (macOS · Windows · Linux) screenshot tool modelled on CleanShot X. Fully local, no recording, no network.
Built with **Tauri 2 (Rust)** + **React/TypeScript**. Lives in the menu bar / system tray.

## Features

| Area | What you get |
|---|---|
| Capture | Area (frozen screen, crosshair + magnifier), Window (hover detect), Fullscreen (all monitors), Previous Area, Self-Timer, Scrolling Capture (automatic or manual scrolling) |
| After capture | Quick Access Overlay (copy, save/delete, drag-out, annotate, pin), auto copy/save |
| Annotate | Arrow (tapered, standard, curved, double, line-dot; inverse), rectangle, filled rectangle, ellipse, line, pen, highlighter, text, counter, pixelate, blur, spotlight, emoji, crop, background (gradient/padding/radius/shadow), undo/redo |
| Pin | Floating always-on-top screenshots (wheel = opacity, double-click = close) |
| Other | History, Hide desktop icons, rebindable global shortcuts, launch at login, `neatshotx://` URL scheme |

## Requirements

- Rust (stable), [Bun](https://bun.sh)
- Linux: `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev libxdo-dev libpipewire-0.3-dev` (Tauri + xcap prerequisites)
- macOS: grant **Screen Recording** (screen capture permission) and **Accessibility** (only for automatic scrolling) in System Settings → Privacy & Security

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
| Scrolling Capture | ⌥⇧6 |
| Self-Timer | ⌥⇧8 |

In the selector: drag = area, **Space** = toggle window mode, **Esc**/right-click = cancel.
Editor: V A R F E L P H T N X B S J C select tools, ⌘Z / ⇧⌘Z, ⌘C copy, ⌘S save, Enter applies crop.

## URL scheme / CLI

`neatshotx://capture-area`, `capture-fullscreen`, `capture-window`, `capture-previous-area`,
`scrolling-capture`, `self-timer`, `annotate`, `open-from-clipboard`, `pin-image`,
`restore-recently-closed`, `toggle-desktop-icons`, `hide-desktop-icons`, `show-desktop-icons`, `open-history`, `open-settings`.
The same names work as CLI arguments: `neatshotx capture-area`.

Parameters (CleanShot API style; coordinates are in display points on macOS / pixels elsewhere, relative to the display origin; `display` is a 0-based index, default 0):

| URL | Effect |
| --- | --- |
| `neatshotx://capture-area?x=100&y=200&width=800&height=600&display=1` | Capture that exact region, no selector |
| `neatshotx://capture-fullscreen?display=1` | Capture one display (omit `display` for all) |
| `neatshotx://open-annotate?filepath=/abs/path.png` | Open the editor on a file |
| `neatshotx://pin?filepath=/abs/path.png` | Pin a file to the screen |

Launching NeatShotX again with no arguments opens Preferences (useful when the menu bar icon is hidden).
