// Pure selection geometry (CSS px). No DOM, no React: see geometry.check.ts.
export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Size = { w: number; h: number };
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
export const HANDLE_CURSOR: Record<Handle, string> = {
  nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize",
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
};
export const PRESETS: { label: string; ratio: number | null }[] = [
  { label: "Free", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
];

export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Point on the rect a handle sits on (corner or edge midpoint). */
export const handlePoint = (r: Rect, h: Handle): Pt => ({
  x: h.includes("w") ? r.x : h.includes("e") ? r.x + r.w : r.x + r.w / 2,
  y: h.includes("n") ? r.y : h.includes("s") ? r.y + r.h : r.y + r.h / 2,
});

const fromEdges = (x0: number, y0: number, x1: number, y1: number): Rect => ({
  x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0),
});

/**
 * Drag `handle` of `orig` to point `p` (already corrected for grab offset). The opposite edge/corner is the
 * anchor; dragging past it flips. `ratio` (w/h) locks the aspect. Result is always inside `bounds`.
 * Drawing a new rect = resize an empty rect at the start point by its "se" handle.
 */
export function resizeRect(orig: Rect, handle: Handle, p: Pt, bounds: Size, ratio: number | null): Rect {
  const px = clamp(p.x, 0, bounds.w), py = clamp(p.y, 0, bounds.h);
  const hx = handle.includes("w") ? -1 : handle.includes("e") ? 1 : 0;
  const hy = handle.includes("n") ? -1 : handle.includes("s") ? 1 : 0;
  const ax = hx < 0 ? orig.x + orig.w : hx > 0 ? orig.x : orig.x + orig.w / 2;
  const ay = hy < 0 ? orig.y + orig.h : hy > 0 ? orig.y : orig.y + orig.h / 2;
  if (!ratio) {
    return fromEdges(hx ? ax : orig.x, hy ? ay : orig.y, hx ? px : orig.x + orig.w, hy ? py : orig.y + orig.h);
  }
  const sx = px >= ax ? 1 : -1, sy = py >= ay ? 1 : -1;
  if (hx && hy) {
    let dx = Math.abs(px - ax), dy = Math.abs(py - ay);
    if (dx / ratio > dy) dy = dx / ratio; else dx = dy * ratio;
    const mx = sx > 0 ? bounds.w - ax : ax, my = sy > 0 ? bounds.h - ay : ay;
    const s = Math.min(1, dx > 0 ? mx / dx : 1, dy > 0 ? my / dy : 1);
    return fromEdges(ax, ay, ax + sx * dx * s, ay + sy * dy * s);
  }
  if (hx) { // e / w: height follows, centered
    const cy = orig.y + orig.h / 2;
    let dx = Math.abs(px - ax), dy = dx / ratio;
    const maxDy = 2 * Math.min(cy, bounds.h - cy);
    if (dy > maxDy) { dy = maxDy; dx = dy * ratio; }
    return { x: Math.min(ax, ax + sx * dx), y: cy - dy / 2, w: dx, h: dy };
  }
  const cx = orig.x + orig.w / 2; // n / s: width follows, centered
  let dy = Math.abs(py - ay), dx = dy * ratio;
  const maxDx = 2 * Math.min(cx, bounds.w - cx);
  if (dx > maxDx) { dx = maxDx; dy = dx / ratio; }
  return { x: cx - dx / 2, y: Math.min(ay, ay + sy * dy), w: dx, h: dy };
}

/**
 * Like resizeRect but symmetric about the center of `orig` (Option/Alt): the dragged handle's distance from the
 * center becomes the half-extent on that axis. Drawing = orig is the empty rect at the start point.
 */
export function resizeSymmetric(orig: Rect, handle: Handle, p: Pt, bounds: Size, ratio: number | null): Rect {
  const cx = orig.x + orig.w / 2, cy = orig.y + orig.h / 2;
  const px = clamp(p.x, 0, bounds.w), py = clamp(p.y, 0, bounds.h);
  const hx = handle.includes("w") || handle.includes("e"), hy = handle.includes("n") || handle.includes("s");
  let hw = hx ? Math.abs(px - cx) : orig.w / 2, hh = hy ? Math.abs(py - cy) : orig.h / 2;
  if (ratio) {
    if (hx && hy) { if (hw / ratio > hh) hh = hw / ratio; else hw = hh * ratio; }
    else if (hx) hh = hw / ratio;
    else hw = hh * ratio;
  }
  const mw = Math.min(cx, bounds.w - cx), mh = Math.min(cy, bounds.h - cy);
  if (ratio) {
    const s = Math.min(1, hw > 0 ? mw / hw : 1, hh > 0 ? mh / hh : 1);
    hw *= s; hh *= s;
  } else { hw = Math.min(hw, mw); hh = Math.min(hh, mh); }
  return { x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2 };
}

export function moveRect(orig: Rect, dx: number, dy: number, bounds: Size): Rect {
  return { ...orig, x: clamp(orig.x + dx, 0, bounds.w - orig.w), y: clamp(orig.y + dy, 0, bounds.h - orig.h) };
}

/** Reshape to `ratio` around the center, keeping width where possible. */
export function fitRatio(r: Rect, ratio: number, bounds: Size): Rect {
  let w = r.w, h = w / ratio;
  const s = Math.min(1, bounds.w / w, bounds.h / h);
  w *= s; h *= s;
  return { x: clamp(r.x + r.w / 2 - w / 2, 0, bounds.w - w), y: clamp(r.y + r.h / 2 - h / 2, 0, bounds.h - h), w, h };
}

/** CSS px rect -> integer image-px region (edges rounded, so adjacent rects never drift). */
export function toImageRect(r: Rect, scale: number): Rect {
  const x0 = Math.round(r.x * scale), y0 = Math.round(r.y * scale);
  return { x: x0, y: y0, w: Math.max(1, Math.round((r.x + r.w) * scale) - x0), h: Math.max(1, Math.round((r.y + r.h) * scale) - y0) };
}

export const contains = (r: Rect, p: Pt) => p.x >= r.x && p.y >= r.y && p.x <= r.x + r.w && p.y <= r.y + r.h;
