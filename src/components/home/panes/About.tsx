import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "../../../lib/api";
import AppIcon from "../AppIcon";

export default function About() {
  const [v, setV] = useState("");
  useEffect(() => { getVersion().then(setV).catch(() => {}); }, []);
  return (
    <div className="grid place-items-center gap-2 pt-8 text-center">
      <AppIcon size={80} />
      <h1 className="t-large mt-2">NeatShotX</h1>
      <p className="t-caption">Version {v || "Unknown"}</p>
      <p className="t-callout max-w-xs">A fast, cross-platform screenshot tool with annotation and scrolling capture.</p>
      <div className="mt-4 flex gap-2">
        <button className="ns-btn" onClick={() => openUrl("https://github.com/justmalhar")}>GitHub</button>
        <button className="ns-btn" onClick={() => openUrl("https://www.justmalhar.com")}>Website</button>
        <button className="ns-btn" onClick={() => api.action("welcome-guide")}>Welcome Guide…</button>
      </div>
    </div>
  );
}
