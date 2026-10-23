import { listen } from "@tauri-apps/api/event";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Check } from "lucide-react";
import { api } from "../lib/api";
import { useEffect, useState } from "react";

/** Window is the material (native vibrancy, 320x56, radius 28): no blur/shadow of our own. */
export default function ScrollBar() {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual" | "manual-fallback">("auto");
  const raw = useMotionValue(0);
  const smooth = useSpring(raw, { bounce: 0, duration: 0.4 });
  const shown = useTransform(smooth, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const un = [
      listen<number>("scroll-progress", (e) => { setStarted(e.payload > 0); raw.set(e.payload); }),
      listen<typeof mode>("scroll-mode", (e) => setMode(e.payload)),
    ];
    return () => { un.forEach((p) => p.then((f) => f())); };
  }, [raw]);
  return (
    <div data-tauri-drag-region className="hud hud--window flex h-full w-full select-none items-center gap-2 rounded-full pl-4 pr-3">
      <div className="flex min-w-0 flex-1 flex-col" data-tauri-drag-region>
        <span className="t-headline tabular" style={{ color: "var(--hud-fg)" }} data-tauri-drag-region>
          <motion.span>{shown}</motion.span> <span className="t-caption" style={{ color: "var(--hud-fg-2)" }}>px</span>
        </span>
        <span className="t-caption truncate" style={{ color: "var(--hud-fg-2)" }} data-tauri-drag-region>
          {mode === "auto" ? "Scrolling automatically. Done to stop early"
            : mode === "manual-fallback" ? "Couldn't auto-scroll. Scroll slowly by hand"
            : started ? "Keep scrolling slowly" : "Scroll the area slowly"}
        </span>
      </div>
      <button type="button" className="hud-btn" title="Cancel (discard)" onClick={() => api.finishScroll(false)}>Cancel</button>
      <button type="button" className="hud-btn hud-btn--primary" title="Done" onClick={() => api.finishScroll(true)}>
        <Check size={14} strokeWidth={1.75} />Done
      </button>
    </div>
  );
}
