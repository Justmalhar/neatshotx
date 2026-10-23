import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { spring, materialize } from "../../lib/motion";
import { PRESETS, type Rect } from "./geometry";

const HUD_W = 440; // estimate, only used to keep the pill on-screen
const HUD_H = 40;
const GAP = 12;

const CONFIRM: Record<string, string> = { scroll: "Scroll", timer: "Start", window: "Capture", area: "Capture" };

type Props = {
  rect: Rect;
  scale: number;
  mode: string;
  ratio: number | null;
  onRatio: (r: number | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Floating pill under the selection (flips above, then inside, when there's no room). */
export default function SelectionHud({ rect, scale, mode, ratio, onRatio, onConfirm, onCancel }: Props) {
  const below = rect.y + rect.h + GAP;
  const above = rect.y - GAP - HUD_H;
  const top = below + HUD_H + 8 <= innerHeight ? below : above >= 8 ? above : Math.min(rect.y + rect.h - HUD_H - GAP, innerHeight - HUD_H - 8);
  const left = Math.min(Math.max(rect.x + rect.w / 2, HUD_W / 2 + 8), innerWidth - HUD_W / 2 - 8);

  return (
    <div className="absolute z-20" data-hud style={{ left, top, transform: "translateX(-50%)" }} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <motion.div
        {...materialize}
        transition={spring.ui}
        className="hud flex items-center gap-1 rounded-full p-1 pl-3 backdrop-blur-xl backdrop-saturate-150"
        style={{ height: HUD_H }}
      >
        <span className="t-caption tabular mr-1 min-w-24 text-center" style={{ color: "var(--hud-fg)" }}>
          {Math.round(rect.w * scale)} × {Math.round(rect.h * scale)}
        </span>
        {PRESETS.map((p) => (
          <button key={p.label} className="hud-btn t-caption !h-6 !bg-transparent !px-2 hover:!bg-white/15 data-[active=true]:!bg-white/25" style={{ color: "var(--hud-fg)" }} data-active={ratio === p.ratio} onClick={() => onRatio(p.ratio)}>
            {p.label}
          </button>
        ))}
        <div className="mx-1 h-4 w-px" style={{ background: "var(--hud-fg-2)", opacity: 0.4 }} />
        <button className="hud-btn hud-btn--icon !bg-transparent hover:!bg-white/15" title="Cancel (Esc)" aria-label="Cancel" onClick={onCancel}>
          <X size={14} strokeWidth={1.75} />
        </button>
        <button className="hud-btn hud-btn--primary t-body font-semibold" onClick={onConfirm}>
          <Check size={14} strokeWidth={1.75} /> {CONFIRM[mode] ?? "Capture"}
        </button>
      </motion.div>
    </div>
  );
}
