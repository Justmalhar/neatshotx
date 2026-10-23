import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { spring } from "../../lib/motion";

/** Delayed HUD tooltip with an optional shortcut hint. */
export default function Tip({ label, kbd, align = "center", side = "bottom", children }: { label: string; kbd?: string; align?: "center" | "end"; side?: "bottom" | "top"; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const t = useRef<number>(0);
  const on = () => { clearTimeout(t.current); t.current = window.setTimeout(() => setShow(true), 450); };
  const off = () => { clearTimeout(t.current); setShow(false); };
  return (
    <span className="relative inline-flex" onPointerEnter={on} onPointerLeave={off} onPointerDown={off}>
      {children}
      <AnimatePresence>
        {show && (
          <span className={`pointer-events-none absolute z-[60] ${side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"} ${align === "end" ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
            <motion.span initial={{ opacity: 0, y: side === "top" ? 2 : -2, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              transition={spring.ui} style={{ transformOrigin: side === "top" ? "bottom center" : "top center" }}
              className="mat-hud flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium">
              {label}
              {kbd && <span className="rounded bg-white/15 px-1 text-[10px] opacity-80">{kbd}</span>}
            </motion.span>
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}
