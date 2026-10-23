import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { param } from "../lib/api";
import { spring } from "../lib/motion";
import Sidebar, { TABS, type Tab } from "../components/home/Sidebar";
import History from "../components/home/History";
import { SearchCtx } from "../components/home/ui/Group";
import { useSettings } from "../components/home/useSettings";
import General from "../components/home/panes/General";
import Capture from "../components/home/panes/Capture";
import QuickAccess from "../components/home/panes/QuickAccess";
import Recording from "../components/home/panes/Recording";
import Shortcuts from "../components/home/panes/Shortcuts";
import Cloud from "../components/home/panes/Cloud";

const PANES = { general: General, capture: Capture, "quick-access": QuickAccess, recording: Recording, shortcuts: Shortcuts, cloud: Cloud };
const toTab = (t: string | null): Tab => (t === "settings" ? "general" : TABS.some((x) => x.id === t) ? (t as Tab) : "history");

export default function Home() {
  const [tab, setTab] = useState<Tab>(toTab(param("tab")));
  const [query, setQuery] = useState("");
  const ctl = useSettings();
  const reduce = useReducedMotion();
  useEffect(() => {
    const un = getCurrentWebviewWindow().listen<string>("nav", (e) => { setQuery(""); setTab(toTab(e.payload)); });
    return () => { un.then((f) => f()); };
  }, []);

  const searching = query.trim().length > 0;
  const meta = TABS.find((t) => t.id === tab)!;
  const key = searching ? "search" : tab;

  return (
    <div className="flex h-full bg-[var(--bg-content)]">
      <Sidebar tab={tab} onTab={setTab} query={query} onQuery={setQuery} />
      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={key} className="mx-auto max-w-[720px] px-8 pb-16 pt-7"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={reduce ? { duration: 0.1 } : spring.ui}>
            {!ctl ? null : searching ? (
              <SearchCtx.Provider value={query}>
                <h1 className="t-large mb-5">Search</h1>
                {Object.entries(PANES).map(([id, Pane]) => <Pane key={id} {...ctl} />)}
              </SearchCtx.Provider>
            ) : tab === "history" ? <History {...ctl} /> : (
              <>
                <h1 className="t-large">{meta.label}</h1>
                <p className="t-callout mb-6 mt-1">{meta.subtitle}</p>
                {(() => { const Pane = PANES[tab]; return <Pane {...ctl} />; })()}
              </>
            )}
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
