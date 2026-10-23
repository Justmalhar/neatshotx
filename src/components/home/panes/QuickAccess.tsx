import { Checkbox, PopUp, Section } from "../form";
import type { PaneProps } from "./types";

export default function QuickAccess({ s, set }: PaneProps) {
  return (
    <>
      <Section label="Position:">
        <PopUp label="Position" className="w-28" value={s.qa_position} options={[["left", "Left"], ["right", "Right"]]} onChange={(v) => set("qa_position", v)} />
      </Section>
      <Section label="Auto-close:">
        <PopUp label="Auto-close" className="w-28" value={s.qa_auto_close_secs} onChange={(v) => set("qa_auto_close_secs", v)}
          options={[[0, "Never"], [5, "5 seconds"], [10, "10 seconds"], [30, "30 seconds"], [60, "60 seconds"]]} />
      </Section>
      <Section label="Dismissal:">
        <Checkbox checked={s.qa_close_after_drag} onChange={(v) => set("qa_close_after_drag", v)}>Close after dragging</Checkbox>
      </Section>
    </>
  );
}
