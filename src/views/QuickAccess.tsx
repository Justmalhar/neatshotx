import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { AnimatePresence, motion } from "motion/react";
import { isVideo, api, fileName, type Settings } from "../lib/api";
import { prefersReducedMotion, spring } from "../lib/motion";
import Card, { CARD_H } from "../components/quick-access/Card";
import StackHeader from "../components/quick-access/StackHeader";
import { playShutter } from "../components/quick-access/shutter";

const GAP = 10;
const PAD = 14;
const HEADER_H = 32;

export default function QuickAccess() {
  const [items, setItems] = useState<string[]>([]);
  const [rev, setRev] = useState(0); // cache-bust thumbnails after a file is overwritten
  const [cfg, setCfg] = useState<Pick<Settings, "qa_position" | "qa_auto_close_secs" | "qa_close_after_drag" | "qa_close_after_upload" | "play_sounds" | "save_after_capture" | "recording_save"> | null>(null);
  const seen = useRef(new Set<string>());
  const sounds = useRef(false);

  useEffect(() => {
    let un: Promise<() => void>[] = [];
    api.getSettings().then((s) => {
      sounds.current = s.play_sounds;
      setCfg(s);
      const pull = () => api.takePending().then((p) => {
        if (!p.length) return;
        if (sounds.current && p.some((x) => !seen.current.has(x))) playShutter();
        p.forEach((x) => seen.current.add(x));
        setItems((cur) => [...[...p].reverse(), ...cur.filter((c) => !p.includes(c))]);
      });
      pull();
      un = [listen("qa-pending", pull), listen("capture-updated", () => setRev((r) => r + 1))];
    });
    return () => { un.forEach((p) => p.then((f) => f())); };
  }, []);

  const hadItems = useRef(false);
  useEffect(() => {
    if (items.length) hadItems.current = true;
    if (!items.length) {
      if (hadItems.current) getCurrentWindow().destroy();
      return;
    }
    const n = Math.min(items.length, 4);
    const header = items.length >= 2 ? HEADER_H + GAP : 0;
    api.qaResize(PAD * 2 + n * CARD_H + (n - 1) * GAP + header);
  }, [items]);

  const remove = (p: string) => setItems((cur) => cur.filter((c) => c !== p));

  const saveAll = async () => {
    const dir = await open({ directory: true });
    if (typeof dir !== "string") return 0;
    const sep = dir.includes("\\") && !dir.includes("/") ? "\\" : "/";
    await Promise.all(items.map((p) => api.copyFile(p, `${dir}${sep}${fileName(p)}`)));
    return items.length;
  };

  if (!cfg) return null;
  const dir = cfg.qa_position === "left" ? -1 : 1;
  const reduced = prefersReducedMotion();
  const off = reduced ? {} : { x: dir * 300 };

  return (
    <div className="flex h-full flex-col justify-end gap-2.5 px-3.5 py-3.5">
      <AnimatePresence>
        {items.length >= 2 && <StackHeader onCloseAll={() => setItems([])} onSaveAll={saveAll} />}
      </AnimatePresence>
      <div className="no-scrollbar -mx-3.5 flex min-h-0 flex-col gap-2.5 overflow-y-auto px-3.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((p) => (
            <motion.div
              key={p}
              layout
              initial={{ opacity: 0, ...off }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, ...off }}
              transition={spring.move}
              className="shrink-0"
            >
              <Card
                path={p}
                rev={rev}
                side={cfg.qa_position}
                autoCloseSecs={cfg.qa_auto_close_secs}
                closeAfterDrag={cfg.qa_close_after_drag}
                closeAfterUpload={cfg.qa_close_after_upload}
                autoSaved={isVideo(p) ? cfg.recording_save : cfg.save_after_capture}
                onClose={() => remove(p)}
                onReplace={(np) => setItems((cur) => cur.map((c) => (c === p ? np : c)))}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
