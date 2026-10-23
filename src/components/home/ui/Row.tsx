import type { ReactNode } from "react";
import { useQuery } from "./Group";

export default function Row({ label, caption, children, keywords = "", tag = "div" }: { tag?: "div" | "label"; label: string; caption?: string; children?: ReactNode; keywords?: string }) {
  const q = useQuery().trim().toLowerCase();
  if (q && !`${label} ${keywords}`.toLowerCase().includes(q)) return null;
  const Tag = tag;
  return (
    <Tag data-row className="flex min-h-[40px] items-center gap-4 px-3.5 py-1.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[13px]">{label}</span>
        {caption && <span className="t-caption block">{caption}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">{children}</span>
    </Tag>
  );
}

export function ToggleRow({ label, caption, checked, onChange }: { label: string; caption?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row tag="label" label={label} caption={caption}>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </Row>
  );
}

export function SelectRow<T extends string | number>({ label, caption, value, options, onChange }:
  { label: string; caption?: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <Row tag="label" label={label} caption={caption}>
      <select className="input" value={value} onChange={(e) => onChange((typeof value === "number" ? +e.target.value : e.target.value) as T)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Row>
  );
}
