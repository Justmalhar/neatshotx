import { type ReactNode } from "react";
import { motion } from "motion/react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { spring } from "../../lib/motion";
import { EMOJIS, SIZES, type Tool } from "./types";
import ColorWell from "./ColorWell";
import Popover from "./Popover";
import Tip from "./Tip";
import { cap } from "./IconButton";

export type StyleValues = { color: string; size: number; emoji: string; textBg: "none" | "solid"; counterStart: number };
export type StylePatch = Partial<StyleValues>;

const COLOR = ["arrow", "line", "rect", "filled", "ellipse", "pen", "highlighter", "text", "counter"];
const SIZE = ["arrow", "line", "rect", "ellipse", "pen", "highlighter", "text", "counter", "emoji"];
const HINT: Partial<Record<Tool, string>> = {
  select: "Select an object to edit its style",
  pixelate: "Drag over the area to pixelate",
  blur: "Drag over the area to blur",
  spotlight: "Drag to spotlight an area",
  crop: "Drag to crop, then press Return",
};

function SizeButton({ kind, size, onChange }: { kind: Tool; size: number; onChange: (n: number) => void }) {
  const glyph = kind === "text" || kind === "emoji" || kind === "counter";
  const names = ["Small", "Medium", "Large"];
  const mark = (n: number, i: number) => glyph
    ? <span className="font-semibold leading-none" style={{ fontSize: 10 + i * 3 }}>{kind === "counter" ? "1" : kind === "emoji" ? "☺" : "Aa"}</span>
    : <span className="w-4 -rotate-[35deg] rounded-full bg-current" style={{ height: n }} />;
  return (
    <Popover trigger={({ open, toggle }) => (
      <Tip label={glyph ? "Size" : "Stroke size"}>
        <button className={cap + " w-[52px] gap-1.5"} aria-pressed={open} onClick={toggle} aria-label="Size">
          <span className="grid h-4 w-[18px] place-items-center">{mark(size, SIZES.indexOf(size))}</span>
          <ChevronDown size={13} strokeWidth={2.5} className="text-[var(--label-2)]" />
        </button>
      </Tip>
    )}>
      {(close) => (
        <div className="flex w-[148px] flex-col">
          {SIZES.map((n, i) => (
            <motion.button key={n} whileTap={{ scale: 0.97 }} transition={spring.press} onClick={() => { onChange(n); close(); }}
              className="btn justify-between !rounded-full !px-3" data-active={size === n}>
              <span className="text-xs">{names[i]}</span>
              <span className="grid h-4 w-9 place-items-center">{mark(n, i)}</span>
            </motion.button>
          ))}
        </div>
      )}
    </Popover>
  );
}

/** Contextual capsules (color, stroke, then tool extras). Falls back to a quiet hint when the tool has no style. */
export default function StyleBar({ kind, v, onChange }: { kind: Tool; v: StyleValues; onChange: (p: StylePatch) => void }) {
  const hint = HINT[kind];
  const items: ReactNode[] = [];
  if (COLOR.includes(kind)) items.push(<ColorWell color={v.color} onChange={(color) => onChange({ color })} />);
  if (SIZE.includes(kind)) items.push(<SizeButton kind={kind} size={v.size} onChange={(size) => onChange({ size })} />);
  if (kind === "text") items.push(
    <div className={cap + " gap-0 p-[3px]"}>
      {(["none", "solid"] as const).map((b) => (
        <Tip key={b} label={b === "none" ? "No background" : "Solid background"}>
          <button onClick={() => onChange({ textBg: b })} aria-pressed={v.textBg === b}
            className="relative grid h-[26px] w-9 place-items-center rounded-full text-xs font-bold">
            {v.textBg === b && <motion.span layoutId="textbg-pill" transition={spring.ui} className="absolute inset-0 rounded-full bg-[var(--fill-2)]" />}
            <span className="relative rounded px-1" style={b === "solid" ? { background: v.color, color: "#fff" } : undefined}>Aa</span>
          </button>
        </Tip>
      ))}
    </div>,
  );
  if (kind === "counter") items.push(
    <div className={cap + " gap-0 px-1"}>
      <span className="px-2 text-[12px] text-[var(--label-2)]">Start</span>
      <button className="grid h-6 w-6 place-items-center rounded-full hover:bg-[var(--fill)]" aria-label="Decrease" onClick={() => onChange({ counterStart: Math.max(0, v.counterStart - 1) })}><Minus size={13} /></button>
      <span className="tabular w-5 text-center">{v.counterStart}</span>
      <button className="grid h-6 w-6 place-items-center rounded-full hover:bg-[var(--fill)]" aria-label="Increase" onClick={() => onChange({ counterStart: v.counterStart + 1 })}><Plus size={13} /></button>
    </div>,
  );
  if (kind === "emoji") items.push(
    <Popover trigger={({ toggle }) => (
      <Tip label="Change emoji">
        <button className={cap + " w-[52px] gap-1.5"} aria-label="Change emoji" onClick={toggle}>
          <span className="text-base leading-none">{v.emoji}</span><ChevronDown size={13} strokeWidth={2.5} className="text-[var(--label-2)]" />
        </button>
      </Tip>
    )}>
      {(close) => (
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((e) => (
            <button key={e} className="btn btn-icon !h-8 !w-8 !rounded-full text-lg" onClick={() => { onChange({ emoji: e }); close(); }}>{e}</button>
          ))}
        </div>
      )}
    </Popover>,
  );
  return (
    <motion.div key={kind} initial={{ y: -3, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} transition={spring.ui}
      data-tauri-drag-region className="flex min-w-0 shrink-0 items-center gap-2">
      {items.length
        ? items.map((n, i) => <span key={i} className="inline-flex">{n}</span>)
        : <span className="t-caption truncate px-2">{hint}</span>}
    </motion.div>
  );
}
