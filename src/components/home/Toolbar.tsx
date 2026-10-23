import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Camera, Command, History, Info, MousePointerSquareDashed, Settings, type LucideIcon } from "lucide-react";
import { spring } from "../../lib/motion";

export const TABS = [
  { id: "general", label: "General", Icon: Settings },
  { id: "shortcuts", label: "Shortcuts", Icon: Command },
  { id: "quick-access", label: "Quick Access", Icon: MousePointerSquareDashed },
  { id: "screenshots", label: "Screenshots", Icon: Camera },
  { id: "history", label: "History", Icon: History },
  { id: "about", label: "About", Icon: Info },
] as const satisfies readonly { id: string; label: string; Icon: LucideIcon }[];
export type Tab = (typeof TABS)[number]["id"];

export const isMac = /Mac/.test(navigator.userAgent);

/** Unified preferences toolbar: drag region, centered title (macOS overlay title bar), icon-over-label tabs. */
export default function Toolbar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const id = useId();
  const reduce = useReducedMotion();
  const cur = TABS.find((t) => t.id === tab)!;
  return (
    <header data-tauri-drag-region className="shrink-0 border-b border-[var(--separator)] bg-[var(--bg-window)]">
      {isMac && <div data-tauri-drag-region className="t-headline grid h-7 place-items-center">{cur.label}</div>}
      <nav data-tauri-drag-region className={`flex justify-center gap-1 px-3 pb-2 ${isMac ? "pt-1" : "pt-2"}`} role="tablist" aria-label="Preferences">
        {TABS.map(({ id: t, label, Icon }) => {
          const on = t === tab;
          return (
            <button key={t} role="tab" aria-selected={on} onClick={() => onTab(t)}
              className={`relative flex w-20 flex-col items-center gap-1 rounded-[var(--r-sm)] px-1 py-1 ${on ? "text-[var(--accent)]" : "text-[var(--label-2)] hover:text-[var(--label)]"}`}>
              {on && <motion.span layoutId={id} transition={reduce ? { duration: 0 } : spring.ui}
                className="absolute inset-0 rounded-[var(--r-sm)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" />}
              {/* Exception to the 16px icon rule: preferences toolbar icons are 22px (macOS toolbar convention). */}
              <Icon size={22} strokeWidth={1.75} className="relative" />
              <span className="t-caption relative whitespace-nowrap !text-inherit">{label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
