import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Check, X } from "lucide-react";
import { api } from "../lib/api";

export default function ScrollBar() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const un = listen<number>("scroll-progress", (e) => setHeight(e.payload));
    return () => { un.then((f) => f()); };
  }, []);
  return (
    <div className="glass flex h-full items-center gap-2 rounded-full px-3" data-tauri-drag-region>
      <span className="flex-1 text-xs font-medium" data-tauri-drag-region>
        {height ? `${height}px captured — keep scrolling` : "Scroll the area slowly…"}
      </span>
      <button className="btn" onClick={() => api.finishScroll(false)}><X size={14} /></button>
      <button className="btn btn-primary" onClick={() => api.finishScroll(true)}><Check size={14} />Done</button>
    </div>
  );
}
