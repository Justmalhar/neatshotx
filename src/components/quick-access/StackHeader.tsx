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
      className="hud mx-auto flex h-8 shrink-0 items-center gap-1 rounded-full p-1">
      <Pill onClick={onCloseAll}><X size={12} strokeWidth={1.75} />Close All</Pill>
      <span className="h-3 w-px" style={{ background: "var(--hud-fg-2)", opacity: 0.4 }} />
      <Pill onClick={save}>{saved ? <><Check size={12} strokeWidth={1.75} />Saved {saved}</> : <><Download size={12} strokeWidth={1.75} />Save All</>}</Pill>
    </motion.div>
  );
}

function Pill(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className="hud-btn t-body !h-6 !bg-transparent px-3 hover:!bg-white/15" />;
}
