//! Scrolling capture: grab the region repeatedly while it scrolls (automatically or by hand), stitch by row matching.
use image::{imageops, RgbaImage};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

use crate::{capture, windows};

#[derive(Default)]
pub struct ScrollState {
    running: Arc<AtomicBool>,
    result: Arc<Mutex<Option<(RgbaImage, usize)>>>,
}

pub fn start(app: &AppHandle, r: capture::Region, xcap_index: usize, xcap_rect: (i32, i32, u32, u32), image_w: u32) -> Result<(), String> {
    let st = app.state::<ScrollState>();
    if st.running.swap(true, Ordering::SeqCst) {
        return Err("A scrolling capture is already running".into());
    }
    *st.result.lock().unwrap() = None;
    // The bar is the only way to stop a manual session — never run without it.
    if let Some(old) = app.get_webview_window("scroll-bar") {
        let _ = old.destroy();
    }
    if let Err(e) = windows::overlay(app, "scroll-bar", "/scroll-bar")
        .effects(windows::hud_effects(28.0))
        .inner_size(320.0, 56.0)
        .position(24.0, 24.0)
        .focused(false)
        .build()
    {
        st.running.store(false, Ordering::SeqCst);
        return Err(e.to_string());
    }
    // Park the cursor just inside the region's right edge (usually padding/scrollbar, so fewer hover
    // effects than the centre). OS cursor space = xcap_rect space (points on macOS, pixels elsewhere).
    let k = xcap_rect.2 as f64 / image_w.max(1) as f64;
    let centre = (
        xcap_rect.0 + ((r.x + r.w) as f64 * k) as i32 - 8,
        xcap_rect.1 + ((r.y + r.h / 2) as f64 * k) as i32,
    );
    let auto = crate::settings::get(app).scroll_auto;
    let (running, result, app) = (st.running.clone(), st.result.clone(), app.clone());
    thread::spawn(move || {
        let mut scroller = auto.then(|| AutoScroller::new(centre)).flatten();
        let _ = app.emit_to("scroll-bar", "scroll-mode", if scroller.is_some() { "auto" } else { "manual" });
        let (mut stitched, mut last): (Option<RgbaImage>, Option<RgbaImage>) = (None, None);
        let mut misses = 0;
        while running.load(Ordering::SeqCst) {
            if let Ok(frame) = capture::capture_live(xcap_index, r) {
                let mut moved = None;
                match (&mut stitched, &last) {
                    (Some(out), Some(prev)) => {
                        if let Some(dy) = find_offset(prev, &frame) {
                            append_rows(out, &frame, dy);
                            moved = Some(dy);
                            let _ = app.emit_to("scroll-bar", "scroll-progress", out.height());
                        }
                    }
                    _ => stitched = Some(frame.clone()),
                }
                last = Some(frame);
                if let Some(sc) = scroller.as_mut() {
                    misses = if moved.is_some() { 0 } else { misses + 1 };
                    let height = stitched.as_ref().map_or(0, |i| i.height());
                    // Hover effects under the parked cursor can spoil a frame or two; only 5 misses in a row means "bottom".
                    if misses >= 5 || height >= MAX_HEIGHT {
                        if height <= r.h {
                            // Nothing moved at all: input injection is blocked (macOS Accessibility) or
                            // the area isn't scrollable. Fall back to manual scrolling.
                            scroller = None;
                            let _ = app.emit_to("scroll-bar", "scroll-mode", "manual-fallback");
                            continue;
                        }
                        break; // reached the bottom
                    }
                    sc.step(moved, r.h);
                }
            }
            thread::sleep(Duration::from_millis(if scroller.is_some() { 220 } else { 120 }));
        }
        let auto_finished = running.swap(false, Ordering::SeqCst);
        drop(scroller); // restores the cursor
        if auto_finished {
            // Auto mode hit the bottom: finish without waiting for the user.
            if let Some(w) = app.get_webview_window("scroll-bar") {
                let _ = w.destroy();
            }
            if let Some(img) = stitched {
                let _ = capture::handle_capture(&app, img, xcap_index);
            }
        } else {
            *result.lock().unwrap() = stitched.map(|img| (img, xcap_index));
        }
    });
    Ok(())
}

const MAX_HEIGHT: u32 = 40_000;

/// Drives the scroll wheel over the captured area (CleanShot's "automatic scrolling").
struct AutoScroller {
    enigo: enigo::Enigo,
    restore: Option<(i32, i32)>,
    lines: i32,
}

impl AutoScroller {
    fn new(centre: (i32, i32)) -> Option<Self> {
        use enigo::{Coordinate, Enigo, Mouse, Settings};
        let mut enigo = Enigo::new(&Settings::default()).ok()?;
        let restore = enigo.location().ok();
        enigo.move_mouse(centre.0, centre.1, Coordinate::Abs).ok()?;
        thread::sleep(Duration::from_millis(250));
        Some(Self { enigo, restore, lines: 3 })
    }

    /// Scroll, adapting the step so each frame overlaps ~2/3 of the previous one (keeps stitching reliable).
    fn step(&mut self, moved: Option<u32>, view_h: u32) {
        use enigo::{Axis, Mouse};
        if let Some(dy) = moved.filter(|d| *d > 0) {
            let target = view_h as f64 / 3.0;
            self.lines = ((self.lines as f64 * target / dy as f64).round() as i32).clamp(1, 15);
        }
        let _ = self.enigo.scroll(self.lines, Axis::Vertical);
    }
}

