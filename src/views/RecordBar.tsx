import { useEffect, useState } from "react";
import { Square, Trash2, Film } from "lucide-react";
import { api } from "../lib/api";

export default function RecordBar() {
  const [secs, setSecs] = useState(0);
  const [stopping, setStopping] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const stop = (gif: boolean) => { setStopping(true); api.stopRecording(gif); };
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  return (
    <div className="glass flex h-full items-center gap-1 rounded-full px-2" data-tauri-drag-region>
      <span className="ml-1 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
      <span className="w-12 text-center text-sm font-medium tabular-nums" data-tauri-drag-region>{stopping ? "…" : `${mm}:${ss}`}</span>
      <button className="btn" title="Stop & save MP4" disabled={stopping} onClick={() => stop(false)}><Square size={14} fill="currentColor" />MP4</button>
      <button className="btn" title="Stop & save GIF" disabled={stopping} onClick={() => stop(true)}><Film size={14} />GIF</button>
      <button className="btn" title="Discard" disabled={stopping} onClick={() => api.cancelRecording()}><Trash2 size={14} /></button>
    </div>
  );
}
