import { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { api, param, type Region, type Settings, type WindowRect } from "../lib/api";
import { spring } from "../lib/motion";
import { HANDLE_CURSOR, clamp, contains, fitRatio, toImageRect, type Pt, type Rect } from "../components/selector/geometry";
import { useSelection } from "../components/selector/useSelection";
import Handles from "../components/selector/Handles";
import Loupe from "../components/selector/Loupe";
import SelectionHud from "../components/selector/SelectionHud";

const MODE_HINT: Record<string, string> = {
  area: "Drag to capture · Space for window · Esc to cancel",
  window: "Click a window · Space for area · Esc to cancel",
  record: "Drag the area to record · Esc to cancel",
  scroll: "Drag the scrollable area · Esc to cancel",
  ocr: "Drag over text to copy it · Esc to cancel",
  timer: "Drag the area · capture starts after the timer",
};
const ADJUST_HINT = "Drag to move · Shift locks aspect · Arrows nudge · Enter to confirm";

const bounds = () => ({ w: innerWidth, h: innerHeight });
const inHud = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.("[data-hud]");

export default function Selector() {
  const monitor = Number(param("m") ?? 0);
  const mode = param("mode") ?? "area";
  const imgRef = useRef<HTMLImageElement>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [overHud, setOverHud] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);
  const [scale, setScale] = useState(1); // CSS px -> frozen image px
  const [loaded, setLoaded] = useState(false);
  const [windowMode, setWindowMode] = useState(mode === "window");
  const [windows, setWindows] = useState<WindowRect[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [last, setLast] = useState<Region | null>(null);
  const done = useRef(false);
  const touched = useRef(false);
  const { sel, setSel, drag, begin, apply, end, nudge, reapply } = useSelection(ratio);

  useEffect(() => {
    api.listWindows(monitor).then(setWindows).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
    api.lastRegion().then(setLast).catch(() => {});
  }, [monitor]);

  // Remember last selection: place it, editable, once the image (scale) and settings are known.
  useEffect(() => {
    if (!loaded || !settings || !last || touched.current || mode === "window") return;
    if (!settings.selector_remember_last || last.monitor !== monitor) return;
    touched.current = true;
    const b = bounds();
    const w = clamp(last.w / scale, 1, b.w), h = clamp(last.h / scale, 1, b.h);
    setSel({ x: clamp(last.x / scale, 0, b.w - w), y: clamp(last.y / scale, 0, b.h - h), w, h });
  }, [loaded, settings, last, scale, monitor, mode, setSel]);

  const finishImage = (r: Rect, windowId?: number) => {
    if (done.current) return;
    done.current = true;
    api.finishSelection({ monitor, ...r }, windowId);
  };
  const confirm = () => sel && finishImage(toImageRect(sel, scale));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Shift") reapply(e.type === "keydown");
      if (e.type !== "keydown") return;
      if (e.key === "Escape") api.cancelSelection();
      if (e.key === " " && ["area", "window"].includes(mode)) {
        e.preventDefault();
        if (!windowMode) setSel(null);
        setWindowMode(!windowMode);
      } else if (e.key === "Enter" && sel) {
        e.preventDefault();
        confirm();
      } else if (sel && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) / scale; // image pixels, not CSS pixels
        nudge(e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0);
      }
    };
    addEventListener("keydown", onKey);
    addEventListener("keyup", onKey);
    return () => { removeEventListener("keydown", onKey); removeEventListener("keyup", onKey); };
  });

  const hovered = (() => {
    if (!windowMode || !cursor || sel || drag) return null;
    const px = cursor.x * scale, py = cursor.y * scale;
    return windows.find((w) => px >= w.x && py >= w.y && px <= w.x + w.w && py <= w.y + w.h) ?? null;
  })();
  const hl: Rect | null = hovered ? { x: hovered.x / scale, y: hovered.y / scale, w: hovered.w / scale, h: hovered.h / scale } : null;
  const box = sel ?? hl;

  const pt = (e: React.PointerEvent | React.MouseEvent): Pt => ({ x: e.clientX, y: e.clientY });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || inHud(e.target)) return;
    touched.current = true;
    e.currentTarget.setPointerCapture(e.pointerId); // keep tracking outside the window edge
    begin(pt(e), e.target as HTMLElement);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    setCursor(pt(e));
    setOverHud(inHud(e.target));
    apply(pt(e), e.shiftKey);
  };
  const onPointerUp = () => {
    const { kind, tiny } = end();
    if (kind === "draw" && tiny && hovered) {
      finishImage({ x: hovered.x, y: hovered.y, w: hovered.w, h: hovered.h }, mode === "record" || mode === "scroll" ? undefined : hovered.id);
    }
  };

  const cursorStyle = drag?.kind === "resize" ? HANDLE_CURSOR[drag.handle!] : drag?.kind === "move" ? "grabbing" : "crosshair";
  const showLoupe = !!(settings?.selector_show_magnifier && cursor && !overHud && drag?.kind !== "move" && drag?.kind !== "resize");
  const drawing = drag?.kind === "draw";
  const tagTop = box ? (box.y > 34 ? box.y - 30 : box.y + box.h + 6) : 0;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="fixed inset-0 select-none overflow-hidden"
        style={{ cursor: cursorStyle, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setOverHud(false)}
        onDoubleClick={(e) => { if (sel && !inHud(e.target) && contains(sel, pt(e))) confirm(); }}
        onContextMenu={(e) => { e.preventDefault(); api.cancelSelection(); }}
      >
        <img
          ref={imgRef}
          src={convertFileSrc(String(monitor), "frozen")}
          crossOrigin="anonymous"
          className="pointer-events-none absolute inset-0 h-full w-full"
          draggable={false}
          onLoad={(e) => {
            setScale(e.currentTarget.naturalWidth / innerWidth || 1);
            setLoaded(true);
            const w = getCurrentWindow(); w.show(); w.setFocus();
          }}
        />

        {box ? (
          <div
            className="absolute rounded-[1px]"
            style={{
              left: box.x, top: box.y, width: box.w, height: box.h,
              pointerEvents: sel ? "auto" : "none",
              boxShadow: "inset 0 0 0 1px #fff, 0 0 0 1px rgba(0,0,0,.35), 0 0 0 99999px rgba(0,0,0,.45)",
            }}
          >
            {sel && (
              <>
                <div data-role="move" className="absolute inset-0" style={{ cursor: drag ? undefined : "move" }} />
                <Handles />
              </>
            )}
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-black/10" />
        )}

        {box && (drawing || hl) && (
          <div className="mat-hud t-caption tabular pointer-events-none absolute rounded-md px-2 py-0.5 font-medium" style={{ left: box.x, top: tagTop, color: "#fff" }}>
            {Math.round(box.w * scale)} × {Math.round(box.h * scale)}
            {hl && hovered ? ` · ${hovered.app}` : ""}
          </div>
        )}

        {cursor && !sel && !drag && (
          <>
            <div className="pointer-events-none absolute top-0 h-full w-px bg-white/50 mix-blend-difference" style={{ left: cursor.x }} />
            <div className="pointer-events-none absolute left-0 h-px w-full bg-white/50 mix-blend-difference" style={{ top: cursor.y }} />
          </>
        )}

        {sel && !drawing && (
          <SelectionHud
            rect={sel}
            scale={scale}
            mode={mode}
            ratio={ratio}
            onRatio={(r) => { setRatio(r); if (r) setSel(fitRatio(sel, r, bounds())); }}
            onConfirm={confirm}
            onCancel={() => api.cancelSelection()}
          />
        )}

        {showLoupe && cursor && <Loupe cursor={cursor} img={imgRef} scale={scale} />}

        <AnimatePresence>
          {!drag && (
            <motion.div
              key={sel ? "adjust" : "hint"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={spring.ui}
              className="mat-hud t-caption pointer-events-none absolute bottom-8 rounded-full px-4 py-2 font-medium"
              style={{ color: "#fff", x: "-50%", left: "50%" }}
            >
              {sel ? ADJUST_HINT : windowMode && ["area", "window"].includes(mode) ? MODE_HINT.window : MODE_HINT[mode] ?? MODE_HINT.area}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
