import { type ReactNode } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { spring } from "../../lib/motion";
import { ASPECTS, COLORS, GRADIENTS, type Aspect, type Background } from "./types";

const Row = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-1.5 px-3 py-2.5">{children}</div>;
const Head = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex items-baseline justify-between"><span className="t-body">{label}</span>{value && <span className="t-caption tabular">{value}</span>}</div>
);

/** Inspector side panel: grouped rows, labeled sliders, fill swatches. */
export default function BackgroundPanel({ bg, setBg, onClose }: { bg: Background; setBg: (b: Background) => void; onClose: () => void }) {
  const set = (p: Partial<Background>) => setBg({ ...bg, ...p });
  const ring = (on: boolean) => (on ? "0 0 0 2px var(--bg-content), 0 0 0 4px var(--accent)" : "inset 0 0 0 0.5px rgba(0,0,0,.15)");
  return (
    <motion.aside initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 32 }} transition={spring.ui}
      className="mat-regular m-2 ml-0 flex w-[272px] shrink-0 flex-col gap-3 overflow-y-auto rounded-[var(--r-xl)] p-3">
      <div className="flex items-center justify-between px-1">
        <span className="t-title">Background</span>
        <button className="btn btn-icon" aria-label="Remove background" onClick={onClose}><X size={14} /></button>
      </div>

      <div className="flex rounded-[7px] bg-[var(--fill)] p-0.5">
        {(["gradient", "color"] as const).map((m) => (
          <button key={m} onClick={() => set({ mode: m })} className="relative h-6 flex-1 rounded-[5px] text-xs font-medium capitalize">
            {bg.mode === m && <motion.span layoutId="bg-mode" transition={spring.ui} className="absolute inset-0 rounded-[5px] bg-[var(--bg-content)]" style={{ boxShadow: "var(--shadow-sm)" }} />}
            <span className="relative">{m === "color" ? "Plain color" : "Gradient"}</span>
          </button>
        ))}
      </div>

      {bg.mode === "gradient" ? (
        <div className="grid grid-cols-4 gap-2.5 px-1">
          {GRADIENTS.map(([a, b], i) => (
            <motion.button key={i} whileTap={{ scale: 0.92 }} transition={spring.press} aria-label={`Gradient ${i + 1}`} onClick={() => set({ gradient: i })}
              className="aspect-square rounded-[var(--r-md)]" style={{ background: `linear-gradient(135deg, ${a}, ${b})`, boxShadow: ring(bg.gradient === i) }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5 px-1">
          {COLORS.map((c) => (
            <motion.button key={c} whileTap={{ scale: 0.92 }} transition={spring.press} aria-label={c} onClick={() => set({ color: c })}
              className="aspect-square rounded-[var(--r-md)]" style={{ background: c, boxShadow: ring(bg.color.toLowerCase() === c) }} />
          ))}
          <label className="relative aspect-square cursor-pointer rounded-[var(--r-md)]"
            style={{ background: "conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)", boxShadow: ring(!COLORS.includes(bg.color.toLowerCase())) }}>
            <input type="color" value={bg.color} onChange={(e) => set({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
      )}

      <div className="divide-y divide-[var(--separator)] rounded-[var(--r-md)] bg-[var(--bg-grouped)]" style={{ boxShadow: "inset 0 0 0 0.5px var(--separator)" }}>
        <Row>
          <Head label="Padding" value={`${bg.padding}px`} />
          <input type="range" min={0} max={240} value={bg.padding} onChange={(e) => set({ padding: +e.target.value })} />
        </Row>
        <Row>
          <Head label="Corner radius" value={`${bg.radius}px`} />
          <input type="range" min={0} max={48} value={bg.radius} onChange={(e) => set({ radius: +e.target.value })} />
        </Row>
        <label className="flex items-center justify-between px-3 py-2.5">
          <span className="t-body">Shadow</span>
          <input type="checkbox" className="switch" checked={bg.shadow} onChange={(e) => set({ shadow: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between px-3 py-2">
          <span className="t-body">Aspect</span>
          <select className="input" value={bg.aspect} onChange={(e) => set({ aspect: e.target.value as Aspect })}>
            {(Object.keys(ASPECTS) as Aspect[]).map((a) => <option key={a} value={a}>{a === "auto" ? "Auto" : a}</option>)}
          </select>
        </label>
      </div>
    </motion.aside>
  );
}
