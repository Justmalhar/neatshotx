//! CleanShot-style "Window screenshots": soft drop shadow + transparent padding around a window capture.
use image::{imageops, GrayImage, Luma, Rgba, RgbaImage};

const SHADOW_OPACITY: f32 = 0.5;

/// Returns `win` on a larger transparent canvas with a drop shadow and/or `padding` px around it.
/// Respects the window's own alpha (rounded corners). A no-op when both are off.
pub fn style(win: RgbaImage, shadow: bool, padding: u32) -> RgbaImage {
    if !shadow && padding == 0 {
        return win;
    }
    let (w, h) = win.dimensions();
    // Blur radius scales with the window; the offset is a small fraction of it.
    let radius = if shadow { 20.max(w.min(h) / 25) } else { 0 };
    let dy = (radius as f32 * 0.25).ceil() as u32; // macOS-like: shadow falls a bit below the window
    let reach = radius * 3 / 2; // ~3 sigma
    let m = padding + if shadow { reach + dy } else { 0 };
    let mut canvas = RgbaImage::new(w + 2 * m, h + 2 * m);
    if shadow {
        let sh = shadow_layer(&win, radius, reach);
        imageops::overlay(&mut canvas, &sh, (m - reach) as i64, (m - reach + dy) as i64);
    }
    imageops::overlay(&mut canvas, &win, m as i64, m as i64);
    canvas
}

/// Black layer with the window's alpha mask blurred, sized window + `reach` on every side.
fn shadow_layer(win: &RgbaImage, radius: u32, reach: u32) -> RgbaImage {
    let (w, h) = win.dimensions();
    let (sw, sh) = (w + 2 * reach, h + 2 * reach);
    let mut mask = GrayImage::new(sw, sh);
    for (x, y, p) in win.enumerate_pixels() {
        mask.put_pixel(x + reach, y + reach, Luma([p[3]]));
    }
    // Blur a downscaled mask (cheap), then scale back up; shadows are low-frequency anyway.
    let f = (radius / 4).max(1);
    let (bw, bh) = ((sw / f).max(1), (sh / f).max(1));
    let small = imageops::resize(&mask, bw, bh, imageops::FilterType::Triangle);
    let small = imageops::blur(&small, radius as f32 / 2.0 / f as f32);
    let mask = imageops::resize(&small, sw, sh, imageops::FilterType::CatmullRom);
    let mut out = RgbaImage::new(sw, sh);
    for (x, y, p) in mask.enumerate_pixels() {
        out.put_pixel(x, y, Rgba([0, 0, 0, (p[0] as f32 * SHADOW_OPACITY) as u8]));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn solid(w: u32, h: u32) -> RgbaImage {
        RgbaImage::from_pixel(w, h, Rgba([200, 30, 30, 255]))
    }

    #[test]
    fn off_is_identity() {
        let img = solid(300, 200);
        assert_eq!(style(img.clone(), false, 0), img);
    }

    #[test]
    fn shadow_grows_canvas_and_darkens_below() {
        let out = style(solid(300, 200), true, 0);
        assert!(out.width() > 300 && out.height() > 200);
        let m = (out.width() - 300) / 2;
        // Just below the window's bottom edge there is shadow; the far corner is clear.
        assert!(out.get_pixel(m + 150, m + 200 + 3)[3] > 0);
        assert_eq!(out.get_pixel(0, 0)[3], 0);
        // Window pixels stay on top, untouched.
        assert_eq!(*out.get_pixel(m + 10, m + 10), Rgba([200, 30, 30, 255]));
    }

    #[test]
    fn padding_only_is_transparent_border() {
        let out = style(solid(100, 100), false, 12);
        assert_eq!(out.dimensions(), (124, 124));
        assert_eq!(out.get_pixel(5, 5)[3], 0);
        assert_eq!(out.get_pixel(12, 12)[3], 255);
    }

    #[test]
    fn rounded_corner_alpha_is_respected() {
        let mut img = solid(200, 200);
        img.put_pixel(0, 0, Rgba([0, 0, 0, 0]));
        let out = style(img, false, 4);
        assert_eq!(out.get_pixel(4, 4)[3], 0);
    }
}
