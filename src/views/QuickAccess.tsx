import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { save } from "@tauri-apps/plugin-dialog";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Download, Film, Pencil, Pin, UploadCloud, X, Check } from "lucide-react";
import { api, fileName, fileSrc, isGif, isVideo } from "../lib/api";

const CARD_H = 172;
const GAP = 10;

export default function QuickAccess() {
  const [items, setItems] = useState<string[]>([]);
  const [rev, setRev] = useState(0); // cache-bust thumbnails after the editor overwrites a file

  useEffect(() => {
    const pull = () => api.takePending().then((p) => p.length && setItems((cur) => [...p.reverse(), ...cur.filter((c) => !p.includes(c))]));
    pull();
    const un = [listen("qa-pending", pull), listen("capture-updated", () => setRev((r) => r + 1))];
    return () => un.forEach((p) => p.then((f) => f()));
  }, []);

  const hadItems = useRef(false);
  useEffect(() => {
    if (items.length) hadItems.current = true;
    if (!items.length) {
      if (hadItems.current) getCurrentWindow().destroy();
      return;
    }
    api.qaResize(Math.min(items.length, 4) * (CARD_H + GAP) + GAP);
  }, [items]);

  const remove = (p: string) => setItems((cur) => cur.filter((c) => c !== p));

  return (
    <div className="flex h-full flex-col gap-2.5 overflow-y-auto p-2.5">
      <AnimatePresence initial={false}>
        {items.map((p) => (
          <motion.div
            key={p}
            layout
            initial={{ opacity: 0, x: -40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <Card path={p} rev={rev} onClose={() => remove(p)} onReplace={(np) => setItems((cur) => cur.map((c) => (c === p ? np : c)))} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Card({ path, rev, onClose, onReplace }: { path: string; rev: number; onClose: () => void; onReplace: (p: string) => void }) {
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const video = isVideo(path);
  const image = !video && !isGif(path);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 1400); };
  const run = async (f: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await f(); flash(msg); } catch (e) { flash(String(e)); } finally { setBusy(false); }
  };

  const saveAs = async () => {
    const dest = await save({ defaultPath: fileName(path) });
    if (dest) await run(() => api.copyFile(path, dest), "Saved");
  };

  return (
    <div
      className="glass group relative overflow-hidden rounded-2xl"
      style={{ height: CARD_H }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        startDrag({ item: [path], icon: image ? path : "" }).catch(() => {});
      }}
    >
      {video ? (
        <video src={fileSrc(path)} className="h-full w-full object-cover" muted autoPlay loop />
      ) : (
        <img src={`${fileSrc(path)}?v=${rev}`} className="h-full w-full object-cover" draggable={false} />
      )}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/45 p-2 opacity-0 backdrop-blur-[2px] transition-opacity duration-150 group-hover:opacity-100">
        <div className="flex justify-between">
          <IconBtn title="Close" onClick={onClose}><X size={14} /></IconBtn>
          <div className="flex gap-1">
            {image && <IconBtn title="Pin" onClick={() => api.openPin(path)}><Pin size={14} /></IconBtn>}
            {image && <IconBtn title="Annotate" onClick={() => { api.openEditor(path); onClose(); }}><Pencil size={14} /></IconBtn>}
            {video && <IconBtn title="Convert to GIF" onClick={() => run(async () => onReplace(await api.convertToGif(path)), "GIF ready")}><Film size={14} /></IconBtn>}
            <IconBtn title="Upload & copy link" onClick={() => run(() => api.upload(path), "Link copied")}><UploadCloud size={14} /></IconBtn>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          {image && <button className="btn bg-white/90 text-black hover:bg-white" onClick={() => run(() => api.copyImage(path), "Copied")}><Copy size={14} />Copy</button>}
          <button className="btn bg-white/90 text-black hover:bg-white" onClick={saveAs}><Download size={14} />Save</button>
        </div>
      </div>
      <AnimatePresence>
        {(toast || busy) && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-lg bg-black/80 px-2 py-1 text-xs text-white">
            {busy ? "Working…" : <><Check size={12} />{toast}</>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-black transition hover:scale-105 hover:bg-white" />;
}
