import Konva from "konva";
import type { Shape } from "./types";

export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif";

/** Font size (image px) for a text/emoji shape. */
export const fontOf = (s: Shape, unit: number) =>
  s.fontSize ?? (s.kind === "emoji" ? 18 * s.size * unit : 8 * s.size * unit + 10 * unit);

/** Black or white, whichever reads better on `hex`. */
export function contrast(hex: string) {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#111111" : "#ffffff";
}

export function measure(text: string, fontSize: number) {
  const t = new Konva.Text({ text, fontSize, fontStyle: "bold", fontFamily: FONT });
  return { w: t.width(), h: t.height() };
}

/** Pill padding for the solid text background, in the same units as `fontSize`. */
export const pill = (fs: number) => ({ px: fs * 0.6, py: fs * 0.3, r: fs * 0.7 });
