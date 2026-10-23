import Konva from "konva";
import type { CSSProperties } from "react";
import type { Shape, TextFont, TextStyle } from "./types";

export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif";

export const FONTS: Record<TextFont, string> = {
  system: FONT,
  rounded: `ui-rounded, 'SF Pro Rounded', ${FONT}`,
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  serif: "ui-serif, 'New York', Georgia, serif",
};

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

export function measure(text: string, fontSize: number, font: TextFont = "system") {
  const t = new Konva.Text({ text, fontSize, fontStyle: "bold", fontFamily: FONTS[font] });
  return { w: t.width(), h: t.height() };
}

/** Pill padding for the solid text background, in the same units as `fontSize`. */
export const pill = (fs: number) => ({ px: fs * 0.6, py: fs * 0.3, r: fs * 0.7 });

/** Resolved look of a text style: pill background (if any), text fill, and outline stroke (if any). */
export function textLook(style: TextStyle = "plain", color: string) {
  switch (style) {
    case "solid": return { pill: true, bg: color, fg: contrast(color), stroke: undefined };
    case "translucent": return { pill: true, bg: "rgba(0,0,0,.55)", fg: "#ffffff", stroke: undefined };
    case "outline": return { pill: false, bg: "transparent", fg: color, stroke: contrast(color) };
    default: return { pill: false, bg: "transparent", fg: color, stroke: undefined };
  }
}

/** Outline stroke width as a fraction of the font size (half of it shows outside the glyphs). */
export const OUTLINE = 0.2;

/** CSS equivalent of the canvas rendering, for the textarea and previews. `px` is the on-screen font size. */
export function textCss(style: TextStyle = "plain", color: string, px: number): CSSProperties {
  const l = textLook(style, color);
  return {
    color: l.fg, background: l.bg,
    textShadow: style === "plain" ? `0 ${px * 0.04}px ${px * 0.12}px rgba(0,0,0,.45)` : undefined,
    ...(l.stroke ? { WebkitTextStroke: `${px * OUTLINE}px ${l.stroke}`, paintOrder: "stroke fill" } : {}),
  };
}
