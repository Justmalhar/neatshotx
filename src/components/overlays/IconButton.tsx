import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";
import { spring } from "../../lib/motion";

type Tone = "plain" | "danger" | "primary";
const TONE: Record<Tone, string> = {
  plain: "bg-white/0 hover:bg-white/15 text-white",
  danger: "bg-[var(--danger)] hover:brightness-110 text-white",
  primary: "bg-[var(--accent)] hover:brightness-110 text-white",
};

/** 28px HUD control with instant press feedback (scale on pointer-down). */
export function IconButton({
  tone = "plain", children, label, wide, active, ...rest
}: { tone?: Tone; children: ReactNode; label: string; wide?: boolean; active?: boolean }
  & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart">) {
  return (
    <motion.button
      type="button" title={label} aria-label={label}
      whileTap={{ scale: 0.92 }} transition={spring.press}
      {...rest}
      className={`inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full text-[12px] font-medium outline-none
        transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-40
        ${wide ? "px-2.5" : "w-7"} ${active ? "bg-white/25" : TONE[tone]} ${rest.className ?? ""}`}
    >
      {children}
    </motion.button>
  );
}
