import Group from "../ui/Group";
import Row from "../ui/Row";
import ShortcutInput from "../ShortcutInput";
import type { PaneProps } from "./types";

const ACTIONS: [string, string][] = [
  ["capture-fullscreen", "Capture Fullscreen"],
  ["capture-area", "Capture Area"],
  ["capture-window", "Capture Window"],
  ["capture-previous-area", "Capture Previous Area"],
  ["record-screen", "Record Screen"],
  ["scrolling-capture", "Scrolling Capture"],
  ["capture-text", "Capture Text (OCR)"],
  ["self-timer", "Self-Timer"],
];

export default function Shortcuts({ s, set }: PaneProps) {
  const restore = () => set("shortcuts", { ...s.shortcuts, ...Object.fromEntries(ACTIONS.map(([k], i) => [k, `Alt+Shift+${i + 1}`])) });
  return (
    <Group footer="Click a field and press a combination. Backspace clears it.">
      {ACTIONS.map(([k, label]) => (
        <Row key={k} label={label}>
          <ShortcutInput value={s.shortcuts[k] ?? ""} onChange={(v) => set("shortcuts", { ...s.shortcuts, [k]: v })} />
        </Row>
      ))}
      <Row label="Restore defaults" caption="Reset every shortcut to ⌥⇧1 – ⌥⇧8">
        <button className="btn btn-secondary" onClick={restore}>Restore Defaults</button>
      </Row>
    </Group>
  );
}
