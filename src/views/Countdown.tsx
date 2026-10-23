import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api, param } from "../lib/api";
import { ProgressRing } from "../components/overlays/ProgressRing";
import { tick } from "../components/overlays/tick";

export default function Countdown() {
  const reduce = useReducedMotion();
  const total = Number(param("s") ?? 3) || 3;
  const [n, setN] = useState(total);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => setSound(!!s.play_sounds)).catch(() => {});
    const t = setInterval(() => setN((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (sound && n > 0) tick(n === total ? 880 : 1000); }, [n, sound, total]);

  return (
    // Window is the material (native vibrancy, 144x144, radius 72): no blur/shadow of our own.
    <div className="hud hud--window relative grid h-full w-full select-none place-items-center overflow-hidden rounded-full">
      <ProgressRing size={144} progress={Math.max(0, n - 1) / total} />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={n}
            initial={reduce ? { opacity: 0 } : { scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            // Single explicit size: the numeral is a display glyph outside the type scale.
            style={{ fontSize: 64, color: "var(--hud-fg)" }}
            className="tabular font-semibold leading-none tracking-tight"
          >{n}</motion.span>
        </AnimatePresence>
    </div>
  );
}
