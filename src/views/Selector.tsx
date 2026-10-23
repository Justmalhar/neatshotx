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

// Short top hint, scroll only (CleanShot shows nothing for the instant-capture modes).
const MODE_HINT: Record<string, string> = {
  scroll: "Drag the scrollable area · Esc to cancel",
};
const KEEP_EDITING = ["scroll"]; // release keeps an editable selection + HUD; other modes confirm on release
const FRAME = "0 0 0 1px rgba(255,255,255,.95), 0 0 0 2px rgba(0,0,0,.3)";
const LBL_W = 112, LBL_H = 24;

const snap = (v: number) => Math.round(v * (devicePixelRatio || 1)) / (devicePixelRatio || 1);

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
  const [closing, setClosing] = useState(false);
  const [hint, setHint] = useState(true);
  const hoverAtDown = useRef<WindowRect | null>(null);
  const done = useRef(false);
  const touched = useRef(false);
  const { sel, setSel, drag, begin, apply, end, nudge, reapply, holdSpace, active } = useSelection(ratio);
  const src = convertFileSrc(String(monitor), "frozen");

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 2500);
    return () => clearTimeout(t);
  }, []);

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
    setClosing(true);
    api.finishSelection({ monitor, ...r }, windowId);
  };
  const confirm = () => sel && finishImage(toImageRect(sel, scale));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const down = e.type === "keydown";
      if (e.key === "Shift" || e.key === "Alt") reapply({ shift: e.shiftKey, alt: e.altKey });
      if (e.key === " ") {
        e.preventDefault();
        if (active()) holdSpace(down); // mid-drag: move the selection
        else if (down && !e.repeat && ["area", "window"].includes(mode)) {
          if (!windowMode) setSel(null);
          setWindowMode(!windowMode);
        }
        return;
      }
      if (!down) return;
      if (e.key === "Escape") api.cancelSelection();
      else if (e.key === "Enter" && sel) {
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

  const pt = (e: React.PointerEvent | React.MouseEvent): Pt => ({ x: e.clientX, y: e.clientY });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || inHud(e.target)) return;
    touched.current = true;
    hoverAtDown.current = hovered; // `hovered` is null once the drag starts re-rendering
    e.currentTarget.setPointerCapture(e.pointerId); // keep tracking outside the window edge
    begin(pt(e), e.target as HTMLElement);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    setCursor(pt(e));
    setOverHud(inHud(e.target));
    apply(pt(e), { shift: e.shiftKey, alt: e.altKey });
  };
  const onPointerUp = () => {
    const { kind, tiny, rect } = end();
    const h = hoverAtDown.current;
    hoverAtDown.current = null;
    if (kind === "draw" && tiny && h) {
      finishImage({ x: h.x, y: h.y, w: h.w, h: h.h }, KEEP_EDITING.includes(mode) ? undefined : h.id);
    } else if (kind === "draw" && rect && !KEEP_EDITING.includes(mode)) {
      finishImage(toImageRect(rect, scale)); // CleanShot: release confirms
    }
  };

  const cursorStyle = drag?.kind === "resize" ? HANDLE_CURSOR[drag.handle!] : drag?.kind === "move" ? "grabbing" : "crosshair";
  const showLoupe = !!(loaded && settings?.selector_show_magnifier && cursor && !overHud && drag?.kind !== "move" && drag?.kind !== "resize");
  const drawing = drag?.kind === "draw";
  const showDims = !!(sel && (drawing || drag?.kind === "resize") && cursor);
  const tagTop = hl ? (hl.y > 34 ? hl.y - 30 : hl.y + hl.h + 6) : 0;
  const flipX = !!cursor && cursor.x + 16 + LBL_W > innerWidth;
  const lx = cursor ? Math.round(flipX ? cursor.x - 16 : cursor.x + 16) : 0;
  const ly = cursor ? Math.round(cursor.y + 18 + LBL_H > innerHeight ? cursor.y - 18 - LBL_H : cursor.y + 18) : 0;
  const frame = sel
    ? { x: snap(sel.x), y: snap(sel.y), w: snap(sel.x + sel.w) - snap(sel.x), h: snap(sel.y + sel.h) - snap(sel.y) }
    : null;

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
          src={src}
          crossOrigin="anonymous"
          className="pointer-events-none absolute inset-0 h-full w-full"
          draggable={false}
          onLoad={(e) => {
            setScale(e.currentTarget.naturalWidth / innerWidth || 1);
            setLoaded(true);
            const w = getCurrentWindow(); w.show(); w.setFocus();
          }}
        />

        {frame && (
          <div
            className="absolute"
            style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h, boxShadow: `${FRAME}, 0 0 0 99999px rgba(0,0,0,.5)` }}
          >
            <div data-role="move" className="absolute inset-0" style={{ cursor: drag ? undefined : "move" }} />
            {!drawing && <Handles />}
          </div>
        )}

        {hl && (
          <div
            className="pointer-events-none absolute"
            style={{ left: snap(hl.x), top: snap(hl.y), width: snap(hl.w), height: snap(hl.h), background: "rgba(10,132,255,.18)", boxShadow: "inset 0 0 0 2px #0A84FF" }}
          />
        )}
        {hl && hovered && (
          <div className="mat-hud t-caption tabular pointer-events-none absolute rounded-md px-2 py-0.5 font-medium" style={{ left: Math.round(hl.x), top: Math.round(tagTop), color: "#fff" }}>
            {hovered.app} · {Math.round(hl.w * scale)} × {Math.round(hl.h * scale)}
          </div>
        )}

        <AnimatePresence>
          {showDims && sel && (
            <div key="dims" className="pointer-events-none absolute left-0 top-0 z-20" style={{ transform: `translate3d(${lx}px,${ly}px,0) translateX(${flipX ? "-100%" : "0"})` }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={spring.ui}
                className="mat-hud t-caption tabular rounded-md px-2 py-1 font-medium"
                style={{ color: "#fff", fontSize: 12, transformOrigin: flipX ? "right top" : "left top" }}
              >
                {Math.round(sel.w * scale)} × {Math.round(sel.h * scale)}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {sel && !drawing && !closing && (
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

        {showLoupe && cursor && <Loupe cursor={cursor} img={imgRef} src={src} scale={scale} />}

        <AnimatePresence>
          {hint && MODE_HINT[mode] && (
            <motion.div
              key="hint"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring.ui}
              className="mat-hud t-caption pointer-events-none absolute top-8 rounded-full px-4 py-2 font-medium"
              style={{ color: "#fff", x: "-50%", left: "50%" }}
            >
              {MODE_HINT[mode]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
