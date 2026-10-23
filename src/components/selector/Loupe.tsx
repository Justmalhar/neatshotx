import { useEffect, useRef, useState, type RefObject } from "react";
import type { Pt } from "./geometry";

const ZOOM = 8;
const SIZE = 120; // multiple of ZOOM, so the grid lines up with image pixels
const PAD = 20;
const LABEL_H = 46;

const hex = (d: Uint8ClampedArray) => "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

const LINE = "rgba(255,255,255,.55)";
const GRID = "rgba(255,255,255,.14)";

/**
 * Pixel magnifier. The zoomed view is a plain div (background-image of the frozen screenshot, pixelated):
 * a displayed, readback canvas stops repainting in WKWebView. Color comes from a separate 1x1 offscreen canvas.
 */
export default function Loupe({ cursor, img, src, scale }: { cursor: Pt; img: RefObject<HTMLImageElement | null>; src: string; scale: number }) {
  const probe = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const im = img.current;
  const nw = im?.naturalWidth || 1, nh = im?.naturalHeight || 1;
  const px = Math.min(Math.max(Math.floor(cursor.x * scale), 0), nw - 1);
  const py = Math.min(Math.max(Math.floor(cursor.y * scale), 0), nh - 1);

  useEffect(() => {
    if (!im) return;
    try {
      const c = (probe.current ??= document.createElement("canvas"));
      c.width = c.height = 1;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.clearRect(0, 0, 1, 1);
      ctx.drawImage(im, px, py, 1, 1, 0, 0, 1, 1);
      setColor(hex(ctx.getImageData(0, 0, 1, 1).data));
    } catch {
      setColor(null); // tainted or not decoded
    }
  }, [im, px, py]);

  const x = Math.round(cursor.x + PAD + SIZE > innerWidth ? cursor.x - PAD - SIZE : cursor.x + PAD);
  const y = Math.round(cursor.y + PAD + SIZE + LABEL_H > innerHeight ? cursor.y - PAD - SIZE - LABEL_H : cursor.y + PAD);
  const c = SIZE / 2;

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-30 flex flex-col items-center gap-1.5" style={{ width: SIZE, transform: `translate3d(${x}px,${y}px,0)` }}>
      <div className="relative overflow-hidden rounded-full" style={{ width: SIZE, height: SIZE, background: "#111", boxShadow: "0 0 0 3px #fff, 0 0 0 4px rgba(0,0,0,.25), 0 8px 24px rgba(0,0,0,.4)" }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("${src}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${nw * ZOOM}px ${nh * ZOOM}px`,
            backgroundPosition: `${c - (px + 0.5) * ZOOM}px ${c - (py + 0.5) * ZOOM}px`,
            imageRendering: "pixelated",
          }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, ${GRID} 1px, transparent 1px), linear-gradient(to bottom, ${GRID} 1px, transparent 1px)`, backgroundSize: `${ZOOM}px ${ZOOM}px` }} />
        <div className="absolute top-0 h-full w-px" style={{ left: c - 0.5, background: LINE }} />
        <div className="absolute left-0 h-px w-full" style={{ top: c - 0.5, background: LINE }} />
        <div className="absolute" style={{ left: c - ZOOM / 2, top: c - ZOOM / 2, width: ZOOM, height: ZOOM, boxShadow: "inset 0 0 0 1px #fff, 0 0 0 1px rgba(0,0,0,.7)" }} />
      </div>
      <div className="hud tabular flex flex-col items-center px-2.5 py-1 backdrop-blur-xl" style={{ borderRadius: "var(--r-md)" }}>
        <span className="t-caption tabular font-semibold" style={{ color: "var(--hud-fg)" }}>x: {px}&nbsp;&nbsp;y: {py}</span>
        {color && (
          <span className="t-caption flex items-center gap-1" style={{ color: "var(--hud-fg-2)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: "0 0 0 0.5px rgba(255,255,255,.5)" }} />
            {color}
          </span>
        )}
      </div>
    </div>
  );
}
