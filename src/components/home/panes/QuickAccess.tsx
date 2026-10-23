import { CheckRow, Select, Section } from "../form";
import type { PaneProps } from "./types";

export default function QuickAccess({ s, set }: PaneProps) {
  return (
    <>
      <Section label="Position:">
        <Select label="Position" value={s.qa_position} options={[["left", "Left"], ["right", "Right"]]} onChange={(v) => set("qa_position", v)} />
      </Section>
      <Section label="Screen:">
        <CheckRow checked={s.qa_follow_active_screen} onChange={(v) => set("qa_follow_active_screen", v)} caption="Shows the overlay on the screen your cursor is on.">Move to active screen</CheckRow>
      </Section>
      <Section label="Auto-close:">
        <Select label="Auto-close" value={s.qa_auto_close_secs} onChange={(v) => set("qa_auto_close_secs", v)}
          options={[[0, "Never"], [5, "5 seconds"], [10, "10 seconds"], [30, "30 seconds"], [60, "60 seconds"]]} />
      </Section>
      <Section label="Dismissal:">
        <CheckRow checked={s.qa_close_after_drag} onChange={(v) => set("qa_close_after_drag", v)}>Close after dragging</CheckRow>
      </Section>
    </>
  );
}
