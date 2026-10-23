import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Camera, Command, History, Info, MousePointerSquareDashed, Settings, Video, type LucideIcon } from "lucide-react";
import { spring } from "../../lib/motion";

export const TABS = [
  { id: "general", label: "General", Icon: Settings },
  { id: "shortcuts", label: "Shortcuts", Icon: Command },
  { id: "quick-access", label: "Quick Access", Icon: MousePointerSquareDashed },
  { id: "recording", label: "Recording", Icon: Video },
  { id: "screenshots", label: "Screenshots", Icon: Camera },
  { id: "history", label: "History", Icon: History },
  { id: "about", label: "About", Icon: Info },
] as const satisfies readonly { id: string; label: string; Icon: LucideIcon }[];
export type Tab = (typeof TABS)[number]["id"];

export const isMac = /Mac/.test(navigator.platform);

/** Unified preferences toolbar: drag region, centered title (macOS), icon-over-label tabs. */
export default function Toolbar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const id = useId();
  const reduce = useReducedMotion();
  const cur = TABS.find((t) => t.id === tab)!;
  return (
    <header data-tauri-drag-region className="shrink-0 border-b border-[var(--separator)] bg-[var(--bg-window)]">
      {isMac && <div data-tauri-drag-region className="t-headline grid h-[30px] place-items-center pt-1">{cur.label}</div>}
      <nav data-tauri-drag-region className={`flex justify-center gap-0.5 px-3 pb-2 ${isMac ? "pt-1" : "pt-2"}`} role="tablist">
        {TABS.map(({ id: t, label, Icon }) => {
          const on = t === tab;
          return (
            <button key={t} role="tab" aria-selected={on} onClick={() => onTab(t)}
              className={`relative flex w-[80px] flex-col items-center gap-0.5 rounded-[8px] px-1 pb-1 pt-1.5 text-[11px] outline-none transition-colors active:opacity-70 focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${on ? "text-[var(--accent)]" : "text-[var(--label-2)] hover:text-[var(--label)]"}`}>
              {on && <motion.span layoutId={id} transition={reduce ? { duration: 0 } : spring.ui} className="absolute inset-0 rounded-[8px] bg-[var(--fill)]" />}
              <Icon size={26} strokeWidth={1.5} className="relative" />
              <span className="relative whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
