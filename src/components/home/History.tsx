import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { nativeMenu } from "../../ui/menu";
import { Copy, FolderOpen, Image as ImageIcon, Pencil, Pin, Trash2 } from "lucide-react";
import { api, fileName, fileSrc, type HistoryItem } from "../../lib/api";
import { Select } from "./form";
import type { PaneProps } from "./panes/types";

const mac = /Mac/.test(navigator.userAgent);
const KEEP: [number, string][] = [[0, "Forever"], [1, "1 day"], [7, "1 week"], [30, "1 month"], [90, "3 months"]];

/** Capture time: parsed from the default "… 2025-01-31 at 14.05.09" name, else the file's mtime (custom templates). */
const stamp = ({ path, mtime }: HistoryItem) => {
  const m = fileName(path).match(/(\d{4})-(\d{2})-(\d{2}) at (\d{2})\.(\d{2})\.(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : new Date(mtime);
};
const dayLabel = (d: Date | null) => {
  if (!d) return "Other";
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

export default function History({ s, set }: PaneProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [rev, setRev] = useState(0);
  const refresh = () => api.listHistory().then(setItems);
  useEffect(() => {
    refresh();
    const un = [listen("capture-added", refresh), listen("capture-updated", () => setRev((r) => r + 1))];
    return () => un.forEach((p) => p.then((f) => f()));
  }, []);

  const groups = useMemo(() => {
    const out: { label: string; items: HistoryItem[] }[] = [];
    for (const it of items) {
      const label = dayLabel(stamp(it));
      const g = out.find((x) => x.label === label);
      g ? g.items.push(it) : out.push({ label, items: [it] });
    }
    return out;
  }, [items]);

  const clear = async () => {
    if (await ask("This permanently deletes every capture in your history.", { title: "Clear History?", kind: "warning", okLabel: "Clear History", cancelLabel: "Cancel" })) {
      await api.clearHistory();
      refresh();
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--separator)] pb-4">
        <span className="t-caption">{items.length === 1 ? "1 capture" : `${items.length} captures`}</span>
        <div className="flex items-center gap-2">
          <span className="t-body">Keep history:</span>
          <Select label="Keep history" value={s.history_keep_days} onChange={(v) => set("history_keep_days", v)} options={KEEP} />
          <button className="ns-btn ns-btn--destructive" disabled={!items.length} onClick={clear}>Clear History…</button>
        </div>
      </div>

      {!items.length ? (
        <div className="grid place-items-center gap-2 py-20 text-center">
          <ImageIcon size={32} strokeWidth={1.75} className="text-[var(--label-3)]" />
          <h2 className="t-title mt-2">No captures yet</h2>
          <p className="t-callout max-w-xs">Press ⌥⇧2 to capture an area, or use the menu bar icon.</p>
        </div>
      ) : groups.map((g) => (
        <section key={g.label} className="mb-6">
          <h2 className="t-headline mb-2">{g.label}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {g.items.map((it) => <Card key={it.path} it={it} rev={rev} onDeleted={refresh} />)}
          </div>
        </section>
      ))}
    </>
  );
}

function Card({ it, rev, onDeleted }: { it: HistoryItem; rev: number; onDeleted: () => void }) {
  const p = it.path;
  const d = stamp(it);
  const del = () => api.deleteCapture(p).then(onDeleted);
  const menu = (e: React.MouseEvent) => {
    e.preventDefault();
    nativeMenu([
      { label: "Annotate", action: () => api.openEditor(p) },
      { label: "Copy", action: () => api.copyImage(p) },
      { label: "Pin", action: () => api.openPin(p) },
      { label: mac ? "Show in Finder" : "Show in Folder", action: () => revealItemInDir(p) },
      "separator",
      { label: "Delete", action: del },
    ]);
  };
  return (
    <div className="group" title={fileName(p)} onDoubleClick={() => api.openEditor(p)} onContextMenu={menu}>
      <div tabIndex={0} style={{ borderRadius: "var(--r-md)" }}
        className="relative aspect-video overflow-hidden bg-[var(--fill)] shadow-[0_0_0_0.5px_var(--separator)]">
        <img src={`${fileSrc(p)}?v=${rev}`} className="h-full w-full object-cover" loading="lazy" draggable={false} />
        <div className="absolute inset-x-0 bottom-2 flex justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="flex gap-0.5 rounded-[var(--r-full)] bg-[var(--bg-content)] p-0.5 shadow-[0_0_0_0.5px_var(--separator),var(--shadow-sm)]">
            <A t="Annotate" on={() => api.openEditor(p)}><Pencil size={16} strokeWidth={1.75} /></A>
            <A t="Copy" on={() => api.copyImage(p)}><Copy size={16} strokeWidth={1.75} /></A>
            <A t="Pin" on={() => api.openPin(p)}><Pin size={16} strokeWidth={1.75} /></A>
            <A t={mac ? "Show in Finder" : "Show in Folder"} on={() => revealItemInDir(p)}><FolderOpen size={16} strokeWidth={1.75} /></A>
            <A t="Delete" on={del}><Trash2 size={16} strokeWidth={1.75} /></A>
          </div>
        </div>
      </div>
      <div className="t-caption truncate px-1 pt-1">{d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
    </div>
  );
}

function A({ t, on, children }: { t: string; on: () => void; children: React.ReactNode }) {
  return <button title={t} aria-label={t} onClick={(e) => { e.stopPropagation(); on(); }} className="ns-tool !rounded-[var(--r-full)]">{children}</button>;
}
