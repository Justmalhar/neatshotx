import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Tip from "./Tip";

/** Preview-style bar button: plain 28px glyph, hover = fill, selected (aria-pressed) = pressed fill + accent tint. */
export const iconBtn =
  "grid h-7 w-7 shrink-0 place-items-center rounded-[7px] transition-[background-color,transform,opacity] duration-100 " +
  "hover:bg-[var(--fill)] active:scale-95 active:bg-[var(--fill-2)] aria-pressed:bg-[var(--fill-2)] aria-pressed:text-[var(--accent)] " +
  "disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-[3px] focus-visible:outline-[color-mix(in_srgb,var(--accent)_45%,transparent)]";

export const ICON = { size: 17, strokeWidth: 1.75 } as const;

/** 0.5px x 16px hairline; also a drag handle so empty bar space stays draggable. */
export const Sep = () => <span data-tauri-drag-region className="mx-1 h-4 w-[0.5px] shrink-0 bg-[var(--separator)]" />;

export function IconButton({ icon: Icon, label, kbd, onClick, disabled, active, align }: {
  icon: LucideIcon; label: string; kbd?: string; onClick: () => void; disabled?: boolean; active?: boolean; align?: "center" | "end";
}) {
  return (
    <Tip label={label} kbd={kbd} align={align}>
      <button className={iconBtn} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}><Icon {...ICON} /></button>
    </Tip>
  );
}

export const Group = ({ children }: { children: ReactNode }) => (
  <div data-tauri-drag-region className="flex shrink-0 items-center gap-1">{children}</div>
);
