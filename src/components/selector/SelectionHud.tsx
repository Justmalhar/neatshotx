import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { spring, materialize } from "../../lib/motion";
import { PRESETS, type Rect } from "./geometry";

const HUD_W = 440; // estimate, only used to keep the pill on-screen
const HUD_H = 40;
const GAP = 12;

const CONFIRM: Record<string, string> = { record: "Record", scroll: "Scroll", timer: "Start", window: "Capture", area: "Capture" };

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
        className="mat-hud flex items-center gap-1 rounded-full p-1 pl-3"
        style={{ height: HUD_H }}
      >
        <span className="t-caption tabular mr-1 min-w-[84px] text-center font-medium" style={{ color: "#fff" }}>
          {Math.round(rect.w * scale)} × {Math.round(rect.h * scale)}
        </span>
        {PRESETS.map((p) => (
          <button key={p.label} className="btn !h-6 !px-2 !text-[12px] hover:bg-white/15!" data-active={ratio === p.ratio} onClick={() => onRatio(p.ratio)}>
            {p.label}
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-white/20" />
        <button className="btn btn-icon hover:bg-white/15!" aria-label="Cancel" onClick={onCancel}>
          <X size={15} />
        </button>
        <button className="btn btn-primary !h-7 rounded-full !px-3" onClick={onConfirm}>
          <Check size={14} strokeWidth={2.5} /> {CONFIRM[mode] ?? "Capture"}
        </button>
      </motion.div>
    </div>
  );
}
