import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { api, param } from "../lib/api";
import { ProgressRing } from "../components/overlays/ProgressRing";
import { tick } from "../components/overlays/tick";
import { materialize } from "../lib/motion";

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
    <div className="grid h-full place-items-center">
      <motion.div
        className="mat-hud relative grid h-40 w-40 place-items-center rounded-full"
        initial={reduce ? { opacity: 0 } : materialize.initial}
        animate={reduce ? { opacity: 1 } : materialize.animate}
        transition={{ type: "spring", bounce: 0, duration: 0.35 }}
      >
        <ProgressRing size={160} progress={Math.max(0, n - 1) / total} />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={n}
            initial={reduce ? { opacity: 0 } : { scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            className="tabular text-[72px] font-semibold leading-none tracking-tight"
          >{n}</motion.span>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
