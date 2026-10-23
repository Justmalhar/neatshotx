import { useCallback, useRef, useState } from "react";
import { HANDLES, handlePoint, moveRect, resizeRect, resizeSymmetric, type Handle, type Pt, type Rect } from "./geometry";

export type DragKind = "draw" | "move" | "resize";
export type Drag = { kind: DragKind; handle?: Handle };
export type Mods = { shift: boolean; alt: boolean };
type Work = Drag & { start: Pt; orig: Rect; grab: Pt };

const bounds = () => ({ w: innerWidth, h: innerHeight });
const MIN_DRAW = 4;

/**
 * Selection state + pointer-driven draw / move / resize. 1:1 tracking, grab offset respected.
 * Modifiers (CleanShot): Shift = square/aspect lock, Alt = resize from center, Space (held) = move the selection.
 */
export function useSelection(ratio: number | null) {
  const [sel, setSelState] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const work = useRef<Work | null>(null);
  const last = useRef<Pt>({ x: 0, y: 0 });
  const mods = useRef<Mods>({ shift: false, alt: false });
  const spaceBase = useRef<{ pt: Pt; rect: Rect } | null>(null);
  const ratioRef = useRef(ratio);
  ratioRef.current = ratio;
  const selRef = useRef<Rect | null>(null);

  // selRef is written synchronously so pointerup sees the final rect even before a re-render.
  const setSel = useCallback((r: Rect | null) => { selRef.current = r; setSelState(r); }, []);

  const apply = useCallback((pt: Pt, m: Mods) => {
    const w = work.current;
    if (!w) return;
    last.current = pt;
    mods.current = m;
    const sb = spaceBase.current;
    if (sb) return setSel(moveRect(sb.rect, pt.x - sb.pt.x, pt.y - sb.pt.y, bounds()));
    const r = ratioRef.current ?? (m.shift ? 1 : null); // Shift on Free = square
    if (w.kind === "move") return setSel(moveRect(w.orig, pt.x - w.start.x, pt.y - w.start.y, bounds()));
    const resizing = w.kind === "resize";
    const orig = resizing ? w.orig : { ...w.start, w: 0, h: 0 };
    const p = resizing ? { x: pt.x - w.grab.x, y: pt.y - w.grab.y } : pt;
    setSel((m.alt ? resizeSymmetric : resizeRect)(orig, resizing ? w.handle! : "se", p, bounds(), r));
  }, [setSel]);

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
    spaceBase.current = null;
    last.current = pt;
    setDrag({ kind: w.kind, handle: w.handle });
  }, [setSel]);

  /** Finish the gesture. `tiny` = a draw too small to keep (a click), selection is dropped. */
  const end = useCallback(() => {
    const w = work.current;
    work.current = null;
    spaceBase.current = null;
    setDrag(null);
    if (!w) return { kind: null, tiny: false, rect: null as Rect | null };
    const r = selRef.current;
    const tiny = w.kind === "draw" && (!r || r.w <= MIN_DRAW || r.h <= MIN_DRAW);
    if (tiny) setSel(null);
    return { kind: w.kind, tiny, rect: tiny ? null : r };
  }, [setSel]);

  const nudge = useCallback((dx: number, dy: number) => {
    const cur = selRef.current;
    if (cur) setSel(moveRect(cur, dx, dy, bounds()));
  }, [setSel]);

  /** Re-run the active drag when a modifier (Shift/Alt) is pressed or released mid-gesture. */
  const reapply = useCallback((m: Mods) => apply(last.current, m), [apply]);

  /** Space held mid-drag: move the whole selection; on release the drag resumes from the new position. */
  const holdSpace = useCallback((down: boolean) => {
    const w = work.current;
    if (!w || w.kind === "move") return;
    const sb = spaceBase.current;
    if (down && !sb) {
      spaceBase.current = { pt: last.current, rect: selRef.current ?? { ...w.start, w: 0, h: 0 } };
    } else if (!down && sb) {
      const cur = selRef.current;
      spaceBase.current = null;
      if (cur) {
        const dx = cur.x - sb.rect.x, dy = cur.y - sb.rect.y;
        w.start = { x: w.start.x + dx, y: w.start.y + dy };
        w.orig = { ...w.orig, x: w.orig.x + dx, y: w.orig.y + dy };
      }
      apply(last.current, mods.current);
    }
  }, [apply]);

  const active = useCallback(() => !!work.current, []);

  return { sel, setSel, drag, begin, apply, end, nudge, reapply, holdSpace, active };
}
