import {
  ArrowUpRight, Circle, Crop, Droplets, Grid3x3, Hash, Highlighter, Minus, MousePointer2, Pencil, RectangleHorizontal,
  Smile, Square, Sun, Type,
} from "lucide-react";
import type { Tool } from "./types";

export type ToolDef = { id: Tool; icon: React.ElementType; label: string; key: string };

/** Grouped by intent: pointer | shapes | marks | redaction & framing. */
export const TOOL_GROUPS: ToolDef[][] = [
  [{ id: "select", icon: MousePointer2, label: "Select", key: "v" }],
  [
    { id: "arrow", icon: ArrowUpRight, label: "Arrow", key: "a" },
    { id: "line", icon: Minus, label: "Line", key: "l" },
    { id: "rect", icon: Square, label: "Rectangle", key: "r" },
    { id: "filled", icon: RectangleHorizontal, label: "Filled rectangle", key: "f" },
    { id: "ellipse", icon: Circle, label: "Ellipse", key: "e" },
  ],
  [
    { id: "pen", icon: Pencil, label: "Pen", key: "p" },
    { id: "highlighter", icon: Highlighter, label: "Highlighter", key: "h" },
    { id: "text", icon: Type, label: "Text", key: "t" },
    { id: "counter", icon: Hash, label: "Counter", key: "n" },
    { id: "emoji", icon: Smile, label: "Emoji", key: "j" },
  ],
  [
    { id: "pixelate", icon: Grid3x3, label: "Pixelate", key: "x" },
    { id: "blur", icon: Droplets, label: "Blur", key: "b" },
    { id: "spotlight", icon: Sun, label: "Spotlight", key: "s" },
    { id: "crop", icon: Crop, label: "Crop", key: "c" },
  ],
];
export const TOOLS: ToolDef[] = TOOL_GROUPS.flat();
