import { motion } from "motion/react";

/** Single keyboard-key chip. */
export function KeyCap({ children, delay = 0, reduce }: { children: string; delay?: number; reduce?: boolean | null }) {
  return (
    <motion.span
      className="mat-hud inline-flex h-12 min-w-12 items-center justify-center rounded-xl px-3 text-2xl font-semibold"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.3, delay }}
    >
      {children}
    </motion.span>
  );
}
