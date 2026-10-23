import { useCallback, useRef, useState } from "react";
import { HANDLES, handlePoint, moveRect, resizeRect, type Handle, type Pt, type Rect } from "./geometry";

export type DragKind = "draw" | "move" | "resize";
export type Drag = { kind: DragKind; handle?: Handle };
type Work = Drag & { start: Pt; orig: Rect; grab: Pt };

const bounds = () => ({ w: innerWidth, h: innerHeight });
const MIN_DRAW = 4;

/** Selection state + pointer-driven draw / move / resize. 1:1 tracking, grab offset respected. */
export function useSelection(ratio: number | null) {
  const [sel, setSel] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const work = useRef<Work | null>(null);
  const last = useRef<Pt>({ x: 0, y: 0 });
  const ratioRef = useRef(ratio);
  ratioRef.current = ratio;
  const selRef = useRef(sel);
  selRef.current = sel;

  const apply = useCallback((pt: Pt, shift: boolean) => {
    const w = work.current;
    if (!w) return;
    last.current = pt;
    const r = ratioRef.current ?? (shift ? 1 : null); // Shift on Free = square
    if (w.kind === "move") setSel(moveRect(w.orig, pt.x - w.start.x, pt.y - w.start.y, bounds()));
    else if (w.kind === "resize") setSel(resizeRect(w.orig, w.handle!, { x: pt.x - w.grab.x, y: pt.y - w.grab.y }, bounds(), r));
    else setSel(resizeRect({ ...w.start, w: 0, h: 0 }, "se", pt, bounds(), r));
  }, []);

  /** `target` is the element under the pointer: data-handle -> resize, data-role="move" -> move, else new draw. */
  const begin = useCallback((pt: Pt, target: HTMLElement) => {
    const cur = selRef.current;
    const handle = target.dataset.handle as Handle | undefined;
    let w: Work;
    if (cur && handle && HANDLES.includes(handle)) {
      const hp = handlePoint(cur, handle);
      w = { kind: "resize", handle, start: pt, orig: cur, grab: { x: pt.x - hp.x, y: pt.y - hp.y } };
    } else if (cur && target.dataset.role === "move") {
      w = { kind: "move", start: pt, orig: cur, grab: { x: 0, y: 0 } };
    } else {
      w = { kind: "draw", start: pt, orig: { ...pt, w: 0, h: 0 }, grab: { x: 0, y: 0 } };
      setSel(null);
    }
    work.current = w;
    last.current = pt;
    setDrag({ kind: w.kind, handle: w.handle });
  }, []);

  /** Finish the gesture. `tiny` = a draw too small to keep (a click), selection is dropped. */
  const end = useCallback(() => {
    const w = work.current;
    work.current = null;
    setDrag(null);
    if (!w) return { kind: null, tiny: false };
    const r = selRef.current;
    const tiny = w.kind === "draw" && (!r || r.w <= MIN_DRAW || r.h <= MIN_DRAW);
    if (tiny) setSel(null);
    return { kind: w.kind, tiny };
  }, []);

  const nudge = useCallback((dx: number, dy: number) => {
    const cur = selRef.current;
    if (cur) setSel(moveRect(cur, dx, dy, bounds()));
  }, []);

  /** Re-run the active drag, e.g. when Shift is pressed/released mid-gesture. */
  const reapply = useCallback((shift: boolean) => apply(last.current, shift), [apply]);

  return { sel, setSel, drag, begin, apply, end, nudge, reapply };
}
