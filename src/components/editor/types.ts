export type Tool =
  | "select" | "arrow" | "line" | "rect" | "filled" | "ellipse" | "pen" | "highlighter"
  | "text" | "counter" | "pixelate" | "blur" | "spotlight" | "crop" | "emoji";

export type ShapeKind = Exclude<Tool, "select" | "crop">;

/** All coordinates are in base-image pixels; (x, y) is the node offset so drag just moves it. */
export type Shape = {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  points?: number[];
  color: string;
  size: number;
  text?: string;
};

export type Background = { enabled: boolean; padding: number; gradient: number; radius: number; shadow: boolean };

export const GRADIENTS: [string, string][] = [
  ["#6366f1", "#ec4899"], ["#06b6d4", "#3b82f6"], ["#f59e0b", "#ef4444"], ["#10b981", "#14b8a6"],
  ["#1f2937", "#4b5563"], ["#f5f5f4", "#d6d3d1"], ["#a855f7", "#6366f1"], ["#fb7185", "#fdba74"],
];
export const COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#0a84ff", "#af52de", "#ffffff", "#111111"];
export const EMOJIS = ["👍", "👀", "🔥", "✅", "❌", "⚠️", "💡", "🎉", "❤️", "😂", "🤔", "👉", "⭐", "🚀", "🐛", "📌"];

/** Normalise a drag box so w/h are positive. */
export const norm = (s: Shape): Shape =>
  ["arrow", "line", "pen", "highlighter"].includes(s.kind)
    ? s
    : { ...s, x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
