import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { motion } from "motion/react";
import { Copy, FolderOpen, Image as ImageIcon, Pencil, Pin, Trash2, UploadCloud, Video } from "lucide-react";
import { api, fileName, fileSrc, isGif, isVideo } from "../../lib/api";
import { spring } from "../../lib/motion";
import { Btn, PopUp } from "./form";
import type { PaneProps } from "./panes/types";

type Filter = "all" | "images" | "videos";
const KEEP: [number, string][] = [[0, "Forever"], [1, "1 day"], [7, "1 week"], [30, "1 month"], [90, "3 months"]];

/** "NeatShotX 2025-01-31 at 14.05.09.123.png" -> Date, or null. */
const stamp = (p: string) => {
  const m = fileName(p).match(/(\d{4})-(\d{2})-(\d{2}) at (\d{2})\.(\d{2})\.(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
};
const dayLabel = (d: Date | null) => {
  if (!d) return "Other";
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

export default function History({ s, set }: PaneProps) {
  const [items, setItems] = useState<string[]>([]);
  const [rev, setRev] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const refresh = () => api.listHistory().then(setItems);
  useEffect(() => {
    refresh();
    const un = [listen("capture-added", refresh), listen("capture-updated", () => setRev((r) => r + 1))];
    return () => un.forEach((p) => p.then((f) => f()));
  }, []);

  const shown = useMemo(() => items.filter((p) => filter === "all" || (filter === "videos") === isVideo(p)), [items, filter]);
  const groups = useMemo(() => {
    const out: { label: string; items: string[] }[] = [];
    for (const p of shown) {
      const label = dayLabel(stamp(p));
      const g = out.find((x) => x.label === label);
      g ? g.items.push(p) : out.push({ label, items: [p] });
    }
    return out;
  }, [shown]);

  const clear = async () => {
    if (await ask("This permanently deletes every capture in your history.", { title: "Clear History?", kind: "warning", okLabel: "Clear History", cancelLabel: "Cancel" })) {
      await api.clearHistory();
      refresh();
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--separator)] pb-4">
        <div className="flex items-center gap-2">
          <PopUp label="Filter" className="w-28" value={filter} onChange={setFilter} options={[["all", "All"], ["images", "Images"], ["videos", "Videos"]]} />
          <span className="t-caption">{items.length === 1 ? "1 capture" : `${items.length} captures`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Keep history:</span>
          <PopUp label="Keep history" className="w-28" value={s.history_keep_days} onChange={(v) => set("history_keep_days", v)} options={KEEP} />
          <Btn className="!text-[var(--danger)]" disabled={!items.length} onClick={clear}>Clear History…</Btn>
        </div>
      </div>

      {!shown.length ? (
        <div className="grid place-items-center gap-2 py-20 text-center">
          <ImageIcon size={56} strokeWidth={1.25} className="text-[var(--label-3)]" />
          <h2 className="t-title mt-2">{items.length ? "Nothing here" : "No captures yet"}</h2>
          <p className="t-callout max-w-xs">{items.length ? "No captures match this filter." : "Press ⌥⇧2 to capture an area, or use the menu bar icon."}</p>
        </div>
      ) : groups.map((g) => (
        <section key={g.label} className="mb-6">
          <h2 className="t-headline mb-2">{g.label}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {g.items.map((p) => <Card key={p} p={p} rev={rev} onDeleted={refresh} />)}
          </div>
        </section>
      ))}
    </>
  );
}

function Card({ p, rev, onDeleted }: { p: string; rev: number; onDeleted: () => void }) {
  const video = isVideo(p);
  const image = !video && !isGif(p);
  const d = stamp(p);
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.99 }} transition={spring.ui} className="group" title={fileName(p)}
      onDoubleClick={() => image && api.openEditor(p)}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--fill)] shadow-[var(--shadow-sm)]">
        {video ? <video src={fileSrc(p)} className="h-full w-full object-cover" muted preload="metadata" />
          : <img src={`${fileSrc(p)}?v=${rev}`} className="h-full w-full object-cover" loading="lazy" draggable={false} />}
        {video && <Video size={14} className="absolute left-2 top-2 text-white drop-shadow" />}
        <div className="mat-hud absolute inset-x-2 bottom-2 flex translate-y-1 justify-center gap-0.5 rounded-full p-1 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          {image && <A t="Annotate" on={() => api.openEditor(p)}><Pencil size={14} /></A>}
          {image && <A t="Copy" on={() => api.copyImage(p)}><Copy size={14} /></A>}
          {image && <A t="Pin" on={() => api.openPin(p)}><Pin size={14} /></A>}
          <A t="Upload" on={() => api.upload(p).then((u) => alert(`Link copied:\n${u}`)).catch((e) => alert(e))}><UploadCloud size={14} /></A>
          <A t="Show in folder" on={() => revealItemInDir(p)}><FolderOpen size={14} /></A>
          <A t="Delete" on={() => api.deleteCapture(p).then(onDeleted)}><Trash2 size={14} /></A>
        </div>
      </div>
      <div className="t-caption truncate px-1 pt-1.5">{d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : fileName(p)}</div>
    </motion.div>
  );
}

function A({ t, on, children }: { t: string; on: () => void; children: React.ReactNode }) {
  return <button title={t} aria-label={t} onClick={(e) => { e.stopPropagation(); on(); }} className="grid h-7 w-7 place-items-center rounded-full text-white transition hover:bg-white/20 active:scale-90">{children}</button>;
}
