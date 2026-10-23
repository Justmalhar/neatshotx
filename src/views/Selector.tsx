import { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api, param, type WindowRect } from "../lib/api";

type Pt = { x: number; y: number };
const LOUPE = 128;
const ZOOM = 8;

const MODE_HINT: Record<string, string> = {
  area: "Drag to capture · Space for window · Esc to cancel",
  window: "Click a window · Space for area · Esc to cancel",
  record: "Drag the area to record · Esc to cancel",
  scroll: "Drag the scrollable area · Esc to cancel",
  ocr: "Drag over text to copy it · Esc to cancel",
  timer: "Drag the area · capture starts after the timer",
};

export default function Selector() {
  const monitor = Number(param("m") ?? 0);
  const mode = param("mode") ?? "area";
  const imgRef = useRef<HTMLImageElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [start, setStart] = useState<Pt | null>(null);
  const [windowMode, setWindowMode] = useState(mode === "window");
  const [windows, setWindows] = useState<WindowRect[]>([]);
  const done = useRef(false);

  // CSS px -> frozen image px
  const k = () => (imgRef.current?.naturalWidth ?? innerWidth) / innerWidth;

  useEffect(() => {
    api.listWindows(monitor).then(setWindows).catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") api.cancelSelection();
      if (e.key === " " && ["area", "window"].includes(mode)) setWindowMode((w) => !w);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [monitor, mode]);

  const hovered = (() => {
    if (!windowMode || !cursor) return null;
    const s = k();
    const px = cursor.x * s, py = cursor.y * s;
    return windows.find((w) => px >= w.x && py >= w.y && px <= w.x + w.w && py <= w.y + w.h) ?? null;
  })();

  // Magnifier
  useEffect(() => {
    const c = loupeRef.current, img = imgRef.current;
    if (!c || !img || !cursor) return;
    const ctx = c.getContext("2d")!;
    const s = k();
    const src = LOUPE / ZOOM;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, LOUPE, LOUPE);
    ctx.drawImage(img, cursor.x * s - src / 2, cursor.y * s - src / 2, src, src, 0, 0, LOUPE, LOUPE);
    ctx.strokeStyle = "rgba(59,130,246,.9)";
    ctx.strokeRect(LOUPE / 2 - ZOOM / 2, LOUPE / 2 - ZOOM / 2, ZOOM, ZOOM);
  }, [cursor]);

  const rect = start && cursor
    ? { x: Math.min(start.x, cursor.x), y: Math.min(start.y, cursor.y), w: Math.abs(cursor.x - start.x), h: Math.abs(cursor.y - start.y) }
    : null;

  const finish = (r: { x: number; y: number; w: number; h: number }, windowId?: number) => {
    if (done.current) return;
    done.current = true;
    const s = k();
    api.finishSelection(
      { monitor, x: Math.round(r.x * s), y: Math.round(r.y * s), w: Math.max(1, Math.round(r.w * s)), h: Math.max(1, Math.round(r.h * s)) },
      windowId,
    );
  };

  const onUp = () => {
    if (rect && rect.w > 4 && rect.h > 4) finish(rect);
    else if (hovered) {
      const s = k();
      finish({ x: hovered.x / s, y: hovered.y / s, w: hovered.w / s, h: hovered.h / s }, mode === "record" || mode === "scroll" ? undefined : hovered.id);
    }
    setStart(null);
  };

  const hl = hovered && !rect ? { x: hovered.x / k(), y: hovered.y / k(), w: hovered.w / k(), h: hovered.h / k() } : null;
  const box = rect ?? hl;

  return (
    <div
      className="fixed inset-0 cursor-crosshair overflow-hidden"
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      onMouseDown={(e) => e.button === 0 && setStart({ x: e.clientX, y: e.clientY })}
      onMouseUp={onUp}
      onContextMenu={(e) => { e.preventDefault(); api.cancelSelection(); }}
    >
      <img
        ref={imgRef}
        src={convertFileSrc(String(monitor), "frozen")}
        className="absolute inset-0 h-full w-full"
        draggable={false}
        onLoad={() => { const w = getCurrentWindow(); w.show(); w.setFocus(); }}
      />
      {box ? (
        <div
          className="pointer-events-none absolute rounded-[2px] outline outline-1 outline-white/90"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: "0 0 0 99999px rgba(0,0,0,.42)" }}
        >
          <span className="absolute -top-7 left-0 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums">
            {Math.round(box.w * k())} × {Math.round(box.h * k())}
            {hl && hovered ? ` · ${hovered.app}` : ""}
          </span>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
      )}
      {cursor && !rect && (
        <>
          <div className="pointer-events-none absolute top-0 h-full w-px bg-white/50 mix-blend-difference" style={{ left: cursor.x }} />
          <div className="pointer-events-none absolute left-0 h-px w-full bg-white/50 mix-blend-difference" style={{ top: cursor.y }} />
        </>
      )}
      {cursor && (
        <div
          className="pointer-events-none absolute overflow-hidden rounded-full border-2 border-white/80 shadow-2xl"
          style={{
            width: LOUPE, height: LOUPE,
            left: cursor.x + LOUPE + 24 > innerWidth ? cursor.x - LOUPE - 24 : cursor.x + 24,
            top: cursor.y + LOUPE + 24 > innerHeight ? cursor.y - LOUPE - 24 : cursor.y + 24,
          }}
        >
          <canvas ref={loupeRef} width={LOUPE} height={LOUPE} />
        </div>
      )}
      <div className="glass pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium">
        {windowMode && ["area", "window"].includes(mode) ? MODE_HINT.window : MODE_HINT[mode] ?? MODE_HINT.area}
      </div>
    </div>
  );
}
