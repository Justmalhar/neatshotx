import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { spring } from "../../lib/motion";
import { ICON } from "./IconButton";

export default function Toast({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <div className="pointer-events-none absolute top-4 left-1/2 z-40 -translate-x-1/2">
          <motion.div key={text} initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={spring.ui} className="hud t-body flex h-8 items-center gap-2 rounded-full px-4">
            <Check {...ICON} size={14} className="text-[var(--success)]" />{text}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
