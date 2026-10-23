import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { materialize, spring } from "../../lib/motion";

type Align = "start" | "center" | "end";
const ORIGIN: Record<Align, string> = { start: "left", center: "center", end: "right" };
const POS: Record<Align, string> = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" };

/** Popover that materializes from its trigger (transform-origin) and dismisses on outside press / Esc. */
export default function Popover({ trigger, children, align = "center", up }: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: Align;
  /** Open above the trigger (bottom bar). */
  up?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    addEventListener("pointerdown", down, true);
    addEventListener("keydown", key, true);
    return () => { removeEventListener("pointerdown", down, true); removeEventListener("keydown", key, true); };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (
          <div className={`absolute z-50 ${up ? "bottom-full mb-2" : "top-full mt-2"} ${POS[align]}`}>
            <motion.div {...materialize} transition={spring.ui} style={{ transformOrigin: `${up ? "bottom" : "top"} ${ORIGIN[align]}` }}
              className="mat-regular rounded-[var(--r-lg)] p-2">
              {typeof children === "function" ? children(close) : children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ label, kbd, checked, onClick }: { label: string; kbd?: string; checked?: boolean; onClick: () => void }) {
  return (
    <button className="btn w-full min-w-[180px] justify-start gap-2 !px-2 text-left" onClick={onClick}>
      <span className="grid w-3.5 place-items-center">{checked && <Check size={12} />}</span>
      <span className="flex-1">{label}</span>
      {kbd && <span className="t-caption tabular">{kbd}</span>}
    </button>
  );
}
