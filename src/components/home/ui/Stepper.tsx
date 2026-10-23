import { Minus, Plus } from "lucide-react";

export default function Stepper({ value, min, max, onChange, unit }: { value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  return (
    <span className="flex items-center gap-1.5">
      <input className="input w-14 text-right tabular-nums" type="number" min={min} max={max} value={value} onChange={(e) => onChange(clamp(+e.target.value))} />
      {unit && <span className="t-caption">{unit}</span>}
      <span className="flex overflow-hidden rounded-[var(--r-sm)] bg-[var(--bg-content)] shadow-[var(--shadow-sm)]">
        <button type="button" aria-label="Decrease" className="btn btn-icon !h-[26px] !w-6 !rounded-none" onClick={() => onChange(clamp(value - 1))}><Minus size={12} /></button>
        <button type="button" aria-label="Increase" className="btn btn-icon !h-[26px] !w-6 !rounded-none" onClick={() => onChange(clamp(value + 1))}><Plus size={12} /></button>
      </span>
    </span>
  );
}
