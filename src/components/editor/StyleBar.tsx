import { Fragment, type ReactNode } from "react";
import { motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { spring } from "../../lib/motion";
import { EMOJIS, SIZES, type Tool } from "./types";
import ColorWell from "./ColorWell";
import Popover from "./Popover";
import Tip from "./Tip";

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
const Sep = () => <span className="mx-1 h-4 w-px bg-[var(--separator)]" />;
const Label = ({ children }: { children: ReactNode }) => <span className="t-caption mr-1">{children}</span>;

function SizeButton({ kind, size, onChange }: { kind: Tool; size: number; onChange: (n: number) => void }) {
  const glyph = kind === "text" || kind === "emoji" || kind === "counter";
  const names = ["Small", "Medium", "Large"];
  const mark = (n: number, i: number) => glyph
    ? <span className="font-semibold leading-none" style={{ fontSize: 10 + i * 3 }}>{kind === "counter" ? "1" : kind === "emoji" ? "☺" : "Aa"}</span>
    : <span className="w-8 rounded-full bg-current" style={{ height: n }} />;
  return (
    <Popover trigger={({ open, toggle }) => (
      <Tip label={glyph ? "Size" : "Stroke size"}>
        <button className="btn !px-2" style={open ? { background: "var(--fill)" } : undefined} onClick={toggle} aria-label="Size">
          <span className="grid h-4 w-7 place-items-center">{mark(size, SIZES.indexOf(size))}</span>
        </button>
      </Tip>
    )}>
      {(close) => (
        <div className="flex w-[148px] flex-col">
          {SIZES.map((n, i) => (
            <motion.button key={n} whileTap={{ scale: 0.97 }} transition={spring.press} onClick={() => { onChange(n); close(); }}
              className="btn justify-between !px-2" data-active={size === n}>
              <span className="text-xs">{names[i]}</span>
              <span className="grid h-4 w-9 place-items-center">{mark(n, i)}</span>
            </motion.button>
          ))}
        </div>
      )}
    </Popover>
  );
}

export default function StyleBar({ kind, v, onChange }: { kind: Tool; v: StyleValues; onChange: (p: StylePatch) => void }) {
  const hint = HINT[kind];
  const items: ReactNode[] = [];
  if (COLOR.includes(kind)) items.push(<ColorWell color={v.color} onChange={(color) => onChange({ color })} />);
  if (SIZE.includes(kind)) items.push(<SizeButton kind={kind} size={v.size} onChange={(size) => onChange({ size })} />);
  if (kind === "text") items.push(
    <div className="flex items-center rounded-[7px] bg-[var(--fill)] p-0.5">
      {(["none", "solid"] as const).map((b) => (
        <Tip key={b} label={b === "none" ? "No background" : "Solid background"}>
          <button onClick={() => onChange({ textBg: b })} aria-pressed={v.textBg === b}
            className="relative grid h-6 w-9 place-items-center rounded-[5px] text-xs font-bold">
            {v.textBg === b && <motion.span layoutId="textbg-pill" transition={spring.ui} className="absolute inset-0 rounded-[5px] bg-[var(--bg-content)]" style={{ boxShadow: "var(--shadow-sm)" }} />}
            <span className="relative rounded px-1" style={b === "solid" ? { background: v.color, color: "#fff", mixBlendMode: "normal" } : undefined}>Aa</span>
          </button>
        </Tip>
      ))}
    </div>,
  );
  if (kind === "counter") items.push(
    <div className="flex items-center">
      <Label>Start at</Label>
      <button className="btn btn-icon" aria-label="Decrease" onClick={() => onChange({ counterStart: Math.max(0, v.counterStart - 1) })}><Minus size={13} /></button>
      <span className="tabular w-6 text-center text-[13px] font-medium">{v.counterStart}</span>
      <button className="btn btn-icon" aria-label="Increase" onClick={() => onChange({ counterStart: v.counterStart + 1 })}><Plus size={13} /></button>
    </div>,
  );
  if (kind === "emoji") items.push(
    <Popover trigger={({ toggle }) => (
      <button className="btn !px-2" onClick={toggle}><span className="text-base leading-none">{v.emoji}</span><Label>Change</Label></button>
    )}>
      {(close) => (
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((e) => (
            <button key={e} className="btn btn-icon !h-8 !w-8 text-lg" onClick={() => { onChange({ emoji: e }); close(); }}>{e}</button>
          ))}
        </div>
      )}
    </Popover>,
  );
  return (
    <motion.div key={kind} initial={{ y: -3 }} animate={{ y: 0 }} transition={spring.ui}
      className="flex min-h-7 items-center gap-0.5">
      {items.length
        ? items.map((n, i) => <Fragment key={i}>{i > 0 && <Sep />}{n}</Fragment>)
        : <span className="t-caption px-2">{hint}</span>}
    </motion.div>
  );
}
