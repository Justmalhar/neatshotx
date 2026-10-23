import { useEffect, useRef } from "react";
import { useMotionValue } from "motion/react";

/** Counts up 0→1 over `secs` while not paused (pause keeps progress, resumes where it left off). */
export function useAutoClose(secs: number, paused: boolean, onClose: () => void) {
  const progress = useMotionValue(0);
  const cb = useRef(onClose);
  cb.current = onClose;

  useEffect(() => {
    if (secs <= 0 || paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      progress.set(Math.min(1, progress.get() + (now - last) / (secs * 1000)));
      last = now;
      if (progress.get() >= 1) cb.current();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [secs, paused, progress]);

  return progress;
}
