import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { motion } from "motion/react";
import { Camera, History as HistoryIcon, Settings as SettingsIcon } from "lucide-react";
import { param } from "../lib/api";
import History from "../components/home/History";
import SettingsForm from "../components/home/SettingsForm";

const TABS = [
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
] as const;

export default function Home() {
  const [tab, setTab] = useState(param("tab") ?? "history");
  useEffect(() => {
    const un = getCurrentWebviewWindow().listen<string>("nav", (e) => setTab(e.payload));
    return () => { un.then((f) => f()); };
  }, []);
  return (
    <div className="flex h-full">
      <aside className="flex w-52 shrink-0 flex-col gap-1 border-r border-black/5 p-3 dark:border-white/5">
        <div className="mb-4 flex items-center gap-2 px-2 pt-1 text-sm font-semibold"><Camera size={18} />NeatShotX</div>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className="btn relative !justify-start" data-active={tab === id}>
            <Icon size={16} />{label}
          </button>
        ))}
      </aside>
      <motion.main key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 flex-1 overflow-y-auto p-6">
        {tab === "settings" ? <SettingsForm /> : <History />}
      </motion.main>
    </div>
  );
}
