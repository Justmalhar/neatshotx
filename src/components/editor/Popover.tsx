import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { spring } from "../../lib/motion";

type Align = "start" | "center" | "end";
const ORIGIN: Record<Align, string> = { start: "left", center: "center", end: "right" };
const POS: Record<Align, string> = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" };

/** Custom-content popover (swatches, styles, emoji). Grows from its trigger; closes on outside press / Esc. */
export default function Popover({ trigger, children, align = "center" }: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: Align;
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
          <div className={`absolute top-full z-50 mt-2 ${POS[align]}`}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={spring.ui} style={{ transformOrigin: `top ${ORIGIN[align]}`, background: "var(--bg-content)", boxShadow: "var(--shadow-md), inset 0 0 0 0.5px var(--separator)" }}
              className="rounded-[var(--r-md)] p-2">
              {typeof children === "function" ? children(close) : children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
