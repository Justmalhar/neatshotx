import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { materialize } from "../../lib/motion";

/** Dark HUD surface that materializes in; background is a window drag region. */
export function HudPill({ children, className = "", radius = "9999px" }: { children: ReactNode; className?: string; radius?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      data-tauri-drag-region
      className={`mat-hud flex h-full w-full select-none items-center ${className}`}
      style={{ borderRadius: radius }}
      initial={reduce ? { opacity: 0 } : materialize.initial}
      animate={reduce ? { opacity: 1 } : materialize.animate}
      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}
