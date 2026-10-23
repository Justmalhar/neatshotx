import { resolveColor } from "../ui/color";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Group, Image as KImage, Layer, Line, Shape as KShape, Stage, Transformer } from "react-konva";
import { save } from "@tauri-apps/plugin-dialog";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { api, fileName, param } from "../lib/api";
import { spring } from "../lib/motion";
import { DEFAULT_CURVE } from "../components/editor/arrows";
import ShapeNode from "../components/editor/ShapeNode";
import BackgroundPanel from "../components/editor/BackgroundPanel";
import { Backdrop, groupClip } from "../components/editor/background/Backdrop";
import { layoutBackground } from "../components/editor/background/layout";
import BottomBar from "../components/editor/BottomBar";
import LineHandles from "../components/editor/LineHandles";
import TopBar from "../components/editor/TopBar";
import Toast from "../components/editor/Toast";
import type { StylePatch, StyleValues } from "../components/editor/StyleBar";
import { useZoom } from "../components/editor/useZoom";
import { useEditorKeys } from "../components/editor/useEditorKeys";
import { FONTS, fontOf, measure, pill, textCss, textLook } from "../components/editor/text";
import { computeSnap, type Box, type Guide } from "../components/editor/snap";
import { isProject, parseProject, toDataUrl } from "../components/editor/project";
import { DEFAULT_BACKGROUND, norm, type Background, type Project, type Shape, type Tool } from "../components/editor/types";

type Doc = { base: string; shapes: Shape[] };
const uid = () => Math.random().toString(36).slice(2);
const RESIZABLE = ["rect", "filled", "ellipse", "pixelate", "blur", "spotlight", "text", "emoji"];
const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];

function useImage(src: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) return;
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  return img;
}

