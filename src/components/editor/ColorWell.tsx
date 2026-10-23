import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { spring } from "../../lib/motion";
import { COLORS } from "./types";
import Popover from "./Popover";
import Tip from "./Tip";
import { cap } from "./IconButton";

/** White capsule: color dot + chevron; opens the swatch popover. */
export default function ColorWell({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <Popover trigger={({ open, toggle }) => (
      <Tip label="Color">
        <button className={cap + " w-[52px] gap-1.5"} aria-pressed={open} onClick={toggle} aria-label="Color">
          <span className="h-[18px] w-[18px] rounded-full" style={{ background: color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.22)" }} />
          <ChevronDown size={13} strokeWidth={2.5} className="text-[var(--label-2)]" />
        </button>
      </Tip>
    )}>
      <div className="flex w-[172px] flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          {COLORS.map((c) => (
            <motion.button key={c} whileTap={{ scale: 0.88 }} transition={spring.press} onClick={() => onChange(c)} aria-label={c}
              className="aspect-square rounded-full"
              style={{
                background: c,
                boxShadow: `inset 0 0 0 1px rgba(0,0,0,.2)${color.toLowerCase() === c ? ", 0 0 0 2px var(--bg-content), 0 0 0 4px var(--accent)" : ""}`,
              }} />
          ))}
        </div>
        <label className="btn btn-secondary relative !justify-start gap-2 !rounded-full">
          <span className="h-4 w-4 rounded-full" style={{ background: "conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }} />
          Custom…
          <input type="color" value={color} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
    </Popover>
  );
}
