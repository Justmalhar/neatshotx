import { useState } from "react";
import {
  ArrowUpRight, Circle, Crop, Grid3x3, Hash, Highlighter, Minus, MousePointer2, Pencil, Smile, Square,
  Type, Droplets, Sun, RectangleHorizontal,
} from "lucide-react";
import { COLORS, EMOJIS, type Tool } from "./types";

export const TOOLS: { id: Tool; icon: React.ElementType; label: string; key: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", key: "v" },
  { id: "arrow", icon: ArrowUpRight, label: "Arrow", key: "a" },
  { id: "rect", icon: Square, label: "Rectangle", key: "r" },
  { id: "filled", icon: RectangleHorizontal, label: "Filled rectangle", key: "f" },
  { id: "ellipse", icon: Circle, label: "Ellipse", key: "e" },
  { id: "line", icon: Minus, label: "Line", key: "l" },
  { id: "pen", icon: Pencil, label: "Pen", key: "p" },
  { id: "highlighter", icon: Highlighter, label: "Highlighter", key: "h" },
  { id: "text", icon: Type, label: "Text", key: "t" },
  { id: "counter", icon: Hash, label: "Counter", key: "n" },
  { id: "pixelate", icon: Grid3x3, label: "Pixelate", key: "x" },
  { id: "blur", icon: Droplets, label: "Blur", key: "b" },
  { id: "spotlight", icon: Sun, label: "Spotlight", key: "s" },
  { id: "emoji", icon: Smile, label: "Emoji", key: "j" },
  { id: "crop", icon: Crop, label: "Crop", key: "c" },
];

type Props = {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (n: number) => void;
  emoji: string;
  setEmoji: (e: string) => void;
};

export default function Toolbar({ tool, setTool, color, setColor, size, setSize, emoji, setEmoji }: Props) {
  const [picker, setPicker] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {TOOLS.map(({ id, icon: Icon, label, key }) => (
        <button key={id} className="btn !p-2" data-active={tool === id} title={`${label} (${key.toUpperCase()})`}
          onClick={() => { setTool(id); if (id === "emoji") setPicker(!picker); }}>
          {id === "emoji" ? <span className="text-sm leading-none">{emoji}</span> : <Icon size={16} />}
        </button>
      ))}
      {picker && tool === "emoji" && (
        <div className="glass absolute top-14 z-50 grid grid-cols-8 gap-1 rounded-xl p-2">
          {EMOJIS.map((e) => <button key={e} className="btn !p-1.5 text-lg" onClick={() => { setEmoji(e); setPicker(false); }}>{e}</button>)}
        </div>
      )}
      <span className="mx-1 h-6 w-px bg-current opacity-15" />
      {COLORS.map((c) => (
        <button key={c} onClick={() => setColor(c)} title={c}
          className="h-5 w-5 rounded-full border border-black/20 transition hover:scale-110"
          style={{ background: c, outline: color === c ? "2px solid var(--accent)" : "none", outlineOffset: 2 }} />
      ))}
      <span className="mx-1 h-6 w-px bg-current opacity-15" />
      {[2, 4, 7].map((n) => (
        <button key={n} className="btn !p-2" data-active={size === n} onClick={() => setSize(n)} title="Stroke size">
          <span className="rounded-full bg-current" style={{ width: n + 2, height: n + 2 }} />
        </button>
      ))}
    </div>
  );
}
