import { type ReactNode } from "react";
import { motion } from "motion/react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { spring } from "../../lib/motion";
import { EMOJIS, SIZES, type TextFont, type TextStyle, type Tool } from "./types";
import { FONTS, textCss } from "./text";
import ColorWell from "./ColorWell";
import Popover from "./Popover";
import { CHEVRON, ICON } from "./IconButton";
import ArrowGlyph from "./ArrowGlyph";
import { ARROW_STYLES, type ArrowStyle } from "./arrows";

export type StyleValues = { color: string; size: number; emoji: string; textStyle: TextStyle; font: TextFont; counterStart: number; arrowStyle: ArrowStyle; arrowInverse: boolean };
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

const TEXT_STYLES: { id: TextStyle; label: string }[] = [
  { id: "plain", label: "Plain" }, { id: "outline", label: "Outline" }, { id: "solid", label: "Solid" }, { id: "translucent", label: "Translucent" },
];
const FONT_OPTS: { id: TextFont; label: string }[] = [
  { id: "system", label: "System" }, { id: "rounded", label: "Rounded" }, { id: "mono", label: "Mono" }, { id: "serif", label: "Serif" },
];

function StrokePicker({ kind, size, onChange }: { kind: Tool; size: number; onChange: (n: number) => void }) {
  const glyph = kind === "text" || kind === "emoji" || kind === "counter";
  const names = ["Small", "Medium", "Large"];
  const mark = (n: number, i: number) => glyph
    ? <span className="font-semibold leading-none" style={{ fontSize: 10 + i * 3 }}>{kind === "counter" ? "1" : kind === "emoji" ? "☺" : "Aa"}</span>
    : <span className="w-4 -rotate-[35deg] rounded-full bg-current" style={{ height: n }} />;
  return (
    <Popover trigger={({ open, toggle }) => (
      <button className="ns-capsule gap-1" title={glyph ? "Size" : "Stroke size"} aria-label="Size" aria-pressed={open} onClick={toggle}>
        <span className="grid h-4 w-[18px] place-items-center">{mark(size, SIZES.indexOf(size))}</span>
        <ChevronDown {...CHEVRON} />
      </button>
    )}>
      {(close) => (
        <div className="flex w-[148px] flex-col gap-0.5">
          {SIZES.map((n, i) => (
            <button key={n} aria-pressed={size === n} onClick={() => { onChange(n); close(); }}
              className="ns-tool !flex w-full !justify-between !px-2">
              <span className="t-body">{names[i]}</span>
              <span className="grid h-4 w-9 place-items-center">{mark(n, i)}</span>
            </button>
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
  if (SIZE.includes(kind)) items.push(<StrokePicker kind={kind} size={v.size} onChange={(size) => onChange({ size })} />);
  if (kind === "arrow") items.push(
    <Popover trigger={({ open, toggle }) => (
      <button className="ns-capsule gap-1" title="Arrow style" aria-label="Arrow style" aria-pressed={open} onClick={toggle}>
        <ArrowGlyph style={v.arrowStyle} inverse={v.arrowInverse} className="h-4 w-[30px]" />
        <ChevronDown {...CHEVRON} />
      </button>
    )}>
      {() => (
        <div className="flex w-[210px] flex-col gap-2">
          <div className="grid grid-cols-2 gap-1">
            {ARROW_STYLES.map((a) => (
              <motion.button key={a.id} whileTap={{ scale: 0.96 }} transition={spring.press} aria-label={a.label} title={a.label}
                onClick={() => onChange({ arrowStyle: a.id })} aria-pressed={v.arrowStyle === a.id}
                className="grid h-10 place-items-center rounded-[var(--r-sm)] text-[var(--label)]"
                style={{ boxShadow: v.arrowStyle === a.id ? "inset 0 0 0 2px var(--accent)" : "inset 0 0 0 0.5px var(--separator)" }}>
                <ArrowGlyph style={a.id} inverse={v.arrowInverse} />
              </motion.button>
            ))}
          </div>
          <label className="t-body flex items-center gap-2 px-1">
            <input type="checkbox" className="ns-check" checked={v.arrowInverse} onChange={(e) => onChange({ arrowInverse: e.target.checked })} />
            Inverse direction
          </label>
        </div>
      )}
    </Popover>,
  );
  if (kind === "text") items.push(
    <Popover trigger={({ open, toggle }) => (
      <button className="ns-capsule gap-1" title="Text style" aria-label="Text style" aria-pressed={open} onClick={toggle}>
        <span className="rounded-[var(--r-xs)] px-1 font-bold leading-[18px]" style={{ ...textCss(v.textStyle, v.color, 13), fontSize: 13, fontFamily: FONTS[v.font] }}>Aa</span>
        <ChevronDown {...CHEVRON} />
      </button>
    )}>
      {() => (
        <div className="flex w-[228px] flex-col gap-2">
          <div className="grid grid-cols-2 gap-1">
            {TEXT_STYLES.map((t) => (
              <motion.button key={t.id} whileTap={{ scale: 0.96 }} transition={spring.press} aria-label={t.label} title={t.label}
                aria-pressed={v.textStyle === t.id} onClick={() => onChange({ textStyle: t.id })}
                className="grid h-11 place-items-center rounded-[var(--r-sm)]"
                style={{ boxShadow: v.textStyle === t.id ? "inset 0 0 0 2px var(--accent)" : "inset 0 0 0 0.5px var(--separator)", background: "color-mix(in srgb, var(--label) 8%, transparent)" }}>
                <span className="px-2 py-0.5 font-bold leading-6" style={{ ...textCss(t.id, v.color, 18), fontSize: 18, fontFamily: FONTS[v.font], borderRadius: 999 }}>Aa</span>
              </motion.button>
            ))}
          </div>
          <div className="flex gap-0.5 rounded-[var(--r-sm)] bg-[var(--fill)] p-0.5" role="group" aria-label="Font">
            {FONT_OPTS.map((f) => (
              <button key={f.id} onClick={() => onChange({ font: f.id })} aria-pressed={v.font === f.id} title={f.label} aria-label={f.label}
                className="relative grid h-6 flex-1 place-items-center rounded-[var(--r-xs)] font-bold" style={{ fontFamily: FONTS[f.id], fontSize: 13 }}>
                {v.font === f.id && <motion.span layoutId="font-pill" transition={spring.ui} className="absolute inset-0 rounded-[var(--r-xs)] bg-[var(--bg-content)]" style={{ boxShadow: "var(--shadow-sm)" }} />}
                <span className="relative">Aa</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>,
  );
  if (kind === "counter") items.push(
    <div className="ns-capsule !gap-0 !px-1">
      <span className="t-callout px-2">Start</span>
      <button className="ns-tool !h-6 !min-w-6 !rounded-full !px-0" aria-label="Decrease" title="Decrease" onClick={() => onChange({ counterStart: Math.max(0, v.counterStart - 1) })}><Minus {...ICON} size={14} /></button>
      <span className="tabular w-5 text-center">{v.counterStart}</span>
      <button className="ns-tool !h-6 !min-w-6 !rounded-full !px-0" aria-label="Increase" title="Increase" onClick={() => onChange({ counterStart: v.counterStart + 1 })}><Plus {...ICON} size={14} /></button>
    </div>,
  );
  if (kind === "emoji") items.push(
    <Popover trigger={({ open, toggle }) => (
      <button className="ns-capsule gap-1" title="Change emoji" aria-label="Change emoji" aria-pressed={open} onClick={toggle}>
        <span className="leading-none" style={{ fontSize: 16 }}>{v.emoji}</span><ChevronDown {...CHEVRON} />
      </button>
    )}>
      {(close) => (
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((e) => (
            <button key={e} className="ns-tool !size-8 !px-0" style={{ fontSize: 18 }} onClick={() => { onChange({ emoji: e }); close(); }}>{e}</button>
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
        : <span className="t-callout truncate px-2">{hint}</span>}
    </motion.div>
  );
}
