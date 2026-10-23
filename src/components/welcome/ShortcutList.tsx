import { GLYPH, Keycap } from "../home/ShortcutInput";
import { ACTIONS } from "../home/panes/Shortcuts";
import type { Settings } from "../../lib/api";

/** Read-only summary of the configured global shortcuts. */
export default function ShortcutList({ shortcuts }: { shortcuts: Settings["shortcuts"] }) {
  return (
    <ul className="mt-2 grid gap-1">
      {ACTIONS.filter(([k]) => shortcuts[k]).map(([k, label]) => (
        <li key={k} className="flex items-center justify-between gap-3">
          <span className="t-body">{label}</span>
          <span className="flex gap-1">{shortcuts[k].split("+").map((p) => <Keycap key={p}>{GLYPH[p] ?? p}</Keycap>)}</span>
        </li>
      ))}
    </ul>
  );
}
