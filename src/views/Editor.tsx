import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Group, Image as KImage, Layer, Rect, Shape as KShape, Stage, Transformer } from "react-konva";
import { save } from "@tauri-apps/plugin-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Download, ImagePlus, Pin, Redo2, Save, Undo2, UploadCloud, Check } from "lucide-react";
import { api, fileName, param } from "../lib/api";
import Toolbar, { TOOLS } from "../components/editor/Toolbar";
import ShapeNode from "../components/editor/ShapeNode";
import BackgroundPanel from "../components/editor/BackgroundPanel";
import { GRADIENTS, norm, type Background, type Shape, type Tool } from "../components/editor/types";

type Doc = { base: string; shapes: Shape[] };
const uid = () => Math.random().toString(36).slice(2);

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
  const path = param("p") ?? "";
  const [doc, setDoc] = useState<Doc>({ base: "", shapes: [] });
  const [past, setPast] = useState<Doc[]>([]);
  const [future, setFuture] = useState<Doc[]>([]);
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState("#ff3b30");
  const [size, setSize] = useState(4);
  const [emoji, setEmoji] = useState("👍");
  const [draft, setDraft] = useState<Shape | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [bg, setBg] = useState<Background>({ enabled: false, padding: 64, gradient: 0, radius: 12, shadow: true });
  const [view, setView] = useState({ w: 800, h: 600 });
  const [toast, setToast] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const img = useImage(doc.base);
  const down = useRef(false);

  useEffect(() => { api.blobUrl(path).then((base) => setDoc({ base, shapes: [] })); }, [path]);

  useEffect(() => {
    const el = areaRef.current!;
    const ro = new ResizeObserver(() => setView({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const iw = img?.width ?? 1, ih = img?.height ?? 1;
  const unit = Math.max(1, iw / 1400);
  const pad = bg.enabled ? bg.padding * unit : 0;
  const W = iw + pad * 2, H = ih + pad * 2;
  const scale = Math.min(1, (view.w - 48) / W, (view.h - 48) / H);

  const commit = useCallback((next: Doc) => {
    setPast((p) => [...p.slice(-50), doc]);
    setFuture([]);
    setDoc(next);
  }, [doc]);
  const setShapes = (shapes: Shape[]) => commit({ ...doc, shapes });
  const undo = () => past.length && (setFuture((f) => [doc, ...f]), setDoc(past[past.length - 1]), setPast((p) => p.slice(0, -1)));
  const redo = () => future.length && (setPast((p) => [...p, doc]), setDoc(future[0]), setFuture((f) => f.slice(1)));

  const pointer = () => groupRef.current!.getRelativePointerPosition()!;

  const onDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editing) return;
    if (tool === "select") {
      if (e.target === e.target.getStage() || e.target.name() === "base") setSelected(null);
      return;
    }
    down.current = true;
    const p = pointer();
    const s: Shape = { id: uid(), kind: tool as Shape["kind"], x: p.x, y: p.y, w: 0, h: 0, color, size };
    if (tool === "crop") return setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
    if (tool === "counter") return setShapes([...doc.shapes, s]);
    if (tool === "emoji") return setShapes([...doc.shapes, { ...s, text: emoji }]);
    if (tool === "text") {
      setShapes([...doc.shapes, { ...s, text: "" }]);
      return setEditing(s.id);
    }
    if (tool === "pen" || tool === "highlighter") s.points = [0, 0];
    setDraft(s);
  };

  const onMove = () => {
    if (!down.current) return;
    const p = pointer();
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

  // Transformer follows the selected node (move-only).
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selected ? stageRef.current?.findOne(`#${selected}`) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selected, doc]);

  /** Full-resolution PNG of the current composition. */
  const exportPng = (region?: { x: number; y: number; w: number; h: number }) => {
    const st = stageRef.current!;
    trRef.current?.nodes([]);
    const r = region ?? { x: -pad, y: -pad, w: W, h: H };
    return st.toDataURL({ x: (r.x + pad) * scale, y: (r.y + pad) * scale, width: r.w * scale, height: r.h * scale, pixelRatio: 1 / scale });
  };

  const applyCrop = async () => {
    if (!crop) return;
    const c = norm({ ...crop, id: "", kind: "rect", color: "", size: 0 });
    setCrop(null);
    if (c.w < 4 || c.h < 4) return;
    const data = exportPng({ x: c.x, y: c.y, w: c.w, h: c.h });
    commit({ base: await (await fetch(data)).blob().then((b) => URL.createObjectURL(b)), shapes: [] });
    setTool("select");
  };

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 1500); };
  const act = async (f: () => Promise<unknown>, msg: string) => { try { await f(); flash(msg); } catch (e) { flash(String(e)); } };
  const doCopy = () => act(() => api.copyPng(exportPng()), "Copied to clipboard");
  const doSave = () => act(() => api.writePng(exportPng(), path), "Saved");
  const doSaveAs = async () => {
    const dest = await save({ defaultPath: fileName(path), filters: [{ name: "PNG", extensions: ["png"] }] });
    if (dest) act(() => api.writePng(exportPng(), dest), "Saved");
  };
  const doPin = () => act(async () => api.openPin(await api.writePng(exportPng())), "Pinned");
  const doUpload = () => act(async () => api.upload(await api.writePng(exportPng(), path)), "Link copied");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || (e.target as HTMLElement).tagName === "INPUT") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key === "c") { e.preventDefault(); doCopy(); return; }
      if (mod && e.key === "s") { e.preventDefault(); e.shiftKey ? doSaveAs() : doSave(); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) { setShapes(doc.shapes.filter((s) => s.id !== selected)); setSelected(null); return; }
      if (e.key === "Enter" && crop) { applyCrop(); return; }
      if (e.key === "Escape") { setCrop(null); setSelected(null); return; }
      const t = TOOLS.find((t) => t.key === e.key.toLowerCase());
      if (t && !mod) setTool(t.id);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  useEffect(() => { if (tool === "crop") setBg((b) => ({ ...b, enabled: false })); if (tool !== "select") setSelected(null); }, [tool]);

  const all = draft ? [...doc.shapes, draft] : doc.shapes;
  const counters = useMemo(() => {
    const m = new Map<string, number>();
    all.filter((s) => s.kind === "counter").forEach((s, i) => m.set(s.id, i + 1));
    return m;
  }, [all]);
  const spots = all.filter((s) => s.kind === "spotlight").map(norm);
  const editingShape = doc.shapes.find((s) => s.id === editing);
  const [g0, g1] = GRADIENTS[bg.gradient];

  return (
    <div className="flex h-full flex-col">
      <header className="glass relative z-10 m-2 flex items-center justify-between gap-2 rounded-2xl px-2 py-1.5">
        <Toolbar {...{ tool, setTool, color, setColor, size, setSize, emoji, setEmoji }} />
        <div className="flex items-center gap-1">
          <button className="btn !p-2" title="Undo (⌘Z)" onClick={undo} disabled={!past.length}><Undo2 size={16} /></button>
          <button className="btn !p-2" title="Redo (⇧⌘Z)" onClick={redo} disabled={!future.length}><Redo2 size={16} /></button>
          <button className="btn !p-2" title="Background" data-active={bg.enabled} onClick={() => setBg({ ...bg, enabled: !bg.enabled })}><ImagePlus size={16} /></button>
          <span className="mx-1 h-6 w-px bg-current opacity-15" />
          <button className="btn !p-2" title="Pin" onClick={doPin}><Pin size={16} /></button>
          <button className="btn !p-2" title="Upload" onClick={doUpload}><UploadCloud size={16} /></button>
          <button className="btn !p-2" title="Save As (⇧⌘S)" onClick={doSaveAs}><Download size={16} /></button>
          <button className="btn" title="Save (⌘S)" onClick={doSave}><Save size={16} />Save</button>
          <button className="btn btn-primary" title="Copy (⌘C)" onClick={doCopy}><Copy size={16} />Copy</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-2 px-2 pb-2">
        <div ref={areaRef} className="relative grid min-w-0 flex-1 place-items-center overflow-hidden rounded-2xl"
          style={{ backgroundImage: "repeating-conic-gradient(#8881 0 25%, transparent 0 50%)", backgroundSize: "20px 20px" }}>
          {img && (
            <Stage ref={stageRef} width={W * scale} height={H * scale} scaleX={scale} scaleY={scale}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
              style={{ cursor: tool === "select" ? "default" : "crosshair", boxShadow: bg.enabled ? "none" : "0 8px 30px rgba(0,0,0,.25)" }}>
              <Layer>
                {bg.enabled && (
                  <>
                    <Rect width={W} height={H} fillLinearGradientStartPoint={{ x: 0, y: 0 }} fillLinearGradientEndPoint={{ x: W, y: H }}
                      fillLinearGradientColorStops={[0, g0, 1, g1]} />
                    {bg.shadow && <Rect x={pad} y={pad} width={iw} height={ih} cornerRadius={bg.radius * unit} fill="black"
                      shadowColor="black" shadowBlur={40 * unit} shadowOpacity={0.45} shadowOffsetY={12 * unit} />}
                  </>
                )}
                <Group ref={groupRef} x={pad} y={pad}
                  clipFunc={bg.enabled ? (ctx) => { ctx.beginPath(); ctx.roundRect(0, 0, iw, ih, bg.radius * unit); ctx.closePath(); } : undefined}>
                  <KImage image={img} name="base" />
                  {all.filter((s) => s.kind !== "spotlight").map((s) => (
                    <ShapeNode key={s.id} s={s} unit={unit} base={img} counter={counters.get(s.id) ?? 0}
                      draggable={tool === "select"}
                      onSelect={() => tool === "select" && setSelected(s.id)}
                      onMove={(x, y) => setShapes(doc.shapes.map((o) => (o.id === s.id ? { ...o, x, y } : o)))}
                      onEdit={() => s.kind === "text" && setEditing(s.id)} />
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
                    return <KShape listening={false} sceneFunc={(ctx) => {
                      const k = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
                      k.beginPath(); k.rect(0, 0, iw, ih); k.rect(c.x, c.y, c.w, c.h);
                      k.fillStyle = "rgba(0,0,0,.5)"; k.fill("evenodd");
                      k.strokeStyle = "white"; k.lineWidth = 2 * unit; k.setLineDash([8 * unit, 6 * unit]); k.strokeRect(c.x, c.y, c.w, c.h);
                    }} />;
                  })()}
                </Group>
              </Layer>
              <Layer><Transformer ref={trRef} resizeEnabled={false} rotateEnabled={false} borderStroke="#3b82f6" /></Layer>
            </Stage>
          )}
          {editingShape && (
            <textarea autoFocus defaultValue={editingShape.text}
              className="absolute resize-none rounded border-2 border-blue-500 bg-white/90 p-1 font-bold text-black outline-none"
              style={{
                left: `calc(50% - ${(W * scale) / 2}px + ${(editingShape.x + pad) * scale}px)`,
                top: `calc(50% - ${(H * scale) / 2}px + ${(editingShape.y + pad) * scale}px)`,
                fontSize: Math.max(12, (8 * editingShape.size * unit + 10 * unit) * scale), minWidth: 160, color: editingShape.color,
              }}
              onBlur={(e) => {
                const text = e.target.value.trim();
                setDoc((d) => ({ ...d, shapes: text ? d.shapes.map((s) => (s.id === editing ? { ...s, text } : s)) : d.shapes.filter((s) => s.id !== editing) }));
                setEditing(null);
              }}
              onKeyDown={(e) => { if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) (e.target as HTMLTextAreaElement).blur(); }} />
          )}
          {crop && tool === "crop" && (
            <div className="glass absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full px-3 py-1.5 text-xs">
              <button className="btn" onClick={() => setCrop(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={applyCrop}>Apply crop ↩</button>
            </div>
          )}
          <AnimatePresence>
            {toast && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/80 px-4 py-2 text-sm text-white">
                <Check size={14} />{toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {bg.enabled && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <BackgroundPanel bg={bg} setBg={setBg} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
