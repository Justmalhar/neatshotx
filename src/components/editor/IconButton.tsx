import type { ReactNode } from "react";
import Tip from "./Tip";

/** CleanShot-style capsule: white pill, soft shadow, 32px tall. Press feedback is instant. */
export const cap =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full bg-[var(--bg-content)] text-[13px] font-medium text-[var(--label)] " +
  "shadow-[var(--shadow-sm)] transition-[background-color,transform,opacity] duration-100 hover:bg-[color-mix(in_srgb,var(--bg-content)_88%,var(--label))] " +
  "active:scale-95 disabled:pointer-events-none disabled:opacity-35 " +
  "focus-visible:outline-[3px] focus-visible:outline-[color-mix(in_srgb,var(--accent)_45%,transparent)]";
export const capIcon = cap + " w-10";
export const capOn = "!bg-[var(--accent)] !text-white";
export const capPrimary = cap + " px-4 !bg-[var(--accent)] !text-white hover:!bg-[color-mix(in_srgb,var(--accent)_88%,black)]";

export const ICON = { size: 18, strokeWidth: 2.25 } as const;

/** 0.5px hairline between tool groups; doubles as a drag handle. */
export const Sep = () => <span data-tauri-drag-region className="mx-0.5 h-4 w-[0.5px] shrink-0 bg-[var(--separator)]" />;

export function CapButton({ icon, label, kbd, onClick, disabled, active, side, align, round }: {
  icon: ReactNode; label: string; kbd?: string; onClick: () => void; disabled?: boolean; active?: boolean;
  side?: "bottom" | "top"; align?: "center" | "end"; round?: boolean;
}) {
  return (
    <Tip label={label} kbd={kbd} side={side} align={align}>
      <button className={(round ? cap + " w-8" : capIcon) + (active ? " " + capOn : "")} aria-label={label} aria-pressed={active}
        disabled={disabled} onClick={onClick}>{icon}</button>
    </Tip>
  );
}
