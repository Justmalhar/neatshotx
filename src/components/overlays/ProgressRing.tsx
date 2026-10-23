import { motion } from "motion/react";

/** SVG ring; `progress` 0..1 drives stroke-dashoffset (animated by the caller's transition). */
export function ProgressRing({ progress, size = 160, stroke = 5, duration = 1 }: { progress: number; size?: number; stroke?: number; duration?: number }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c}
        initial={false}
        animate={{ strokeDashoffset: c * (1 - progress) }}
        transition={{ duration, ease: "linear" }}
      />
    </svg>
  );
}
