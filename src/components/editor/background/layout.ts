import type { Background, BgAlign, BgLayout, BgRatio } from "../types";

const RATIO: Record<BgRatio, number> = { auto: 0, "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "9:16": 9 / 16, "3:2": 3 / 2 };

/** Pure geometry for the CleanShot-style background. Sliders scale with image size so they feel the same everywhere. */
export function layoutBackground(bg: Background, iw: number, ih: number): BgLayout {
  if (bg.kind === "none") return { W: iw, H: ih, frame: { x: 0, y: 0, w: iw, h: ih }, image: { x: 0, y: 0 }, radius: 0 };
  const mx = Math.max(iw, ih), mn = Math.min(iw, ih);
  const pad = Math.round((bg.padding / 100) * 0.25 * mx);
  const inset = Math.round((bg.inset / 100) * 0.08 * mn);
  const fw = iw + inset * 2, fh = ih + inset * 2;
  let W = fw + pad * 2, H = fh + pad * 2;
  const r = RATIO[bg.ratio];
  if (r) { if (W / H < r) W = Math.round(H * r); else H = Math.round(W / r); }
  const a: BgAlign = bg.align;
  const fx = a.includes("l") ? pad : a.includes("r") ? W - pad - fw : Math.round((W - fw) / 2);
  const fy = a.startsWith("t") ? pad : a.startsWith("b") ? H - pad - fh : Math.round((H - fh) / 2);
  return {
    W, H,
    frame: { x: fx, y: fy, w: fw, h: fh },
    image: { x: fx + inset, y: fy + inset },
    radius: Math.round((bg.radius / 100) * 0.06 * Math.min(fw, fh)),
  };
}
