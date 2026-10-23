export type Box = { x: number; y: number; w: number; h: number };
/** A guide line in the same coordinate space as the boxes. `v` = vertical line at x=pos spanning y∈[from,to]; `h` the reverse. */
export type Guide = { o: "v" | "h"; pos: number; from: number; to: number };
/** Which of a box's [min, center, max] positions may snap, per axis. Omitted = all, [] = none. */
export type Only = { x?: (0 | 1 | 2)[]; y?: (0 | 1 | 2)[] };

const ALL: (0 | 1 | 2)[] = [0, 1, 2];
const at = (min: number, size: number) => [min, min + size / 2, min + size];

function axis(min: number, size: number, tmin: number[], tsize: number[], th: number, only: (0 | 1 | 2)[]) {
  let best = Infinity;
  const m = at(min, size);
  tmin.forEach((tm, i) => at(tm, tsize[i]).forEach((t) => only.forEach((k) => { const d = t - m[k]; if (Math.abs(d) < Math.abs(best)) best = d; })));
  return Math.abs(best) <= th ? best : 0;
}

/** Snap `moving` to the edges/centres of `targets` within `threshold`. Returns the offset to apply and the guides to draw. */
export function computeSnap(moving: Box, targets: Box[], threshold: number, only: Only = {}) {
  const ox = only.x ?? ALL, oy = only.y ?? ALL;
  const dx = axis(moving.x, moving.w, targets.map((t) => t.x), targets.map((t) => t.w), threshold, ox);
  const dy = axis(moving.y, moving.h, targets.map((t) => t.y), targets.map((t) => t.h), threshold, oy);
  const b = { ...moving, x: moving.x + dx, y: moving.y + dy };
  const guides: Guide[] = [];
  const mx = at(b.x, b.w), my = at(b.y, b.h), eps = 0.01;
  for (const t of targets) {
    const y0 = Math.min(b.y, t.y), y1 = Math.max(b.y + b.h, t.y + t.h), x0 = Math.min(b.x, t.x), x1 = Math.max(b.x + b.w, t.x + t.w);
    at(t.x, t.w).forEach((p) => { if (ox.some((k) => Math.abs(p - mx[k]) < eps)) guides.push({ o: "v", pos: p, from: y0, to: y1 }); });
    at(t.y, t.h).forEach((p) => { if (oy.some((k) => Math.abs(p - my[k]) < eps)) guides.push({ o: "h", pos: p, from: x0, to: x1 }); });
  }
  return { dx, dy, guides };
}
