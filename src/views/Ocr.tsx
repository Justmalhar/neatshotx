import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Check, Copy, Loader2, X } from "lucide-react";
import { api, param } from "../lib/api";

/** Capture Text: Tesseract (WASM) OCR, result copied to the clipboard. */
export default function Ocr() {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const url = await api.blobUrl(param("p") ?? "");
        const { data } = await worker.recognize(url);
        await worker.terminate();
        const t = data.text.trim();
        setText(t);
        await writeText(t);
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, []);

  const shown = text && joined ? text.replace(/\s*\n\s*/g, " ") : text;
  const close = () => getCurrentWindow().destroy();

  return (
    <div className="glass flex h-full flex-col gap-2 rounded-2xl p-3" data-tauri-drag-region>
      <div className="flex items-center justify-between text-sm font-semibold" data-tauri-drag-region>
        {text === null && !err ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Recognizing text…</span>
          : err ? <span className="text-red-500">OCR failed</span>
          : <span className="flex items-center gap-2"><Check size={14} className="text-green-500" />Text copied</span>}
        <button className="btn !p-1" onClick={close}><X size={14} /></button>
      </div>
      <textarea className="input flex-1 resize-none text-xs" readOnly value={err ?? shown ?? ""} />
      {text && (
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={() => { setJoined(!joined); writeText(joined ? text : text.replace(/\s*\n\s*/g, " ")); }}>
            {joined ? "Keep line breaks" : "Remove line breaks"}
          </button>
          <button className="btn btn-primary" onClick={() => writeText(shown ?? "")}><Copy size={14} />Copy</button>
        </div>
      )}
    </div>
  );
}
