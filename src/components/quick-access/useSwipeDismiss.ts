import { useEffect, useRef, type PointerEvent } from "react";
import { animate, useMotionValue, type AnimationPlaybackControls } from "motion/react";
import { spring } from "../../lib/motion";

const HYSTERESIS = 8; // px before the gesture commits to swipe vs native drag-out
const WIDTH = 256;

/** Apple momentum projection (decelerationRate 0.998). */
export const project = (v: number) => ((v / 1000) * 0.998) / (1 - 0.998);
const rubber = (o: number, dim: number, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));

type Mode = "idle" | "pending" | "swipe" | "drag";

/**
 * Horizontal swipe toward the screen edge dismisses; anything else past the hysteresis
 * hands off to a native file drag (onDragOut). `side` is the edge the window is anchored to.
 */
export function useSwipeDismiss(side: "left" | "right", onDismiss: () => void, onDragOut: () => void) {
  const x = useMotionValue(0);
  const dir = side === "left" ? -1 : 1;
  const s = useRef({ mode: "idle" as Mode, sx: 0, sy: 0, base: 0, samples: [] as [number, number][] });
  const anim = useRef<AnimationPlaybackControls | undefined>(undefined);
  const cbs = useRef({ onDismiss, onDragOut });
  cbs.current = { onDismiss, onDragOut };
  useEffect(() => () => anim.current?.stop(), []);

  const settle = (to: number, velocity: number, done?: () => void) => {
    anim.current?.stop();
    anim.current = animate(x, to, { ...spring.move, velocity, onComplete: done });
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    anim.current?.stop(); // grab mid-flight: continue from the presented value
    Object.assign(s.current, { mode: "pending", sx: e.clientX, sy: e.clientY, base: x.get(), samples: [[e.timeStamp, e.clientX]] });
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const st = s.current;
    if (st.mode === "idle" || st.mode === "drag") return;
    const dx = e.clientX - st.sx;
    const dy = e.clientY - st.sy;
    if (st.mode === "pending") {
      if (Math.hypot(dx, dy) < HYSTERESIS) return;
      const horizontalOut = dx * dir > 0 && Math.abs(dx) > Math.abs(dy) * 1.2;
      if (horizontalOut || st.base !== 0) {
        st.mode = "swipe";
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        st.mode = "drag";
        cbs.current.onDragOut();
        return;
      }
    }
    st.samples.push([e.timeStamp, e.clientX]);
    if (st.samples.length > 8) st.samples.shift();
    const raw = st.base + dx; // 1:1, keeps the grab offset
    const v = raw * dir; // >0 toward the edge
    x.set(v >= 0 ? raw : -dir * rubber(-v, WIDTH));
  };

  const end = (e: PointerEvent<HTMLElement>, cancelled = false) => {
    const st = s.current;
    const was = st.mode;
    st.mode = "idle";
    if (was !== "swipe") return;
    const t = e.timeStamp;
    const recent = st.samples.filter(([ts]) => t - ts < 100);
    const [t0, x0] = recent[0] ?? [t, e.clientX];
    const vx = t - t0 > 5 ? ((e.clientX - x0) / (t - t0)) * 1000 : 0;
    const landing = x.get() + project(vx);
    if (!cancelled && landing * dir > WIDTH * 0.5) settle(dir * (WIDTH + 60), vx, () => cbs.current.onDismiss());
    else settle(0, vx);
  };

  return {
    x,
    bind: { onPointerDown, onPointerMove, onPointerUp: (e: PointerEvent<HTMLElement>) => end(e), onPointerCancel: (e: PointerEvent<HTMLElement>) => end(e, true) },
  };
}
