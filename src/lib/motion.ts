// Apple-style springs (WWDC "Designing Fluid Interfaces"): critically damped by default,
// a little bounce only after momentum. Motion's bounce/duration ≈ Apple's damping/response.
import type { Transition } from "motion/react";

export const spring = {
  /** Default UI: no overshoot. */
  ui: { type: "spring", bounce: 0, duration: 0.35 } as Transition,
  /** Repositioning (overlays, cards). */
  move: { type: "spring", bounce: 0, duration: 0.4 } as Transition,
  /** Sheets/drawers after a flick. */
  sheet: { type: "spring", bounce: 0.2, duration: 0.3 } as Transition,
  /** Press feedback. */
  press: { type: "spring", bounce: 0, duration: 0.15 } as Transition,
};

/** "Materialize": glass surfaces scale + blur in together instead of a plain fade. */
export const materialize = {
  initial: { opacity: 0, scale: 0.96, filter: "blur(8px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.96, filter: "blur(8px)" },
};

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
