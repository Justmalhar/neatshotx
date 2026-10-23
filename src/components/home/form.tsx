import type { ReactNode } from "react";

/** Native checkbox + label (+ optional caption). The control itself is the OS checkbox. */
export function CheckRow({ checked, onChange, children, caption }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; caption?: ReactNode }) {
  return (
    <label className="t-body flex items-start gap-2">
      <input type="checkbox" className="ns-check mt-[2px]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block">{children}</span>
        {caption && <span className="t-caption block">{caption}</span>}
      </span>
    </label>
  );
}

/** Native pop-up button over a <select>; numeric option values stay numeric. */
export function Select<T extends string | number>({ value, options, onChange, label, className = "" }:
  { value: T; options: [T, string][]; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <select aria-label={label} className={`ns-select ${className}`} value={value}
      onChange={(e) => onChange((typeof value === "number" ? +e.target.value : e.target.value) as T)}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

/** Preferences form row: right-aligned label column, controls left. 8px between rows. */
export function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-x-3 py-1">
      <div className="t-body text-right">{label}</div>
      <div className="flex min-w-0 flex-col items-start gap-2">{children}</div>
    </div>
  );
}

/** A group of controls: same as Row, separated from the previous group by a hairline with 16px padding. */
export function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[140px_1fr] items-baseline gap-x-3 border-t border-[var(--separator)] py-4 first:border-t-0 first:pt-0">
      <div className="t-body text-right">{label}</div>
      <div className="flex min-w-0 flex-col items-start gap-2">{children}</div>
    </section>
  );
}

export const Caption = ({ children }: { children: ReactNode }) => <p className="t-caption max-w-[380px]">{children}</p>;
