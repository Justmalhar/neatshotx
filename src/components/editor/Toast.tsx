import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { materialize, spring } from "../../lib/motion";

export default function Toast({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <div className="pointer-events-none absolute top-4 left-1/2 z-40 -translate-x-1/2">
          <motion.div key={text} {...materialize} transition={spring.ui}
            className="mat-hud flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium">
            <Check size={14} className="text-[var(--success)]" />{text}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
