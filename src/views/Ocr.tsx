import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { AlertTriangle, Check, Copy, Loader2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { api, param } from "../lib/api";
import { IconButton } from "../components/overlays/IconButton";
import { materialize } from "../lib/motion";

const flat = (t: string) => t.replace(/\s*\n\s*/g, " ");

/** Capture Text: Tesseract (WASM) OCR, result copied to the clipboard. */
export default function Ocr() {
  const reduce = useReducedMotion();
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(true);

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

  const close = () => getCurrentWindow().destroy();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  const shown = text !== null && joined ? flat(text) : text;
  const copy = async (s: string) => { await writeText(s); setCopied(true); };
  const setMode = (j: boolean) => { setJoined(j); if (text !== null) copy(j ? flat(text) : text); };
  const words = shown ? shown.split(/\s+/).filter(Boolean).length : 0;
  const loading = text === null && !err;

  return (
    <motion.div
      data-tauri-drag-region
      className="mat-hud flex h-full select-none flex-col gap-2 rounded-[var(--r-xl)] p-3"
      initial={reduce ? { opacity: 0 } : materialize.initial}
      animate={reduce ? { opacity: 1 } : materialize.animate}
      transition={{ type: "spring", bounce: 0, duration: 0.35 }}
    >
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-semibold" data-tauri-drag-region>
          {loading ? <><Loader2 size={14} className="animate-spin" />Recognizing text…</>
            : err ? <><AlertTriangle size={14} className="text-[var(--danger)]" />Couldn't recognize text</>
            : copied ? <><Check size={14} className="text-[var(--success)]" />Copied to clipboard</>
            : <>Recognized text</>}
        </div>
        {text !== null && <span className="tabular text-[11px] text-white/60" data-tauri-drag-region>
          {shown?.length.toLocaleString()} chars · {words.toLocaleString()} words</span>}
        <IconButton label="Close (Esc)" onClick={close}><X size={14} /></IconButton>
      </div>

      <textarea
        readOnly spellCheck={false}
        placeholder={loading ? "" : undefined}
        value={err ?? shown ?? ""}
        className={`min-h-0 flex-1 cursor-text resize-none select-text rounded-[var(--r-md)] bg-black/25 p-2 text-[12px] leading-snug outline-none
          focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${err ? "text-[var(--danger)]" : "text-white"}`}
      />

      {text !== null && (
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-white/10 p-0.5" role="radiogroup" aria-label="Line breaks">
            {([[false, "Keep line breaks"], [true, "Single line"]] as const).map(([v, l]) => (
              <button key={l} role="radio" aria-checked={joined === v} onClick={() => setMode(v)}
                className={`h-6 rounded-full px-2.5 text-[11px] font-medium transition-colors ${joined === v ? "bg-white/25" : "text-white/70 hover:text-white"}`}>{l}</button>
            ))}
          </div>
          <IconButton wide tone="primary" label="Copy" className="ml-auto" onClick={() => copy(shown ?? "")}><Copy size={13} />Copy</IconButton>
        </div>
      )}
    </motion.div>
  );
}
