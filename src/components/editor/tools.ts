import {
  ArrowUpRight, Circle, Crop, Droplets, Frame, Grid3x3, Highlighter, MousePointer2, Pencil, Slash, Smile, Square, Type,
} from "lucide-react";
import type { Tool } from "./types";

export type ToolDef = { id: Tool; icon: React.ElementType; label: string; key: string; fill?: boolean };

/** CleanShot order, grouped by intent: pointer | shapes | text | redaction & framing | marks. Crop lives outside the pill. */
export const TOOL_GROUPS: ToolDef[][] = [
  [{ id: "select", icon: MousePointer2, label: "Select", key: "v", fill: true }],
  [
    { id: "rect", icon: Square, label: "Rectangle", key: "r" },
    { id: "filled", icon: Square, label: "Filled rectangle", key: "f", fill: true },
    { id: "ellipse", icon: Circle, label: "Ellipse", key: "e" },
    { id: "line", icon: Slash, label: "Line", key: "l" },
    { id: "arrow", icon: ArrowUpRight, label: "Arrow", key: "a" },
  ],
  [{ id: "text", icon: Type, label: "Text", key: "t" }],
  [
    { id: "pixelate", icon: Grid3x3, label: "Pixelate", key: "x" },
    { id: "blur", icon: Droplets, label: "Blur", key: "b" },
    { id: "spotlight", icon: Frame, label: "Spotlight", key: "s" },
  ],
  [
    { id: "counter", icon: Circle, label: "Counter", key: "n" },
    { id: "pen", icon: Pencil, label: "Pen", key: "p" },
    { id: "highlighter", icon: Highlighter, label: "Highlighter", key: "h" },
    { id: "emoji", icon: Smile, label: "Emoji", key: "j" },
  ],
];
export const CROP: ToolDef = { id: "crop", icon: Crop, label: "Crop", key: "c" };
export const TOOLS: ToolDef[] = [...TOOL_GROUPS.flat(), CROP];
