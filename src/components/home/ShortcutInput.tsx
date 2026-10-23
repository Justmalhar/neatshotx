import { useState } from "react";
import { X } from "lucide-react";

const MOD_KEYS = new Set(["Meta", "Control", "Alt", "Shift"]);
const mac = /Mac|iPhone|iPad/.test(navigator.platform);
export const GLYPH: Record<string, string> = mac
  ? { CmdOrCtrl: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧" }
  : { CmdOrCtrl: "Ctrl", Ctrl: "Ctrl", Alt: "Alt", Shift: "Shift" };
const order = ["Ctrl", "Alt", "Shift", "CmdOrCtrl"];

export const Keycap = ({ children }: { children: React.ReactNode }) => (
  <kbd className="grid h-6 min-w-6 place-items-center rounded-[5px] bg-[var(--bg-content)] px-1.5 font-[var(--font)] text-[12px] font-medium shadow-[var(--shadow-sm),inset_0_-1px_0_var(--separator)]">{children}</kbd>
);

/** Key-cap token field. Click, press a combo; Backspace clears. Stores Tauri accelerator strings ("Alt+Shift+2"). */
export default function ShortcutInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [rec, setRec] = useState(false);
  const parts = value ? value.split("+").sort((a, b) => (order.indexOf(a) + 1 || 9) - (order.indexOf(b) + 1 || 9)) : [];
  return (
    <span className="flex items-center gap-1">
      <span
        tabIndex={0}
        role="button"
        aria-label="Record shortcut"
        onFocus={() => setRec(true)}
        onBlur={() => setRec(false)}
        onKeyDown={(e) => {
          e.preventDefault();
          const el = e.currentTarget;
          if (e.key === "Escape") return el.blur();
          if (e.key === "Backspace" || e.key === "Delete") { onChange(""); return el.blur(); }
          if (MOD_KEYS.has(e.key)) return;
          const mods = [e.metaKey && "CmdOrCtrl", e.ctrlKey && !e.metaKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift"].filter(Boolean);
          if (!mods.length) return;
          onChange([...mods, e.code.replace(/^Key|^Digit/, "")].join("+"));
          el.blur();
        }}
        className={`flex h-8 min-w-28 cursor-default items-center justify-center gap-1 rounded-[var(--r-sm)] px-2 outline-none transition-shadow ${
          rec ? "bg-[var(--bg-content)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_45%,transparent)]" : "bg-[var(--fill)]"}`}
      >
        {rec ? <span className="t-caption">Press shortcut…</span>
          : parts.length ? parts.map((p, i) => <Keycap key={i}>{GLYPH[p] ?? p}</Keycap>)
          : <span className="t-caption">Record</span>}
      </span>
      {value && !rec && (
        <button className="btn btn-icon !h-6 !w-6" aria-label="Clear shortcut" onClick={() => onChange("")}><X size={12} /></button>
      )}
    </span>
  );
}
