import type { ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

/** macOS-style checkbox: accent-filled rounded square, white check. Label sits to the right. */
export function Checkbox({ checked, onChange, children, caption }: { checked: boolean; onChange: (v: boolean) => void; children?: ReactNode; caption?: ReactNode }) {
  return (
    <label className="flex items-start gap-2">
      <span className="relative mt-[1px] grid h-[15px] w-[15px] shrink-0 place-items-center">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 m-0 appearance-none rounded-[4px] bg-[var(--bg-content)] shadow-[inset_0_0_0_0.5px_var(--label-3),var(--shadow-sm)] outline-none transition-colors checked:bg-[var(--accent)] checked:shadow-none focus-visible:outline-3 focus-visible:outline-[color-mix(in_srgb,var(--accent)_45%,transparent)] active:brightness-90" />
        <Check size={11} strokeWidth={3.5} className="pointer-events-none relative text-white opacity-0 peer-checked:opacity-100" />
      </span>
      <span>
        <span className="block leading-[17px]">{children}</span>
        {caption && <span className="t-caption block">{caption}</span>}
      </span>
    </label>
  );
}

/** Pop-up button: rounded, subtle fill, up/down chevrons. Wraps a native <select>. */
export function PopUp<T extends string | number>({ value, options, onChange, label, className = "" }:
  { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string; className?: string }) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select aria-label={label} value={value} onChange={(e) => onChange((typeof value === "number" ? +e.target.value : e.target.value) as T)}
        className="h-[22px] w-full appearance-none rounded-[6px] bg-[var(--bg-content)] pl-2 pr-6 text-[13px] shadow-[inset_0_0_0_0.5px_var(--separator),var(--shadow-sm)] outline-none focus-visible:outline-3 focus-visible:outline-[color-mix(in_srgb,var(--accent)_45%,transparent)]">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronsUpDown size={11} className="pointer-events-none absolute right-1.5 top-[5.5px] text-[var(--label-2)]" />
    </span>
  );
}

/** One preferences section: right-aligned label column + control column, hairline above (except first). */
export function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[200px_1fr] gap-x-3 border-t border-[var(--separator)] py-4 first:border-t-0 first:pt-1">
      <div className="pt-[1px] text-right font-medium">{label}</div>
      <div className="flex min-w-0 flex-col items-start gap-2">{children}</div>
    </section>
  );
}

export const Caption = ({ children }: { children: ReactNode }) => <p className="t-caption max-w-[400px]">{children}</p>;

export const Btn = ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
  <button {...p} className={`btn btn-secondary !h-[22px] !px-2.5 ${p.className ?? ""}`}>{children}</button>;
