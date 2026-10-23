import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { param } from "../lib/api";

export default function Countdown() {
  const [n, setN] = useState(Number(param("s") ?? 3));
  useEffect(() => {
    const t = setInterval(() => setN((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="grid h-full place-items-center">
      <div className="glass grid h-36 w-36 place-items-center rounded-full">
        <AnimatePresence mode="popLayout">
          <motion.span key={n} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
            className="text-6xl font-semibold tabular-nums">{n}</motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
