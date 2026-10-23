import Group from "../ui/Group";
import Row, { ToggleRow } from "../ui/Row";
import Stepper from "../ui/Stepper";
import type { PaneProps } from "./types";

export default function Capture({ s, set }: PaneProps) {
  return (
    <>
      <Group title="After capture">
        <ToggleRow label="Copy to clipboard" checked={s.copy_after_capture} onChange={(v) => set("copy_after_capture", v)} />
        <ToggleRow label="Save to save location" checked={s.save_after_capture} onChange={(v) => set("save_after_capture", v)} />
        <ToggleRow label="Show Quick Access overlay" checked={s.show_quick_access} onChange={(v) => set("show_quick_access", v)} />
      </Group>
      <Group title="While capturing">
        <ToggleRow label="Hide desktop icons" caption="Icons come back as soon as the capture finishes" checked={s.hide_desktop_icons_while_capturing} onChange={(v) => set("hide_desktop_icons_while_capturing", v)} />
        <ToggleRow label="Remember last selection" caption="Start the area selector where you left off" checked={s.selector_remember_last} onChange={(v) => set("selector_remember_last", v)} />
        <ToggleRow label="Show magnifier" caption="Pixel loupe next to the crosshair" checked={s.selector_show_magnifier} onChange={(v) => set("selector_show_magnifier", v)} />
      </Group>
      <Group title="Self-timer">
        <Row label="Delay" caption="Countdown before a timed capture">
          <Stepper value={s.self_timer_secs} min={1} max={30} unit="sec" onChange={(v) => set("self_timer_secs", v)} />
        </Row>
      </Group>
    </>
  );
}
