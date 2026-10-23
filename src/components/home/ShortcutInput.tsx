import { useState } from "react";

const MOD_KEYS = new Set(["Meta", "Control", "Alt", "Shift"]);

/** Records a key combo as a Tauri accelerator string, e.g. "Alt+Shift+2". */
export default function ShortcutInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [rec, setRec] = useState(false);
  return (
    <input
      readOnly
      className="input w-44 text-center font-mono text-xs"
      value={rec ? "Press keys…" : value || "—"}
      onFocus={() => setRec(true)}
      onBlur={() => setRec(false)}
      onKeyDown={(e) => {
        e.preventDefault();
        if (e.key === "Backspace" || e.key === "Delete") { onChange(""); (e.target as HTMLInputElement).blur(); return; }
        if (MOD_KEYS.has(e.key)) return;
        const mods = [e.metaKey && "CmdOrCtrl", e.ctrlKey && !e.metaKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift"].filter(Boolean);
        if (!mods.length) return;
        onChange([...mods, e.code.replace(/^Key|^Digit/, "")].join("+"));
        (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
