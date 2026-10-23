import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { fileSrc, param } from "../lib/api";
import { IconButton } from "../components/overlays/IconButton";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Floating always-on-top screenshot. Wheel = opacity, Cmd/Ctrl+wheel or pinch = zoom, double-click/Esc = close. */
export default function Pin() {
  const path = param("p") ?? "";
  const [opacity, setOpacity] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState(false);
  const win = useRef(getCurrentWindow());
  const base = useRef<{ w: number; h: number } | null>(null); // logical size at zoom 1
  const target = useRef(1);
  const busy = useRef(false);

  const close = () => win.current.destroy();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  // Resize around the window center; loops until the latest target is applied.
  const apply = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const w = win.current;
      if (!base.current) {
        const [s, f] = await Promise.all([w.innerSize(), w.scaleFactor()]);
        base.current = { w: s.width / f, h: s.height / f };
      }
      let done = NaN;
      while (done !== target.current) {
        done = target.current;
        const [pos, size, f] = await Promise.all([w.outerPosition(), w.innerSize(), w.scaleFactor()]);
        const nw = Math.round(base.current.w * done * f), nh = Math.round(base.current.h * done * f);
        await w.setSize(new LogicalSize(base.current.w * done, base.current.h * done));
        await w.setPosition(new PhysicalPosition(Math.round(pos.x + (size.width - nw) / 2), Math.round(pos.y + (size.height - nh) / 2)));
      }
    } finally { busy.current = false; }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) { // pinch arrives as wheel + ctrlKey
      target.current = clamp(target.current * Math.exp(-e.deltaY * (e.ctrlKey && !e.metaKey ? 0.01 : 0.003)), 0.2, 5);
      setZoom(target.current);
      apply();
    } else setOpacity((o) => clamp(o - e.deltaY / 800, 0.15, 1));
  };

  return (
    <div
      className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,.25), 0 0 0 0.5px rgba(0,0,0,.4)" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => e.button === 0 && e.detail === 1 && win.current.startDragging()}
      onDoubleClick={close}
      onWheel={onWheel}
      tabIndex={0}
    >
      <img src={fileSrc(path)} style={{ opacity }} className="pointer-events-none h-full w-full object-contain" draggable={false} />
      <AnimatePresence>
        {hover && (
          <motion.div
            className="mat-hud absolute inset-x-1.5 top-1.5 flex h-8 items-center gap-1 rounded-full px-1 text-[11px] font-medium"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
            onMouseDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}
          >
            <IconButton label="Close (Esc)" onClick={close} className="!h-6 !w-6"><X size={13} /></IconButton>
            <span className="tabular ml-auto text-white/80" title="Scroll to change opacity">{Math.round(opacity * 100)}% opacity</span>
            <span className="tabular mr-2 text-white/80" title="Cmd/Ctrl + scroll or pinch to zoom">{Math.round(zoom * 100)}%</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
