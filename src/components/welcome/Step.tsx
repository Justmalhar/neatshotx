import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "../../lib/motion";

/** One onboarding step: numbered badge, title, explanation, optional action area. */
export default function Step({ n, title, children, action, delay = 0 }: { n: number; title: string; children: ReactNode; action?: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.ui, delay: reduce ? 0 : delay }}
      className="flex gap-3 rounded-[var(--r-lg)] bg-[var(--bg-content)] p-3.5 shadow-[var(--shadow-sm)]">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[12px] font-semibold text-white">{n}</span>
      <div className="min-w-0 flex-1">
        <h2 className="t-headline">{title}</h2>
        <div className="t-callout mt-0.5">{children}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </motion.section>
  );
}
