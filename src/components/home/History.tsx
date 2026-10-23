import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Copy, FolderOpen, Pencil, Pin, Trash2, UploadCloud } from "lucide-react";
import { api, fileName, fileSrc, isGif, isVideo } from "../../lib/api";

export default function History() {
  const [items, setItems] = useState<string[]>([]);
  const [rev, setRev] = useState(0);
  const refresh = () => api.listHistory().then(setItems);
  useEffect(() => {
    refresh();
    const un = [listen("capture-added", refresh), listen("capture-updated", () => setRev((r) => r + 1))];
    return () => un.forEach((p) => p.then((f) => f()));
  }, []);

  if (!items.length) return <p className="muted text-sm">No captures yet. Try Capture Area from the tray menu (⌥⇧2).</p>;

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Capture history</h1>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {items.map((p) => {
          const image = !isVideo(p) && !isGif(p);
          return (
            <div key={p} className="glass group overflow-hidden rounded-xl">
              <div className="relative aspect-video bg-black/5">
                {isVideo(p) ? <video src={fileSrc(p)} className="h-full w-full object-cover" muted />
                  : <img src={`${fileSrc(p)}?v=${rev}`} className="h-full w-full object-cover" loading="lazy" />}
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition group-hover:opacity-100">
                  {image && <B t="Annotate" on={() => api.openEditor(p)}><Pencil size={14} /></B>}
                  {image && <B t="Copy" on={() => api.copyImage(p)}><Copy size={14} /></B>}
                  {image && <B t="Pin" on={() => api.openPin(p)}><Pin size={14} /></B>}
                  <B t="Upload" on={() => api.upload(p).then((u) => alert(`Link copied:\n${u}`)).catch((e) => alert(e))}><UploadCloud size={14} /></B>
                  <B t="Show in folder" on={() => revealItemInDir(p)}><FolderOpen size={14} /></B>
                  <B t="Delete" on={() => api.deleteCapture(p).then(refresh)}><Trash2 size={14} /></B>
                </div>
              </div>
              <div className="muted truncate px-3 py-2 text-xs">{fileName(p)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function B({ t, on, children }: { t: string; on: () => void; children: React.ReactNode }) {
  return <button title={t} onClick={on} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-black transition hover:scale-105">{children}</button>;
}
