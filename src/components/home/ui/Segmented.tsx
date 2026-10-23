import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "../../../lib/motion";

/** Segmented control with a sliding thumb. */
export default function Segmented<T extends string | number>({ value, options, onChange, label }:
  { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string }) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[var(--r-sm)] bg-[var(--fill)] p-0.5">
      {options.map(([v, l]) => (
        <button key={String(v)} role="radio" aria-checked={v === value} onClick={() => onChange(v)}
          className="relative h-6 rounded-[5px] px-3 text-[12px] font-medium transition-opacity active:opacity-70">
          {v === value && (
            <motion.span layoutId={id} transition={reduce ? { duration: 0 } : spring.ui}
              className="absolute inset-0 rounded-[5px] bg-[var(--bg-content)] shadow-[var(--shadow-sm)]" />
          )}
          <span className="relative">{l}</span>
        </button>
      ))}
    </div>
  );
}
