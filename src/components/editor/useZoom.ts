import { useEffect, useRef, useState, type RefObject } from "react";

const STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
export type Zoom = ReturnType<typeof useZoom>;

/** Fit (default, never upscales) or a fixed scale; ctrl/pinch-wheel zooms continuously. */
export function useZoom(view: { w: number; h: number }, W: number, H: number, scroller: RefObject<HTMLDivElement | null>) {
  const [mode, setMode] = useState<"fit" | number>("fit");
  const fitScale = Math.max(0.02, Math.min(1, (view.w - 48) / W, (view.h - 48) / H));
  const scale = mode === "fit" ? fitScale : mode;
  const cur = useRef(scale);
  cur.current = scale;

  const zoomIn = () => { const n = STEPS.find((s) => s > cur.current + 1e-3); if (n) setMode(n); };
  const zoomOut = () => { const n = [...STEPS].reverse().find((s) => s < cur.current - 1e-3); if (n) setMode(n); };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setMode(Math.min(4, Math.max(0.1, cur.current * Math.exp(-e.deltaY * 0.01))));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [scroller]);

  return { scale, mode, zoomIn, zoomOut, fit: () => setMode("fit"), actual: () => setMode(1), set: (n: number) => setMode(n) };
}