impl Drop for AutoScroller {
    fn drop(&mut self) {
        use enigo::{Coordinate, Mouse};
        if let Some((x, y)) = self.restore {
            let _ = self.enigo.move_mouse(x, y, Coordinate::Abs);
        }
    }
}

#[tauri::command]
pub async fn finish_scroll(app: AppHandle, keep: bool) -> Result<(), String> {
    let st = app.state::<ScrollState>();
    st.running.store(false, Ordering::SeqCst);
    if let Some(w) = app.get_webview_window("scroll-bar") {
        let _ = w.destroy();
    }
    // Wait for the worker to publish its result.
    for _ in 0..50 {
        if let Some((img, monitor)) = st.result.lock().unwrap().take() {
            if keep {
                capture::handle_capture(&app, img, monitor)?;
            }
            return Ok(());
        }
        thread::sleep(Duration::from_millis(50));
    }
    Err("Scrolling capture produced no image".into())
}

const BAND: u32 = 32;
const STEP: u32 = 4;

fn luma(img: &RgbaImage, x: u32, y: u32) -> i32 {
    let p = img.get_pixel(x, y).0;
    (p[0] as i32 * 3 + p[1] as i32 * 6 + p[2] as i32) / 10
}

fn band_cost(a: &RgbaImage, ay: u32, b: &RgbaImage, by: u32, best: u64) -> u64 {
    let mut cost = 0u64;
    for r in (0..BAND).step_by(2) {
        for x in (0..a.width()).step_by(STEP as usize) {
            cost += (luma(a, x, ay + r) - luma(b, x, by + r)).unsigned_abs() as u64;
        }
        if cost >= best {
            return cost;
        }
    }
    cost
}

/// Best match of `cur`'s band at row `s` inside `prev` → (dy, mean luma diff).
fn match_band(prev: &RgbaImage, cur: &RgbaImage, s: u32) -> (u32, u64) {
    let h = cur.height();
    let samples = (BAND / 2) as u64 * cur.width().div_ceil(STEP) as u64;
    let mut best = (u64::MAX, s);
    for p in s..=(h - BAND) {
        let c = band_cost(cur, s, prev, p, best.0);
        if c < best.0 {
            best = (c, p);
        }
    }
    (best.1 - s, best.0 / samples.max(1))
}

/// How many pixels the content moved up between `prev` and `cur`, or None if nothing moved / no
/// confident match. Three bands are matched so a sticky header or a hover animation spoiling one
/// band doesn't break stitching: two agreeing bands win, else the most confident moving band.
pub fn find_offset(prev: &RgbaImage, cur: &RgbaImage) -> Option<u32> {
    let h = cur.height();
    if prev.dimensions() != cur.dimensions() || h < BAND * 4 {
        return None;
    }
    // ponytail: fixed threshold (avg luma diff < 6); make adaptive if noisy UIs misalign.
    let mut moving: Vec<(u32, u64)> = [h / 5, h / 3, h / 2]
        .into_iter()
        .map(|s| match_band(prev, cur, s))
        .filter(|&(dy, cost)| dy > 0 && cost < 6)
        .collect();
    moving.sort_by_key(|&(_, cost)| cost);
    let agreed = moving.iter().find(|a| moving.iter().filter(|b| a.0.abs_diff(b.0) <= 2).count() >= 2);
    agreed.or(moving.first()).map(|&(dy, _)| dy)
}

pub fn append_rows(out: &mut RgbaImage, frame: &RgbaImage, dy: u32) {
    let (w, h) = frame.dimensions();
    let mut next = RgbaImage::new(w, out.height() + dy);
    imageops::replace(&mut next, out, 0, 0);
    let tail = imageops::crop_imm(frame, 0, h - dy, w, dy).to_image();
    imageops::replace(&mut next, &tail, 0, out.height() as i64);
    *out = next;
}

#[cfg(test)]
mod tests {
    use super::*;

    fn noise(w: u32, h: u32) -> RgbaImage {
        let mut seed = 7u32;
        RgbaImage::from_fn(w, h, |_, _| {
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            let v = (seed >> 16) as u8;
            image::Rgba([v, v.wrapping_mul(3), v.wrapping_add(90), 255])
        })
    }

    #[test]
    fn stitches_scrolled_windows_back_into_page() {
        let page = noise(120, 900);
        let view = |y| imageops::crop_imm(&page, 0, y, 120, 300).to_image();
        let mut out = view(0);
        let mut prev = view(0);
        for y in [0, 37, 120, 260, 400] {
            let cur = view(y);
            if let Some(dy) = find_offset(&prev, &cur) {
                append_rows(&mut out, &cur, dy);
            }
            prev = cur;
        }
        assert_eq!(out.height(), 700);
        assert_eq!(out, imageops::crop_imm(&page, 0, 0, 120, 700).to_image());
    }

    #[test]
    fn sticky_header_does_not_break_offset() {
        let page = noise(120, 900);
        let header = noise(120, 40).iter().map(|p| 255 - p).collect::<Vec<u8>>();
        let header = RgbaImage::from_raw(120, 40, header).unwrap();
        let view = |y| {
            let mut v = imageops::crop_imm(&page, 0, y, 120, 300).to_image();
            imageops::replace(&mut v, &header, 0, 0); // fixed header painted over the top
            v
        };
        assert_eq!(find_offset(&view(0), &view(55)), Some(55));
        assert_eq!(find_offset(&view(55), &view(55)), None);
    }
}
