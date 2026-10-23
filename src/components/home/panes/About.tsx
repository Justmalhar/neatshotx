import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Aperture } from "lucide-react";
import { Btn } from "../form";

export default function About() {
  const [v, setV] = useState("");
  useEffect(() => { getVersion().then(setV).catch(() => {}); }, []);
  return (
    <div className="grid place-items-center gap-2 pt-10 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-[18px] bg-gradient-to-b from-[#5ac8fa] to-[var(--accent)] text-white shadow-[var(--shadow-md)]"><Aperture size={44} strokeWidth={1.6} /></div>
      <h1 className="t-title mt-2">NeatShotX</h1>
      <p className="t-caption">Version {v || "—"}</p>
      <p className="t-callout max-w-xs">A fast, cross-platform screenshot tool with annotation and scrolling capture.</p>
      <div className="mt-3 flex gap-2">
        <Btn onClick={() => openUrl("https://github.com/justmalhar")}>GitHub</Btn>
        <Btn onClick={() => openUrl("https://www.justmalhar.com")}>Website</Btn>
      </div>
    </div>
  );
}
