import { Btn, Caption, Section } from "../form";
import ShortcutInput from "../ShortcutInput";
import type { PaneProps } from "./types";

export const ACTIONS: [string, string][] = [
  ["capture-fullscreen", "Capture Fullscreen"],
  ["capture-area", "Capture Area"],
  ["capture-window", "Capture Window"],
  ["capture-previous-area", "Capture Previous Area"],
  ["scrolling-capture", "Scrolling Capture"],
  ["self-timer", "Self-Timer"],
];

export default function Shortcuts({ s, set }: PaneProps) {
  const restore = () => set("shortcuts", { ...s.shortcuts, ...Object.fromEntries(ACTIONS.map(([k], i) => [k, `Alt+Shift+${i + 1}`])) });
  return (
    <>
      {ACTIONS.map(([k, label]) => (
        <div key={k} className="grid grid-cols-[200px_1fr] items-center gap-x-3 py-1.5">
          <div className="text-right font-medium">{label}:</div>
          <ShortcutInput value={s.shortcuts[k] ?? ""} onChange={(v) => set("shortcuts", { ...s.shortcuts, [k]: v })} />
        </div>
      ))}
      <Section>
        <Caption>Click a field and press a combination. Backspace clears it.</Caption>
        <Btn onClick={restore}>Restore Defaults</Btn>
      </Section>
    </>
  );
}
