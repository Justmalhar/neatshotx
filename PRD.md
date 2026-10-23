# NeatShotX — Product Requirements

## Problem
CleanShot X is the reference screenshot tool on macOS but is Mac-only and closed. Teams on mixed OS fleets
lack one consistent capture → annotate → share workflow.

## Goal
Feature parity with CleanShot X 4.8 core workflows on macOS, Windows and Linux, free and self-hostable.

## Users
Engineers, designers, PMs and support staff who capture, mark up and share screens daily.

## Reference inventory (from the CleanShot X 4.8.6 bundle)
Derived from `Info.plist`, Mach-O strings and bundled resources of `/Applications/CleanShot X.app`:
- URL scheme `cleanshot://` with commands: capture-area, capture-fullscreen, capture-previous-area, scrolling-capture,
  record, open-from-clipboard, add-quick-access-overlay, restore-recently-closed, hide/show/toggle-desktop-icons, annotate, history, upload.
- Capture: `Freezer` (frozen screen), crosshair/magnifier, window filter (`CSWindowFilter`), self-timer (`CountDownOverlay`),
  `AutomaticScrollingGrabber` / `ClassicScrollingGrabber`, OCR ("Capture Text With/Without Line Breaks", Vision).
- Annotate (`AN*` classes): Arrow, Rectangle, Filled Rectangle, Ellipse, Line, Text (+emoji), Highlighter, Pixelate
  (CIHexagonalPixellate / Gaussian blur), Spotlight, Counter, Crop, Background tool (gradients, padding, shadow), snapping.
- Overlays: Quick Access (`FloatingOverlay`), Pin (`IconOverlay`), media history.
- Recording: ScreenCaptureKit + AVAssetWriter, microphone, computer audio, `CameraOverlay`, `KeyboardOverlay`,
  `CursorHighlighter` / "Highlight Clicks", GIF via bundled `gifsicle`, video trimming.
- Cloud: `CloudAPI` multipart/chunked upload, Sparkle updates, `.cleanshot` editable document type.

## Scope — v0.1 (this release)
| Capability | Status |
|---|---|
| Area / window / fullscreen / previous-area / self-timer capture | ✅ |
| Frozen-screen selector, magnifier, dimensions, window hover | ✅ |
| Scrolling capture (automatic scrolling with manual fallback, auto-stitch) | ✅ |
| Quick Access Overlay with drag-out | ✅ |
| Annotate tools listed in README, background tool, undo/redo | ✅ |
| Pin screenshots | ✅ |
| Hide desktop icons | ✅ macOS/Windows, GNOME only on Linux |
| History, settings, rebindable shortcuts, autostart, URL scheme | ✅ |

## Out of scope / later
- Cloud upload / share links (removed by decision: NeatShotX stays fully local)
- Screen/video recording, GIF, webcam, keystroke overlay (removed by decision: ffmpeg dependency, per-OS capture backends, camera/mic/accessibility permissions)
- All-In-One mode (dropped)
- Computer-audio capture on macOS/Windows (needs ScreenCaptureKit / WASAPI loopback)
- Editable project file (`.cleanshot` equivalent), resize handles on shapes, snapping guides
- OCR / Capture Text (removed by decision)
- Wayland capture (xcap supports it partially)

## Success metrics
- Capture-to-clipboard ≤ 300 ms after mouse-up on a 5K display
- Zero-crash rate for capture flows across the 3 OS targets in CI smoke tests
- Installer size < 20 MB
