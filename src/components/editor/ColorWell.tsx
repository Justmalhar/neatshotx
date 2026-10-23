import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { spring } from "../../lib/motion";
import { COLORS } from "./types";
import Popover from "./Popover";
import { CHEVRON } from "./IconButton";

/** Capsule: color dot + chevron; opens the swatch popover. */
export default function ColorWell({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <Popover trigger={({ open, toggle }) => (
      <button className="ns-capsule gap-1" title="Color" aria-label="Color" aria-pressed={open} onClick={toggle}>
        <span className="size-[18px] rounded-full" style={{ background: color, boxShadow: "inset 0 0 0 0.5px var(--separator)" }} />
        <ChevronDown {...CHEVRON} />
      </button>
    )}>
      <div className="flex w-[172px] flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          {COLORS.map((c) => (
            <motion.button key={c} whileTap={{ scale: 0.9 }} transition={spring.press} onClick={() => onChange(c)} aria-label={c} title={c}
              className="aspect-square rounded-full"
              style={{
                background: c,
                boxShadow: `inset 0 0 0 0.5px var(--separator)${color.toLowerCase() === c ? ", 0 0 0 2px var(--bg-content), 0 0 0 4px var(--accent)" : ""}`,
              }} />
          ))}
        </div>
        <label className="ns-btn relative w-full !justify-start">
          <span className="size-3.5 rounded-full" style={{ background: "conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }} />
          Custom…
          <input type="color" value={color} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-default opacity-0" />
        </label>
      </div>
    </Popover>
  );
}
