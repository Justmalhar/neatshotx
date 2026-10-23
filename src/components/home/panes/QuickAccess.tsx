import Group from "../ui/Group";
import Row, { ToggleRow } from "../ui/Row";
import Segmented from "../ui/Segmented";
import type { PaneProps } from "./types";

export default function QuickAccess({ s, set }: PaneProps) {
  return (
    <>
      <Group title="Placement">
        <Row label="Position on screen" caption="Which edge the overlay stacks against">
          <Segmented label="Position" value={s.qa_position} options={[["left", "Left"], ["right", "Right"]]} onChange={(v) => set("qa_position", v)} />
        </Row>
        <Row label="Auto-close">
          <Segmented label="Auto-close" value={s.qa_auto_close_secs} onChange={(v) => set("qa_auto_close_secs", v)}
            options={[[0, "Never"], [5, "5s"], [10, "10s"], [30, "30s"], [60, "60s"]]} />
        </Row>
      </Group>
      <Group title="Dismissal">
        <ToggleRow label="Close after dragging" caption="Dismiss a capture once you drag it into another app" checked={s.qa_close_after_drag} onChange={(v) => set("qa_close_after_drag", v)} />
        <ToggleRow label="Close after uploading" checked={s.qa_close_after_upload} onChange={(v) => set("qa_close_after_upload", v)} />
      </Group>
    </>
  );
}
