# NeatShotX Design System

NeatShotX should feel like a native desktop utility (think CleanShot X, Preview, System Settings), not a web page.
These rules are binding for every window. When in doubt, do what the OS does.

## 1. Native first

Use the platform's own control wherever one exists. Inside the system webview these render with the OS look
(AppKit on macOS, Fluent on Windows, GTK on Linux) and follow the user's accent color and appearance for free.

| Need | Use | Not |
|---|---|---|
| Checkbox | `<input type="checkbox" className="ns-check">` (native) | custom-drawn boxes |
| Toggle in a list | native checkbox (macOS prefs use checkboxes) | iOS-style switches |
| Pop-up / dropdown | `<select className="ns-select">` (native) | custom listboxes |
| Slider | `<input type="range" className="ns-range">` (native) | custom tracks |
| Text field | `<input className="ns-field">` | |
| Menu of commands (Save as…, zoom, filters) | `nativeMenu()` from `src/ui/menu.ts` (Tauri popup NSMenu) | custom HTML menus |
| Tooltip | `title="Label (⌘X)"` attribute (native tooltip) | custom tooltip components |
| Confirm / alert / file pick | `@tauri-apps/plugin-dialog` | HTML modals |
| Translucent overlay window | native window effect (vibrancy/acrylic, set in Rust `windows.rs`) | CSS `backdrop-filter` on transparent windows (blurs nothing) |

Custom components are allowed only where no native equivalent exists: toolbar/capsule buttons, segmented
controls, color swatches, popovers with custom content (color grid, arrow styles), thumbnails/cards.
Build them from `src/ui/*` only.

## 2. Tokens (defined in `src/index.css`)

On macOS the color tokens map to `-apple-system-*` system colors (accent, label, separator, window background),
so they track the user's accent and light/dark automatically. Other platforms use the fallback values.

- **Text:** `--label`, `--label-2` (secondary), `--label-3` (tertiary/disabled)
- **Surfaces:** `--bg-window` (window background), `--bg-content` (content/field background), `--bg-control` (bezel buttons), `--fill`, `--fill-2` (hover/pressed tints)
- **Lines:** `--separator`
- **Accent:** `--accent`, `--accent-fg`; destructive `--danger`
- **HUD (floating dark chrome):** `--hud-bg`, `--hud-fg`

## 3. Scales

**Type** (system font only: SF Pro / Segoe UI Variable / system-ui):

| Class | Size / weight | Use |
|---|---|---|
| `.t-large` | 26 / 600, tracking -0.022em | window hero titles (Welcome, About) |
| `.t-title` | 15 / 600 | section titles |
| `.t-headline` | 13 / 600 | row labels that need weight, toolbar titles |
| `.t-body` | 13 / 400 | default |
| `.t-callout` | 12 / 400, secondary | helper text |
| `.t-caption` | 11 / 400, secondary | captions, metadata |

No other font sizes. Never use `text-xs/sm/lg` or arbitrary `text-[Npx]`.

**Radius:** `--r-xs 4px` (checkbox, tiny chips) · `--r-sm 6px` (buttons, fields, pop-ups, segmented, menu rows) ·
`--r-md 10px` (popovers, cards, thumbnails, grouped lists) · `--r-lg 14px` (HUD panels, Quick Access cards) ·
`--r-full` (floating capsules in editor bar, HUD pills, round icon buttons).
Rule: controls inside a window = 6px; floating chrome (editor bars, HUDs, overlays) = capsule/full.

**Control heights:** 22px form controls (regular) · 28px toolbar icon buttons · 32px floating capsules · 20px small.

**Spacing:** 4px grid only (4, 8, 12, 16, 20, 24, 32).

**Icons:** lucide-react only. 16px in controls (14px in small/HUD), `strokeWidth={1.75}` everywhere.

## 4. Behavior

- Arrow cursor everywhere (`cursor: default`), including buttons. Text cursor only in editable fields.
- No text selection except in fields/textareas. No image/link dragging (except deliberate drag-out).
- No webview context menu (except in editable fields). No rubber-band overscroll.
- Press feedback = darker fill on `:active` (macOS doesn't scale buttons). Floating capsules may scale to 0.97.
- No hover-scale on cards/thumbnails. Hover shows controls; it doesn't move content.
- Focus ring only for keyboard focus (`:focus-visible`), 3px accent at 45%.
- ⌘W / Ctrl+W closes the current window; Esc closes popovers, then transient windows.
- Motion: critically damped springs from `src/lib/motion.ts` (`spring.ui`), short. No bounce except momentum gestures.
  Popovers/menus appear from their anchor. Respect `prefers-reduced-motion` and `prefers-reduced-transparency`.

## 5. Window types

| Window | Look |
|---|---|
| Preferences, History, Welcome | Standard window: unified title bar, `--bg-window`, native controls, flat (no cards except grouped lists) |
| Editor | Standard window, CleanShot layout: capsule top bar + bottom bar on `--bg-window`, canvas on `--bg-content` |
| Quick Access, Pin | Borderless, no chrome except thumbnails; controls appear on hover |
| Scroll bar, Countdown | Borderless HUD with native vibrancy (`HudWindow` effect); content uses `--hud-fg` |
| Selector | Full-screen; HUD elements use `.hud` (CSS blur works here: it blurs the frozen screenshot) |
