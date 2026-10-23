import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { param } from "../lib/api";
import { spring } from "../lib/motion";
import Toolbar, { TABS, type Tab } from "../components/home/Toolbar";
import History from "../components/home/History";
import { useSettings } from "../components/home/useSettings";
import General from "../components/home/panes/General";
import Shortcuts from "../components/home/panes/Shortcuts";
import QuickAccess from "../components/home/panes/QuickAccess";
import Recording from "../components/home/panes/Recording";
import Screenshots from "../components/home/panes/Screenshots";
import About from "../components/home/panes/About";

const toTab = (t: string | null): Tab => (t === "settings" ? "general" : TABS.some((x) => x.id === t) ? (t as Tab) : "history");

export default function Home() {
  const [tab, setTab] = useState<Tab>(toTab(param("tab")));
  const ctl = useSettings();
  const reduce = useReducedMotion();

  useEffect(() => {
    const un = getCurrentWebviewWindow().listen<string>("nav", (e) => setTab(toTab(e.payload)));
    const key = (e: KeyboardEvent) => {
      const t = TABS[+e.key - 1];
      if ((e.metaKey || e.ctrlKey) && t) { e.preventDefault(); setTab(t.id); }
    };
    window.addEventListener("keydown", key);
    return () => { un.then((f) => f()); window.removeEventListener("keydown", key); };
  }, []);

  const body = !ctl ? null
    : tab === "history" ? <History {...ctl} />
    : tab === "about" ? <About />
    : tab === "general" ? <General {...ctl} />
    : tab === "shortcuts" ? <Shortcuts {...ctl} />
    : tab === "quick-access" ? <QuickAccess {...ctl} />
    : tab === "recording" ? <Recording {...ctl} />
    : <Screenshots {...ctl} />;

  return (
    <div className="flex h-full flex-col bg-[var(--bg-window)]">
      <Toolbar tab={tab} onTab={setTab} />
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={tab} className={`mx-auto px-6 pb-10 pt-6 ${tab === "history" ? "max-w-[920px]" : "max-w-[640px]"}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={reduce ? { duration: 0.1 } : spring.ui}>
            {body}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {ctl?.saved && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="t-caption mat-regular pointer-events-none fixed bottom-3 right-4 flex items-center gap-1 rounded-full px-2.5 py-1">
              <Check size={11} />Saved
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