export default function Editor() {
  const accent = useMemo(() => resolveColor("var(--accent)"), []); // system accent for canvas UI
  const path = param("p") ?? "";
  const [doc, setDoc] = useState<Doc>({ base: "", shapes: [] });
  const [original, setOriginal] = useState("");
  const [past, setPast] = useState<Doc[]>([]);
  const [future, setFuture] = useState<Doc[]>([]);
  const [tool, setTool] = useState<Tool>("arrow");
  const [style, setStyle] = useState<StyleValues>({ color: "#ff3b30", size: 4, emoji: "👍", textStyle: "plain", font: "system", counterStart: 1, arrowStyle: "tapered", arrowInverse: false });
  const [draft, setDraft] = useState<Shape | null>(null);
  const [live, setLive] = useState<Shape | null>(null); // endpoint-handle drag preview
  const [moving, setMoving] = useState(false);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [bg, setBg] = useState<Background>(DEFAULT_BACKGROUND);
  const [showBg, setShowBg] = useState(false);
  const [view, setView] = useState({ w: 800, h: 600 });
  const [toast, setToast] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const overlayRef = useRef<Konva.Layer>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const img = useImage(doc.base);
  const down = useRef(false);
  const toastTimer = useRef<number>(0);
  const coalesce = useRef({ key: "", t: 0 });
  const [guides, setGuides] = useState<Guide[]>([]);
  const snapTargets = useRef<Box[]>([]);
  const noSnap = useRef(false);
  const [projPath, setProjPath] = useState(isProject(path) ? path : "");
  const pngTarget = isProject(path) ? undefined : path;

  const flash = useCallback((t: string) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  useEffect(() => {
    if (!isProject(path)) { api.blobUrl(path).then((base) => { setOriginal(base); setDoc({ base, shapes: [] }); }); return; }
    api.readTextFile(path).then((t) => {
      const pr = parseProject(t);
      setOriginal(pr.original);
      setDoc({ base: pr.base, shapes: pr.shapes });
      setBg({ ...DEFAULT_BACKGROUND, ...pr.background });
      setStyle((s) => ({ ...s, counterStart: pr.counterStart ?? 1, ...pr.arrowDefaults, ...pr.textDefaults }));
    }).catch((e) => flash(e instanceof Error ? e.message : "Could not open project"));
  }, [path, flash]);

  // Holding ⌘/Ctrl temporarily disables snapping.
  useEffect(() => {
    const f = (e: KeyboardEvent) => { noSnap.current = e.metaKey || e.ctrlKey; };
    addEventListener("keydown", f); addEventListener("keyup", f);
    return () => { removeEventListener("keydown", f); removeEventListener("keyup", f); };
  }, []);

  useEffect(() => {
    const el = scrollRef.current!;
    const ro = new ResizeObserver(() => setView({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Canvas geometry (image px) comes from the background layout: padding, ratio, alignment.
  const iw = img?.width ?? 1, ih = img?.height ?? 1;
  const unit = Math.max(1, iw / 1400);
  const layout = useMemo(() => layoutBackground(bg, iw, ih), [bg, iw, ih]);
  const { W, H } = layout;
  const ox = layout.image.x, oy = layout.image.y;
  const zoom = useZoom(view, W, H, scrollRef);
  const scale = zoom.scale;

  const commit = useCallback((next: Doc) => {
    coalesce.current.key = "";
    setPast((p) => [...p.slice(-50), doc]);
    setFuture([]);
    setDoc(next);
  }, [doc]);
  /** Like commit, but repeated edits of the same kind within 700 ms (nudges, color drags) share one undo step. */
  const commitCoalesced = (key: string, next: Doc) => {
    const c = coalesce.current, now = Date.now();
    if (c.key === key && now - c.t < 700) setDoc(next);
    else commit(next);
    coalesce.current = { key, t: now };
  };
  const setShapes = (shapes: Shape[]) => commit({ ...doc, shapes });
  const patchShape = (id: string, patch: Partial<Shape>) => setShapes(doc.shapes.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const undo = () => past.length && (setFuture((f) => [doc, ...f]), setDoc(past[past.length - 1]), setPast((p) => p.slice(0, -1)));
  const redo = () => future.length && (setPast((p) => [...p, doc]), setDoc(future[0]), setFuture((f) => f.slice(1)));
  const revert = () => { setSelected(null); commit({ base: original, shapes: [] }); };

  const pointer = () => groupRef.current!.getRelativePointerPosition()!;

  const onDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editing) return;
    if (tool === "select") {
      if (e.target === e.target.getStage() || e.target.name() === "base") setSelected(null);
      return;
    }
    down.current = true;
    const p = pointer();
    const s: Shape = { id: uid(), kind: tool as Shape["kind"], x: p.x, y: p.y, w: 0, h: 0, color: style.color, size: style.size };
    if (tool === "crop") return setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
    if (tool === "counter") return setShapes([...doc.shapes, s]);
    if (tool === "emoji") return setShapes([...doc.shapes, { ...s, text: style.emoji }]);
    if (tool === "text") {
      setShapes([...doc.shapes, { ...s, text: "", textStyle: style.textStyle, font: style.font }]);
      setEditText("");
      return setEditing(s.id);
    }
    if (tool === "arrow") Object.assign(s, { arrowStyle: style.arrowStyle, arrowInverse: style.arrowInverse, curve: DEFAULT_CURVE });
    if (tool === "pen" || tool === "highlighter") s.points = [0, 0];
    setDraft(s);
  };

  const onMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!down.current) return;
    const p = pointer();
    if (draft && e.evt.shiftKey && (draft.kind === "arrow" || draft.kind === "line")) {
      // Shift: snap angle to 15° steps
      const dx = p.x - draft.x, dy = p.y - draft.y, L = Math.hypot(dx, dy), a = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12);
      return setDraft({ ...draft, w: Math.cos(a) * L, h: Math.sin(a) * L });
    }
    if (crop && tool === "crop") return setCrop({ ...crop, w: p.x - crop.x, h: p.y - crop.y });
    if (!draft) return;
    if (draft.points) setDraft({ ...draft, points: [...draft.points, p.x - draft.x, p.y - draft.y] });
    else setDraft({ ...draft, w: p.x - draft.x, h: p.y - draft.y });
  };

  const onUp = () => {
    down.current = false;
    if (draft) {
      const big = draft.points ? draft.points.length > 4 : Math.abs(draft.w) > 3 || Math.abs(draft.h) > 3;
      if (big) setShapes([...doc.shapes, norm(draft)]);
      setDraft(null);
    }
  };

  const shapes = live ? doc.shapes.map((s) => (s.id === live.id ? live : s)) : doc.shapes;
  const all = draft ? [...shapes, draft] : shapes;
  const sel = tool === "select" ? shapes.find((s) => s.id === selected) : undefined;
  const linear = sel?.kind === "arrow" || sel?.kind === "line";
  const resizable = !!sel && RESIZABLE.includes(sel.kind);
  const keepRatio = sel?.kind === "text" || sel?.kind === "emoji";

  // Transformer follows the selected node (not for lines/arrows, which use endpoint handles).
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = sel && !linear && !editing ? stageRef.current?.findOne(`#${sel.id}`) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [sel, linear, editing, doc, live]);

  /** Bake the Transformer's scale into geometry (or font size) and reset it to 1. */
  const bake = (node: Konva.Node) => {
    const s = doc.shapes.find((o) => o.id === node.id());
    if (!s) return;
    const sx = Math.abs(node.scaleX()), sy = Math.abs(node.scaleY());
    node.scale({ x: 1, y: 1 });
    if (s.kind === "text" || s.kind === "emoji") return patchShape(s.id, { x: node.x(), y: node.y(), fontSize: fontOf(s, unit) * sy });
    if (s.kind === "ellipse") {
      const w = s.w * sx, h = s.h * sy;
      return patchShape(s.id, { w, h, x: node.x() - w / 2, y: node.y() - h / 2 });
    }
    patchShape(s.id, { x: node.x(), y: node.y(), w: s.w * sx, h: s.h * sy });
  };

  /** Bounding boxes (group coords) of the image and every other shape, snapshotted when a drag/resize starts. */
  const rectBox = (n: Konva.Node): Box => { const r = n.getClientRect({ relativeTo: groupRef.current!, skipShadow: true }); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const startSnap = (id: string) => {
    const st = stageRef.current, g = groupRef.current;
    if (!st || !g) return;
    const boxes: Box[] = [{ x: 0, y: 0, w: iw, h: ih }];
    doc.shapes.forEach((o) => {
      const n = o.id === id ? null : st.findOne(`#${o.id}`);
      if (n) boxes.push(rectBox(n));
    });
    snapTargets.current = boxes;
  };
  const showGuides = (g: Guide[]) => setGuides((o) => (o.length === 0 && g.length === 0 ? o : g));
  const snapDrag = (node: Konva.Node, evt: MouseEvent) => {
    if (evt.metaKey || evt.ctrlKey || noSnap.current) return showGuides([]);
    const r = computeSnap(rectBox(node), snapTargets.current, 6 / scale);
    if (r.dx || r.dy) node.position({ x: node.x() + r.dx, y: node.y() + r.dy });
    showGuides(r.guides);
  };
  /** Transformer boundBoxFunc: boxes arrive in stage pixels; snap only the edges being dragged. */
  const snapResize = (o: { x: number; y: number; width: number; height: number; rotation: number }, n: typeof o) => {
    if (n.width < 8 || n.height < 8) return o;
    const a = trRef.current?.getActiveAnchor() ?? "";
    if (noSnap.current || !a || a === "rotater") return showGuides([]), n;
    const L = a.includes("left"), R = a.includes("right"), T = a.includes("top"), B = a.includes("bottom");
    const b = { x: n.x / scale - ox, y: n.y / scale - oy, w: n.width / scale, h: n.height / scale };
    const r = computeSnap(b, snapTargets.current, 6 / scale, {
      x: keepRatio && !(L || R) ? [] : L ? [0] : R ? [2] : [], y: keepRatio ? [] : T ? [0] : B ? [2] : [],
    });
    showGuides(r.guides);
    if (!r.dx && !r.dy) return n;
    const out = { ...n };
    if (L) { out.x += r.dx * scale; out.width -= r.dx * scale; } else if (R) out.width += r.dx * scale;
    if (T) { out.y += r.dy * scale; out.height -= r.dy * scale; } else if (B) out.height += r.dy * scale;
    if (keepRatio && r.dx) { // keep the aspect ratio: derive height from snapped width
      const h = out.width * (n.height / n.width);
      if (T) out.y -= h - out.height;
      out.height = h;
    }
    return out.width < 8 || out.height < 8 ? n : out;
  };

  /** Full-resolution PNG of the current composition; selection UI and editor-only overlays are hidden. */
  const exportPng = (region?: { x: number; y: number; w: number; h: number }) => {
    const st = stageRef.current!;
    const hide = [overlayRef.current!, ...st.find(".ui")].filter((n) => n.visible());
    hide.forEach((n) => n.hide());
    try {
      const r = region ?? { x: 0, y: 0, w: W, h: H }; // canvas coords
      return st.toDataURL({ x: r.x * scale, y: r.y * scale, width: r.w * scale, height: r.h * scale, pixelRatio: 1 / scale });
    } finally {
      hide.forEach((n) => n.show());
    }
  };

  const applyCrop = async () => {
    if (!crop) return;
    const c = norm({ ...crop, id: "", kind: "rect", color: "", size: 0 });
    setCrop(null);
    if (c.w < 4 || c.h < 4) return;
    const data = exportPng({ x: c.x + ox, y: c.y + oy, w: c.w, h: c.h });
    commit({ base: await (await fetch(data)).blob().then((b) => URL.createObjectURL(b)), shapes: [] });
    setTool("select");
  };

  const act = async (f: () => Promise<unknown>, msg: string) => { try { await f(); flash(msg); return true; } catch (e) { flash(String(e)); return false; } };
  const doCopy = () => act(() => api.copyPng(exportPng()), "Copied to clipboard");
  /** Serialize the whole editable state to a .neatshot file. */
  const saveProjectTo = (dest: string) => act(async () => {
    const base = await toDataUrl(doc.base);
    const background = bg.customWallpaper?.startsWith("blob:") ? { ...bg, customWallpaper: await toDataUrl(bg.customWallpaper) } : bg;
    const pr: Project = {
      format: "neatshot", version: 1, base, original: doc.base === original ? base : await toDataUrl(original),
      shapes: doc.shapes, background, counterStart: style.counterStart,
      arrowDefaults: { arrowStyle: style.arrowStyle, arrowInverse: style.arrowInverse },
      textDefaults: { textStyle: style.textStyle, font: style.font },
    };
    await api.writeTextFile(dest, JSON.stringify(pr));
    setProjPath(dest);
  }, "Project saved");
  const projName = () => fileName(path).replace(/\.[^.]+$/, "") + ".neatshot";
  const doSaveAsProject = async () => {
    let dest = await save({ defaultPath: projName(), filters: [{ name: "NeatShotX Project", extensions: ["neatshot"] }] });
    if (!dest) return;
    if (!isProject(dest)) dest += ".neatshot";
    saveProjectTo(dest);
  };
  const doSaveProject = () => (projPath ? saveProjectTo(projPath) : doSaveAsProject());
  const doSave = () => (projPath ? saveProjectTo(projPath) : act(() => api.writePng(exportPng(), pngTarget), "Saved"));
  const pngName = () => fileName(path).replace(/\.neatshot$/i, ".png");
  const doSaveAsPng = async () => {
    const dest = await save({ defaultPath: pngName(), filters: [{ name: "PNG", extensions: ["png"] }] });
    if (dest) act(() => api.writePng(exportPng(), dest), "Saved");
  };
  const doSaveAs = async () => {
    const dest = await save({ defaultPath: pngName(), filters: [{ name: "PNG", extensions: ["png"] }, { name: "NeatShotX Project (.neatshot)", extensions: ["neatshot"] }] });
    if (!dest) return;
    if (isProject(dest)) saveProjectTo(dest);
    else act(() => api.writePng(exportPng(), dest), "Saved");
  };
  const doPin = () => act(async () => api.openPin(await api.writePng(exportPng())), "Pinned");
  const doReveal = () => act(async () => revealItemInDir(await api.writePng(exportPng(), pngTarget)), "Shown in Finder");
  const doDone = async () => {
    try {
      if (projPath) {
        const ok = await saveProjectTo(projPath);
        if (ok === false) return;
      } else await api.writePng(exportPng(), pngTarget);
      await getCurrentWindow().close();
    } catch (e) { flash(String(e)); }
  };
  /** Quick canvas: white frame around the screenshot (Background panel has the full controls). */
  const addCanvas = () => setBg((b) => (b.kind === "none" ? { ...b, kind: "color", color: "#ffffff", padding: 40 } : b));

  const remove = () => { setShapes(doc.shapes.filter((s) => s.id !== selected)); setSelected(null); };
  const duplicate = () => {
    const s = doc.shapes.find((o) => o.id === selected);
    if (!s) return;
    const d = 16 * unit, copy = { ...s, id: uid(), x: s.x + d, y: s.y + d };
    setShapes([...doc.shapes, copy]);
    setSelected(copy.id);
  };
  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    commitCoalesced(`nudge:${selected}`, { ...doc, shapes: doc.shapes.map((s) => (s.id === selected ? { ...s, x: s.x + dx, y: s.y + dy } : s)) });
  };

  useEditorKeys({
    editing: !!editing, hasCrop: !!crop, hasSelection: !!selected && tool === "select",
    undo, redo, copy: doCopy, save: doSave, saveAs: doSaveAs, saveProject: doSaveProject, done: doDone, remove, duplicate, nudge, applyCrop,
    escape: () => { setCrop(null); setSelected(null); },
    setTool, zoomIn: zoom.zoomIn, zoomOut: zoom.zoomOut, zoomFit: zoom.fit, zoomActual: zoom.actual,
  });

  useEffect(() => { if (tool === "crop") setBg((b) => ({ ...b, kind: "none" })); if (tool !== "select") setSelected(null); }, [tool]);

  // Style bar edits the selected object when there is one, and always updates the defaults for new objects.
  const shown: StyleValues = sel
    ? { ...style, color: sel.color, size: sel.size, textStyle: sel.textStyle ?? "plain", font: sel.font ?? "system",
        ...(sel.kind === "arrow" ? { arrowStyle: sel.arrowStyle ?? "standard", arrowInverse: !!sel.arrowInverse } : {}) }
    : style;
  const onStyle = (p: StylePatch) => {
    setStyle((s) => ({ ...s, ...p }));
    if (!sel || !selected) return;
    const patch: Partial<Shape> = {};
    if (p.color) patch.color = p.color;
    if (p.size) { patch.size = p.size; patch.fontSize = undefined; }
    if (p.textStyle) patch.textStyle = p.textStyle;
    if (p.font) patch.font = p.font;
    if (sel.kind === "arrow") {
      if (p.arrowStyle) patch.arrowStyle = p.arrowStyle;
      if (p.arrowInverse !== undefined) patch.arrowInverse = p.arrowInverse;
    }
    if (Object.keys(patch).length)
      commitCoalesced(`style:${selected}:${Object.keys(patch).join()}`, { ...doc, shapes: doc.shapes.map((s) => (s.id === selected ? { ...s, ...patch } : s)) });
  };

  const counters = useMemo(() => {
    const m = new Map<string, number>();
    all.filter((s) => s.kind === "counter").forEach((s, i) => m.set(s.id, style.counterStart + i));
    return m;
  }, [all, style.counterStart]);
  const spots = all.filter((s) => s.kind === "spotlight").map(norm);
  const editingShape = doc.shapes.find((s) => s.id === editing);

  const finishEdit = (raw: string) => {
    const text = raw.trim();
    setDoc((d) => ({ ...d, shapes: text ? d.shapes.map((s) => (s.id === editing ? { ...s, text } : s)) : d.shapes.filter((s) => s.id !== editing) }));
    setEditing(null);
  };

  const editor = (() => {
    if (!editingShape) return null;
    const fs = fontOf(editingShape, unit), look = textLook(editingShape.textStyle, editingShape.color);
    const p = look.pill ? pill(fs) : { px: 0, py: 0, r: 0 };
    const m = measure(editText || " ", fs, editingShape.font);
    return {
      left: (editingShape.x + ox) * scale, top: (editingShape.y + oy) * scale,
      fontSize: fs * scale, width: (m.w + p.px * 2) * scale + 4,
      pad: `${p.py * scale}px ${p.px * scale}px`, radius: Math.min(p.r, (m.h + p.py * 2) / 2) * scale,
      css: textCss(editingShape.textStyle, editingShape.color, fs * scale), family: FONTS[editingShape.font ?? "system"], caret: look.fg,
    };
  })();

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-full flex-col">
      <TopBar tool={tool} setTool={setTool} styleKind={sel ? sel.kind : tool} style={shown} onStyle={onStyle}
        showBg={showBg} toggleBg={() => setShowBg((v) => !v)} addCanvas={addCanvas} saveAs={doSaveAs} saveAsPng={doSaveAsPng} saveAsProject={doSaveAsProject} done={doDone} />

      <div className="flex min-h-0 flex-1">
        <AnimatePresence initial={false}>
          {showBg && img && (
            <motion.aside key="bg" initial={{ x: -24, opacity: 0, width: 0 }} animate={{ x: 0, opacity: 1, width: 300 }}
              exit={{ x: -24, opacity: 0, width: 0 }} transition={spring.move} className="shrink-0 overflow-hidden">
              <BackgroundPanel bg={bg} setBg={setBg} img={img} />
            </motion.aside>
          )}
        </AnimatePresence>
        <div className="relative min-w-0 flex-1" style={{ background: "var(--bg-content)" }}>
          <div ref={scrollRef} className="absolute inset-0 flex overflow-auto p-6">
            {img && (
              <div className="relative m-auto shrink-0" style={{ width: W * scale, height: H * scale }}>
                <Stage ref={stageRef} width={W * scale} height={H * scale} scaleX={scale} scaleY={scale}
                  onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
                  style={{ cursor: tool === "select" ? "default" : "crosshair", boxShadow: bg.kind === "none" ? "var(--shadow-md)" : "none", borderRadius: bg.kind === "none" ? 2 : 0 }}>
                  <Layer>
                    <Backdrop bg={bg} layout={layout} img={img} />
                    <Group ref={groupRef} x={ox} y={oy} clipFunc={groupClip(layout)}>
                      <KImage image={img} name="base" />
                      {all.map((s) => (
                        <ShapeNode key={s.id} s={s} unit={unit} base={img} counter={counters.get(s.id) ?? 0}
                          draggable={tool === "select"} editing={editing === s.id}
                          onSelect={() => tool === "select" && setSelected(s.id)}
                          onDragStart={() => { setMoving(true); startSnap(s.id); }}
                          onDragMove={snapDrag}
                          onMove={(x, y) => { setMoving(false); setGuides([]); patchShape(s.id, { x, y }); }}
                          onTransform={bake}
                          onEdit={() => { if (s.kind === "text") { setEditText(s.text ?? ""); setEditing(s.id); } }} />
                      ))}
                      {spots.length > 0 && (
                        <KShape listening={false} sceneFunc={(ctx) => {
                          const c = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
                          c.beginPath();
                          c.rect(0, 0, iw, ih);
                          spots.forEach((s) => c.roundRect(s.x, s.y, s.w, s.h, 8 * unit));
                          c.fillStyle = "rgba(0,0,0,.55)";
                          c.fill("evenodd");
                        }} />
                      )}
                      {crop && (() => {
                        const c = norm({ ...crop, id: "", kind: "rect", color: "", size: 0 });
                        return <KShape name="ui" listening={false} sceneFunc={(ctx) => {
                          const k = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
                          k.beginPath(); k.rect(0, 0, iw, ih); k.rect(c.x, c.y, c.w, c.h);
                          k.fillStyle = "rgba(0,0,0,.5)"; k.fill("evenodd");
                          k.strokeStyle = "white"; k.lineWidth = 2 * unit; k.setLineDash([8 * unit, 6 * unit]); k.strokeRect(c.x, c.y, c.w, c.h);
                        }} />;
                      })()}
                    </Group>
                  </Layer>
                  {/* Overlay layer: selection UI only. Hidden during export. */}
                  <Layer ref={overlayRef}>
                    <Transformer ref={trRef} rotateEnabled={false} flipEnabled={false} resizeEnabled={resizable}
                      enabledAnchors={resizable ? (keepRatio ? CORNERS : undefined) : []} keepRatio={keepRatio}
                      borderStroke={accent} borderStrokeWidth={1.5} anchorSize={9} anchorCornerRadius={5} anchorStroke={accent}
                      anchorFill="#fff" anchorStrokeWidth={1.5} padding={2}
                      boundBoxFunc={snapResize}
                      onTransformStart={() => sel && startSnap(sel.id)} onTransformEnd={() => setGuides([])} />
                    <Group x={ox} y={oy}>
                      {guides.map((g, i) => (
                        <Line key={i} name="ui" listening={false} stroke={accent} strokeWidth={1 / scale} strokeScaleEnabled
                          points={g.o === "v" ? [g.pos, g.from, g.pos, g.to] : [g.from, g.pos, g.to, g.pos]} />
                      ))}
                      {sel && linear && !moving && !editing && (
                        <LineHandles s={sel} scale={scale} onChange={setLive}
                          onEnd={(n) => { setLive(null); patchShape(n.id, { x: n.x, y: n.y, w: n.w, h: n.h, curve: n.curve }); }} />
                      )}
                    </Group>
                  </Layer>
                </Stage>
                {editingShape && editor && (
                  <textarea autoFocus value={editText} rows={Math.max(1, editText.split("\n").length)} spellCheck={false}
                    className="absolute resize-none overflow-hidden border-0 font-bold outline-none"
                    style={{
                      left: editor.left, top: editor.top, fontSize: editor.fontSize, width: Math.max(editor.width, 24), ...editor.css,
                      padding: editor.pad, borderRadius: editor.radius, lineHeight: 1, fontFamily: editor.family,
                      boxShadow: "0 0 0 2px var(--accent)", caretColor: editor.caret,
                    }}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={(e) => finishEdit(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) (e.target as HTMLTextAreaElement).blur(); }} />
                )}
              </div>
            )}
          </div>

          <AnimatePresence>
            {crop && tool === "crop" && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={spring.ui} className="hud absolute bottom-12 left-1/2 z-30 flex gap-1 rounded-full p-1" style={{ x: "-50%" }}>
                <button className="hud-btn" onClick={() => setCrop(null)}>Cancel</button>
                <button className="hud-btn hud-btn--primary" onClick={applyCrop}>Apply Crop</button>
              </motion.div>
            )}
          </AnimatePresence>
          <Toast text={toast} />
        </div>

      </div>

      <BottomBar zoom={zoom} canRevert={doc.base !== original || doc.shapes.length > 0} revert={revert}
        materialize={() => api.writePng(exportPng())} share={doReveal} pin={doPin} copy={doCopy} />
    </div>
    </MotionConfig>
  );
}
