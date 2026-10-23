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
  /** Explicit font size in image px (set after a resize); otherwise derived from `size`. */
  fontSize?: number;
  /** Text background style. */
  bg?: "none" | "solid";
  /** Arrow variants; undefined = "standard". */
  arrowStyle?: "standard" | "tapered" | "curved" | "double" | "line-dot";
  /** Head at the start point instead of the end. */
  arrowInverse?: boolean;
  /** Bend for curved arrows, -1…1 (default 0.35). */
  curve?: number;
};

/* ── Background (CleanShot-style). Contract shared by the editor shell and components/editor/background/*. ── */
export type BgKind = "none" | "gradient" | "wallpaper" | "blurred" | "color";
export type BgAlign = "tl" | "t" | "tr" | "l" | "c" | "r" | "bl" | "b" | "br";
export type BgRatio = "auto" | "16:9" | "4:3" | "1:1" | "9:16" | "3:2";

export type Background = {
  kind: BgKind;
  gradient: number;          // index into background/presets GRADIENT_PRESETS
  wallpaper: number;         // index into built-in wallpapers; -1 = custom
  customWallpaper?: string;  // blob/data URL when wallpaper === -1
  blurred: number;           // 0 light, 1 dark, 2 darker (blurred copy of the screenshot)
  color: string;             // plain color (or "transparent")
  padding: number;           // 0–100 slider
  inset: number;             // 0–100 slider; frame of the screenshot's edge color
  autoBalance: boolean;      // inset color sampled from the screenshot edges
  shadow: number;            // 0–100 slider
  radius: number;            // 0–100 slider (corners)
  align: BgAlign;
  ratio: BgRatio;
};

export const DEFAULT_BACKGROUND: Background = {
  kind: "none", gradient: 0, wallpaper: 0, blurred: 0, color: "#ffffff",
  padding: 40, inset: 0, autoBalance: false, shadow: 40, radius: 20, align: "c", ratio: "auto",
};

/** Canvas geometry in base-image px. Produced by background/layout.ts `layoutBackground(bg, iw, ih)`. */
export type BgLayout = {
  W: number; H: number;                                   // full canvas (stage) size
  frame: { x: number; y: number; w: number; h: number };  // screenshot + inset, rounded, shadowed
  image: { x: number; y: number };                        // top-left of the screenshot (annotation Group offset)
  radius: number;                                         // corner radius of frame in px
};

export const COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#0a84ff", "#af52de", "#ffffff", "#111111"];
export const EMOJIS = ["👍", "👀", "🔥", "✅", "❌", "⚠️", "💡", "🎉", "❤️", "😂", "🤔", "👉", "⭐", "🚀", "🐛", "📌"];
export const SIZES = [2, 4, 7];

/** Normalise a drag box so w/h are positive. */
export const norm = (s: Shape): Shape =>
  ["arrow", "line", "pen", "highlighter"].includes(s.kind)
    ? s
    : { ...s, x: Math.min(s.x, s.x + s.w), y: Math.min(s.y, s.y + s.h), w: Math.abs(s.w), h: Math.abs(s.h) };
