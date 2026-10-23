import type { ReactNode } from "react";

/** Lucide props for editor chrome: 16px, 1.75 stroke (DESIGN-SYSTEM.md). */
export const ICON = { size: 16, strokeWidth: 1.75 } as const;
export const CHEVRON = { size: 14, strokeWidth: 1.75, className: "opacity-60" } as const;

/** 0.5px hairline between tool groups; doubles as a drag handle. */
export const Sep = () => <span data-tauri-drag-region className="mx-0.5 h-4 w-[0.5px] shrink-0 bg-[var(--separator)]" />;

/** Icon-only capsule: adds the native tooltip + aria label to `.ns-capsule--icon`. */
export function CapButton({ icon, label, title, onClick, active }: {
  icon: ReactNode; label: string; title?: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button className="ns-capsule ns-capsule--icon shrink-0" title={title ?? label} aria-label={label} aria-pressed={active} onClick={onClick}>{icon}</button>
  );
}
