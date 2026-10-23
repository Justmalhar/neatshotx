import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, Square, Trash2, Check } from "lucide-react";
import { api } from "../lib/api";
import { HudPill } from "../components/overlays/HudPill";
import { IconButton } from "../components/overlays/IconButton";

export default function RecordBar() {
  const reduce = useReducedMotion();
  const [secs, setSecs] = useState(0);
  const [stopping, setStopping] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => { clearInterval(t); clearTimeout(confirmTimer.current); };
  }, []);

  const stop = (gif: boolean) => { setStopping(true); api.stopRecording(gif); };
  // Discard: first click arms (turns into a check), second click within 2.5s confirms.
  const discard = () => {
    if (!confirm) {
      setConfirm(true);
      confirmTimer.current = setTimeout(() => setConfirm(false), 2500);
      return;
    }
    setStopping(true);
    api.cancelRecording();
  };
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");

  return (
    <HudPill className="gap-2 px-3">
      {stopping ? (
        <div className="flex items-center gap-2 pl-1 text-[13px] font-medium" data-tauri-drag-region>
          <Loader2 size={15} className="animate-spin" /> Saving…
        </div>
      ) : (
        <>
          <span className="relative ml-1 grid h-2.5 w-2.5 place-items-center" data-tauri-drag-region>
            {!reduce && <motion.span className="absolute h-2.5 w-2.5 rounded-full bg-[var(--danger)]"
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }} />}
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
          </span>
          <span className="tabular w-11 text-[14px] font-medium" data-tauri-drag-region>{mm}:{ss}</span>
          <div className="ml-auto flex items-center gap-1">
            <IconButton tone="danger" label="Stop & save MP4" onClick={() => stop(false)}><Square size={11} fill="currentColor" /></IconButton>
            <IconButton wide label="Stop & save GIF" onClick={() => stop(true)}>GIF</IconButton>
            <IconButton label={confirm ? "Click again to discard" : "Discard"} onClick={discard}
              className={confirm ? "!bg-[var(--danger)]" : ""}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={String(confirm)} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.12 }}>
                  {confirm ? <Check size={14} /> : <Trash2 size={14} />}
                </motion.span>
              </AnimatePresence>
            </IconButton>
          </div>
        </>
      )}
    </HudPill>
  );
}
