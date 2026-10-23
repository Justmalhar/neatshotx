import { useState } from "react";
import { motion } from "motion/react";
import { Check, Download, X } from "lucide-react";
import { spring, materialize } from "../../lib/motion";

export default function StackHeader({ onCloseAll, onSaveAll }: { onCloseAll: () => void; onSaveAll: () => Promise<number> }) {
  const [saved, setSaved] = useState<number | null>(null);
  const save = async () => {
    const n = await onSaveAll();
    if (n) { setSaved(n); setTimeout(() => setSaved(null), 1600); }
  };
  return (
    <motion.div {...materialize} transition={spring.ui} layout
      className="mat-hud mx-auto flex h-8 shrink-0 items-center gap-0.5 rounded-full p-0.5 text-xs font-medium">
      <Pill onClick={onCloseAll}><X size={12} />Close All</Pill>
      <span className="h-3.5 w-px bg-white/20" />
      <Pill onClick={save}>{saved ? <><Check size={12} />Saved {saved}</> : <><Download size={12} />Save All</>}</Pill>
    </motion.div>
  );
}

function Pill(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} transition={spring.press} {...(props as object)}
      className="flex h-7 items-center gap-1.5 rounded-full px-3 text-white/90 hover:bg-white/15 hover:text-white" />
  );
}
