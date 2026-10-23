//! Scrolling capture: grab the region repeatedly while the user scrolls, stitch by row matching.
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
    result: Arc<Mutex<Option<RgbaImage>>>,
}

pub fn start(app: &AppHandle, r: capture::Region, xcap_index: usize) -> Result<(), String> {
    let st = app.state::<ScrollState>();
    st.running.store(true, Ordering::SeqCst);
    *st.result.lock().unwrap() = None;
    let _ = windows::overlay(app, "scroll-bar", "/scroll-bar")
        .inner_size(320.0, 56.0)
        .position(24.0, 24.0)
        .focused(false)
        .build();
    let (running, result, app) = (st.running.clone(), st.result.clone(), app.clone());
    thread::spawn(move || {
        let mut stitched: Option<RgbaImage> = None;
        let mut last: Option<RgbaImage> = None;
        while running.load(Ordering::SeqCst) {
            if let Ok(frame) = capture::capture_live(xcap_index, r) {
                match (&mut stitched, &last) {
                    (Some(out), Some(prev)) => {
                        if let Some(dy) = find_offset(prev, &frame) {
                            append_rows(out, &frame, dy);
                            let _ = app.emit_to("scroll-bar", "scroll-progress", out.height());
                        }
                    }
                    _ => stitched = Some(frame.clone()),
                }
                last = Some(frame);
            }
            thread::sleep(Duration::from_millis(120));
        }
        *result.lock().unwrap() = stitched;
    });
    Ok(())
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
        if let Some(img) = st.result.lock().unwrap().take() {
            if keep {
                capture::handle_capture(&app, img)?;
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

/// How many pixels the content moved up between `prev` and `cur`.
/// Matches a band from `cur` (below any sticky header) inside `prev`.
/// Returns None when nothing moved or no confident match was found.
pub fn find_offset(prev: &RgbaImage, cur: &RgbaImage) -> Option<u32> {
    let h = cur.height();
    if prev.dimensions() != cur.dimensions() || h < BAND * 4 {
        return None;
    }
    let s = h / 4;
    let samples = (BAND / 2) as u64 * cur.width().div_ceil(STEP) as u64;
    let mut best = (u64::MAX, 0u32);
    for p in s..=(h - BAND) {
        let c = band_cost(cur, s, prev, p, best.0);
        if c < best.0 {
            best = (c, p);
        }
    }
    let dy = best.1 - s;
    // ponytail: fixed threshold (avg luma diff < 6); make adaptive if noisy UIs misalign.
    (dy > 0 && best.0 / samples.max(1) < 6).then_some(dy)
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
}
