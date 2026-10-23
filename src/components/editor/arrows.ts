import type Konva from "konva";
import type { Shape } from "./types";

export type ArrowStyle = NonNullable<Shape["arrowStyle"]>;
export const ARROW_STYLES: { id: ArrowStyle; label: string }[] = [
  { id: "tapered", label: "Tapered" }, { id: "standard", label: "Standard" }, { id: "curved", label: "Curved" },
  { id: "double", label: "Double" }, { id: "line-dot", label: "Line + dot" },
];
export const DEFAULT_CURVE = 0.35;
const K = 0.7; // control-point offset = curve * len * K  (curve 0.35 => ~25% of length)

type P = { x: number; y: number };
const len = (s: Shape) => Math.hypot(s.w, s.h) || 1;
const perp = (s: Shape): P => ({ x: -s.h / len(s), y: s.w / len(s) });

/** Quadratic control point in node-local coords (tail = 0,0 before inverse; head = w,h). */
export function controlPoint(s: Shape): P {
  const n = perp(s), o = (s.curve ?? DEFAULT_CURVE) * len(s) * K;
  return { x: s.w / 2 + n.x * o, y: s.h / 2 + n.y * o };
}
/** Midpoint of the curve (where the bend handle sits), node-local. */
export function curveMid(s: Shape): P {
  const c = controlPoint(s);
  return { x: 0.5 * c.x + 0.25 * s.w, y: 0.5 * c.y + 0.25 * s.h };
}
/** Inverse of curveMid: a dragged point (node-local) -> curve value in -1…1. */
export function curveFromPoint(s: Shape, p: P): number {
  const n = perp(s), off = 2 * ((p.x - s.w / 2) * n.x + (p.y - s.h / 2) * n.y);
  return Math.max(-1, Math.min(1, off / (len(s) * K)));
}

/** Filled tapered polygon: thin tail widening to a solid triangular head. */
function taper(ctx: Konva.Context, t: P, h: P, sw: number) {
  const L = Math.hypot(h.x - t.x, h.y - t.y) || 1, dx = (h.x - t.x) / L, dy = (h.y - t.y) / L, nx = -dy, ny = dx;
  const hl = Math.min(sw * 4.5, L * 0.6), hw = sw * 2.4, bw = sw * 0.55, tw = sw * 0.12;
  const bx = h.x - dx * hl, by = h.y - dy * hl;
  ctx.beginPath();
  ctx.moveTo(t.x + nx * tw, t.y + ny * tw);
  ctx.lineTo(bx + nx * bw, by + ny * bw);
  ctx.lineTo(bx + nx * hw, by + ny * hw);
  ctx.lineTo(h.x, h.y);
  ctx.lineTo(bx - nx * hw, by - ny * hw);
  ctx.lineTo(bx - nx * bw, by - ny * bw);
  ctx.lineTo(t.x - nx * tw, t.y - ny * tw);
  ctx.closePath();
}

function head(ctx: Konva.Context, tip: P, from: P, sw: number) {
  const a = Math.atan2(tip.y - from.y, tip.x - from.x), l = sw * 3.5, w = sw * 1.75;
  const bx = tip.x - Math.cos(a) * l, by = tip.y - Math.sin(a) * l;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(bx - Math.sin(a) * w, by + Math.cos(a) * w);
  ctx.lineTo(bx + Math.sin(a) * w, by - Math.cos(a) * w);
  ctx.closePath();
}

/** sceneFunc for tapered / curved / line-dot arrows (standard + double use Konva.Arrow). Default hit func reuses it. */
export function arrowScene(s: Shape, sw: number) {
  return (ctx: Konva.Context, shape: Konva.Shape) => {
    const a: P = { x: 0, y: 0 }, b: P = { x: s.w, y: s.h };
    const [t, h] = s.arrowInverse ? [b, a] : [a, b];
    if (s.arrowStyle === "tapered") { taper(ctx, t, h, sw); return ctx.fillStrokeShape(shape); }
    if (s.arrowStyle === "line-dot") {
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(h.x, h.y); ctx.strokeShape(shape);
      ctx.beginPath(); ctx.arc(h.x, h.y, sw * 1.9, 0, Math.PI * 2); ctx.closePath(); return ctx.fillStrokeShape(shape);
    }
    // curved: same control point whichever end carries the head
    const c = controlPoint(s);
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.quadraticCurveTo(c.x, c.y, h.x, h.y); ctx.strokeShape(shape);
    head(ctx, h, c, sw); ctx.fillStrokeShape(shape);
  };
}
