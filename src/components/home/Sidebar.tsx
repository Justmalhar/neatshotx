import { useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { motion, useReducedMotion } from "motion/react";
import { Camera, Cloud, History, Keyboard, Layers, Search, Settings, Video, Crop, type LucideIcon } from "lucide-react";
import { spring } from "../../lib/motion";

export type Tab = "history" | "general" | "capture" | "quick-access" | "recording" | "shortcuts" | "cloud";
export const TABS: { id: Tab; label: string; subtitle: string; icon: LucideIcon; color: string }[] = [
  { id: "history", label: "History", subtitle: "", icon: History, color: "#ff9f0a" },
  { id: "general", label: "General", subtitle: "Startup, saving and sounds", icon: Settings, color: "#8e8e93" },
  { id: "capture", label: "Capture", subtitle: "What happens when you take a screenshot", icon: Crop, color: "#0a84ff" },
  { id: "quick-access", label: "Quick Access", subtitle: "The floating overlay after each capture", icon: Layers, color: "#bf5af2" },
  { id: "recording", label: "Recording", subtitle: "Screen video, audio and input overlays", icon: Video, color: "#ff453a" },
  { id: "shortcuts", label: "Shortcuts", subtitle: "Global keyboard shortcuts", icon: Keyboard, color: "#5e5ce6" },
  { id: "cloud", label: "Cloud", subtitle: "Upload captures to your own server", icon: Cloud, color: "#30b0c7" },
];

export default function Sidebar({ tab, onTab, query, onQuery }: { tab: Tab; onTab: (t: Tab) => void; query: string; onQuery: (q: string) => void }) {
  const reduce = useReducedMotion();
  const search = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState("");
  useEffect(() => { getVersion().then(setVersion).catch(() => {}); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if ((e.metaKey || e.ctrlKey) && e.key === "f") { e.preventDefault(); search.current?.focus(); return; }
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (t.closest("input,select,textarea,[role=radiogroup],[role=button]") && t !== search.current) return;
      e.preventDefault();
      const i = TABS.findIndex((x) => x.id === tab);
      onTab(TABS[(i + (e.key === "ArrowDown" ? 1 : TABS.length - 1)) % TABS.length].id);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tab, onTab]);

  return (
    <aside className="mat-thick flex w-[220px] shrink-0 flex-col gap-3 border-r border-[var(--separator)] p-3 pt-4">
      <div className="flex items-center gap-2.5 px-1.5">
        <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-gradient-to-b from-[#3da0ff] to-[#0a6cff] text-white shadow-[var(--shadow-sm)]"><Camera size={19} /></span>
        <div className="leading-tight">
          <div className="t-headline text-[14px]">NeatShotX</div>
          <div className="t-caption">{version ? `Version ${version}` : "\u00a0"}</div>
        </div>
      </div>
      <label className="relative block">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--label-2)]" />
        <input ref={search} className="input w-full !pl-7" type="search" placeholder="Search" value={query} onChange={(e) => onQuery(e.target.value)} />
      </label>
      <nav className="flex flex-col gap-0.5" aria-label="Sections">
        {TABS.map(({ id, label, icon: Icon, color }) => {
          const on = tab === id && !query;
          return (
            <button key={id} onClick={() => { onQuery(""); onTab(id); }} aria-current={on ? "page" : undefined}
              className="relative flex h-8 items-center gap-2.5 rounded-[var(--r-sm)] px-2 text-left text-[13px] active:opacity-70">
              {on && <motion.span layoutId="side-pill" transition={reduce ? { duration: 0 } : spring.ui} className="absolute inset-0 rounded-[var(--r-sm)] bg-[var(--accent)]" />}
              <span className="relative grid h-[22px] w-[22px] place-items-center rounded-[6px] text-white shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" style={{ background: color }}><Icon size={13} strokeWidth={2.2} /></span>
              <span className={`relative ${on ? "font-medium text-white" : ""}`}>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
