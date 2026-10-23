import { Fragment, useEffect, useState } from "react";
import { Rect, Shape } from "react-konva";
import type Konva from "konva";
import type { Background, BgLayout } from "../types";
import { GRADIENT_PRESETS, WALLPAPERS, drawGradient } from "./presets";

type Ctx2D = CanvasRenderingContext2D;
const raw = (c: Konva.Context) => (c as unknown as { _context: Ctx2D })._context;

const edgeCache = new WeakMap<HTMLImageElement, string>();
/** Average colour of the screenshot's 1-px border. White if the canvas is tainted/unavailable. */
function edgeColor(img: HTMLImageElement): string {
  const hit = edgeCache.get(img);
  if (hit) return hit;
  let out = "#ffffff";
  try {
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true })!;
    x.drawImage(img, 0, 0);
    const strips = [x.getImageData(0, 0, w, 1), x.getImageData(0, h - 1, w, 1), x.getImageData(0, 0, 1, h), x.getImageData(w - 1, 0, 1, h)];
    let r = 0, g = 0, b = 0, n = 0;
    for (const s of strips) for (let i = 0; i < s.data.length; i += 4) { r += s.data[i]; g += s.data[i + 1]; b += s.data[i + 2]; n++; }
    if (n) out = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
  } catch { /* tainted */ }
  edgeCache.set(img, out);
  return out;
}

function cover(ctx: Ctx2D, src: CanvasImageSource, sw: number, sh: number, W: number, H: number, bleed = 0) {
  const s = Math.max((W + bleed * 2) / sw, (H + bleed * 2) / sh);
  const dw = sw * s, dh = sh * s;
  ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

const TINT = ["rgba(255,255,255,.4)", "rgba(0,0,0,.35)", "rgba(0,0,0,.6)"];

function drawBlurred(ctx: Ctx2D, img: HTMLImageElement, W: number, H: number, tint: number) {
  const px = Math.max(W, H) * 0.04;
  ctx.save();
  if (typeof (ctx as { filter?: string }).filter === "string") {
    ctx.filter = `blur(${px}px)`;
    cover(ctx, img, img.naturalWidth, img.naturalHeight, W, H, px * 2);
  } else { // fallback: downscale then upscale with smoothing
    const k = 24, c = document.createElement("canvas"); c.width = k; c.height = Math.max(1, Math.round((k * H) / W));
    cover(c.getContext("2d")!, img, img.naturalWidth, img.naturalHeight, c.width, c.height);
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(c, 0, 0, W, H);
  }
  ctx.restore();
  ctx.fillStyle = TINT[tint] ?? TINT[0]; ctx.fillRect(0, 0, W, H);
}

function useCustomImage(url?: string) {
  const [im, setIm] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setIm(null); return; }
    const i = new Image(); i.onload = () => setIm(i); i.src = url;
    return () => { i.onload = null; };
  }, [url]);
  return im;
}

export function Backdrop({ bg, layout, img }: { bg: Background; layout: BgLayout; img: HTMLImageElement }) {
  const custom = useCustomImage(bg.kind === "wallpaper" && bg.wallpaper < 0 ? bg.customWallpaper : undefined);
  if (bg.kind === "none") return null;
  const { W, H, frame, radius } = layout;
  const fillColor = bg.autoBalance ? edgeColor(img) : "#ffffff";
  const k = Math.max(frame.w, frame.h) / 1000, s = bg.shadow / 100;

  const paint = (c: Konva.Context) => {
    const ctx = raw(c);
    ctx.save();
    if (bg.kind === "gradient") drawGradient(ctx, W, H, GRADIENT_PRESETS[bg.gradient] ?? GRADIENT_PRESETS[0]);
    else if (bg.kind === "wallpaper") {
      if (bg.wallpaper < 0) { if (custom) cover(ctx, custom, custom.naturalWidth, custom.naturalHeight, W, H); }
      else (WALLPAPERS[bg.wallpaper] ?? WALLPAPERS[0]).draw(ctx, W, H);
    } else if (bg.kind === "blurred") drawBlurred(ctx, img, W, H, bg.blurred);
    else if (bg.kind === "color" && bg.color !== "transparent") { ctx.fillStyle = bg.color; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  };

  return (
    <Fragment>
      <Shape sceneFunc={paint} listening={false} />
      {s > 0 && (
        <Rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} cornerRadius={radius} fill={fillColor} listening={false}
          shadowColor="#000" shadowBlur={s * 90 * k} shadowOffsetY={s * 30 * k} shadowOpacity={0.15 + s * 0.45} />
      )}
      <Rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} cornerRadius={radius} fill={fillColor} listening={false} />
    </Fragment>
  );
}

/** clipFunc for the annotation Group (origin = layout.image): clips to the rounded frame in group-local coords. */
export function groupClip(layout: BgLayout): ((ctx: Konva.Context) => void) | undefined {
  const { frame: f, image, radius: r } = layout;
  if (r <= 0) return undefined;
  const x = f.x - image.x, y = f.y - image.y, w = f.w, h = f.h;
  return (c) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
}
