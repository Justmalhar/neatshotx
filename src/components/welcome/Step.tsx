import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "../../lib/motion";

/** One onboarding step: a row inside the Welcome `.ns-group` (numbered badge, title, explanation, optional action). */
export default function Step({ n, title, children, action, delay = 0 }: { n: number; title: string; children: ReactNode; action?: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.ui, delay: reduce ? 0 : delay }}
      className="flex gap-3 p-4">
      <span className="t-caption mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-[var(--r-full)] bg-[var(--accent)] !text-[var(--accent-fg)]">{n}</span>
      <div className="min-w-0 flex-1">
        <h2 className="t-headline">{title}</h2>
        <div className="t-callout mt-1">{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </motion.section>
  );
}
