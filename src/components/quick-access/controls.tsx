import { motion } from "motion/react";
import { spring } from "../../lib/motion";

type Btn = React.ButtonHTMLAttributes<HTMLButtonElement>;
const light = "grid place-items-center bg-[rgba(232,232,237,0.94)] text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:bg-white";

/** 24px round corner action on the card scrim. Icons inside: 12px, strokeWidth 1.75. */
export function CornerBtn({ className = "", ...props }: Btn) {
  return <motion.button type="button" whileTap={{ scale: 0.92 }} transition={spring.press} {...(props as object)} className={`${light} absolute h-6 w-6 rounded-full ${className}`} />;
}

/** 28px center pill on the card scrim. */
export function CenterPill({ className = "", ...props }: Btn) {
  return <motion.button type="button" whileTap={{ scale: 0.96 }} transition={spring.press} {...(props as object)} className={`${light} t-body h-7 min-w-16 rounded-full px-3.5 font-semibold ${className}`} style={{ color: "#1d1d1f" }} />;
}
