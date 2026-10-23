import { listen } from "@tauri-apps/api/event";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Check } from "lucide-react";
import { api } from "../lib/api";
import { HudPill } from "../components/overlays/HudPill";
import { IconButton } from "../components/overlays/IconButton";
import { useEffect, useState } from "react";

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
    <HudPill className="gap-2 px-3">
      <div className="flex min-w-0 flex-1 flex-col leading-tight" data-tauri-drag-region>
        <span className="tabular text-[14px] font-semibold" data-tauri-drag-region>
          <motion.span>{shown}</motion.span> <span className="text-[11px] font-normal text-white/60">px</span>
        </span>
        <span className="truncate text-[11px] text-white/60" data-tauri-drag-region>
          {mode === "auto" ? "Scrolling automatically… Done to stop early"
            : mode === "manual-fallback" ? "Couldn't auto-scroll — scroll slowly by hand"
            : started ? "Keep scrolling slowly" : "Scroll the area slowly"}
        </span>
      </div>
      <IconButton wide label="Cancel (discard)" onClick={() => api.finishScroll(false)}>Cancel</IconButton>
      <IconButton wide tone="primary" label="Done" onClick={() => api.finishScroll(true)}><Check size={14} />Done</IconButton>
    </HudPill>
  );
}
