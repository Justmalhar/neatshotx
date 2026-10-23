import { useEffect, useRef, useState, type RefObject } from "react";
import type { Pt } from "./geometry";

const ZOOM = 8;
const N = 15; // odd: the center source pixel lands exactly in the middle
const SIZE = N * ZOOM;
const PAD = 24;
const LABEL_H = 30;

const hex = (d: Uint8ClampedArray) => "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

/** Pixel magnifier + hex of the pixel under the cursor. Color is skipped if the canvas is tainted. */
export default function Loupe({ cursor, img, scale }: { cursor: Pt; img: RefObject<HTMLImageElement | null>; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    const c = ref.current, im = img.current;
    if (!c || !im) return;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const px = Math.floor(cursor.x * scale), py = Math.floor(cursor.y * scale);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(im, px - (N - 1) / 2, py - (N - 1) / 2, N, N, 0, 0, SIZE, SIZE);
    try {
      setColor(hex(ctx.getImageData(SIZE / 2 - 1, SIZE / 2 - 1, 1, 1).data));
    } catch {
      setColor(null); // tainted
    }
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.lineWidth = 1;
    ctx.strokeRect(SIZE / 2 - ZOOM / 2 + 0.5, SIZE / 2 - ZOOM / 2 + 0.5, ZOOM - 1, ZOOM - 1);
    ctx.strokeStyle = "rgba(0,0,0,.6)";
    ctx.strokeRect(SIZE / 2 - ZOOM / 2 - 0.5, SIZE / 2 - ZOOM / 2 - 0.5, ZOOM + 1, ZOOM + 1);
  }, [cursor, img, scale]);

  const x = cursor.x + PAD + SIZE > innerWidth ? cursor.x - PAD - SIZE : cursor.x + PAD;
  const y = cursor.y + PAD + SIZE + LABEL_H > innerHeight ? cursor.y - PAD - SIZE - LABEL_H : cursor.y + PAD;

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-30 flex flex-col items-center gap-1.5" style={{ width: SIZE, transform: `translate3d(${x}px,${y}px,0)` }}>
      <div className="overflow-hidden rounded-full border-2 border-white/90" style={{ width: SIZE, height: SIZE, boxShadow: "0 8px 30px rgba(0,0,0,.4)" }}>
        <canvas ref={ref} width={SIZE} height={SIZE} />
      </div>
      {color && (
        <div className="mat-hud t-caption tabular flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ color: "#fff" }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: "0 0 0 0.5px rgba(255,255,255,.5)" }} />
          {color}
        </div>
      )}
    </div>
  );
}
