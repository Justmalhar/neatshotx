import { Checkbox, PopUp, Section } from "../form";
import type { PaneProps } from "./types";

export default function Screenshots({ s, set }: PaneProps) {
  return (
    <>
      <Section label="Self-timer interval:">
        <PopUp label="Self-timer interval" className="w-28" value={s.self_timer_secs} onChange={(v) => set("self_timer_secs", v)}
          options={[...new Set([3, 5, 10, 15, 30, s.self_timer_secs])].sort((a, b) => a - b).map((n) => [n, `${n} seconds`] as [number, string])} />
      </Section>
      <Section label="Scrolling capture:">
        <Checkbox checked={s.scroll_auto} onChange={(v) => set("scroll_auto", v)}
          caption="Scrolls the selected area for you and stops at the bottom. On macOS this needs Accessibility permission; otherwise scroll by hand.">Scroll automatically</Checkbox>
      </Section>
      <Section label="Area selection:">
        <Checkbox checked={s.selector_remember_last} onChange={(v) => set("selector_remember_last", v)} caption="Start the area selector where you left off">Remember last selection</Checkbox>
        <Checkbox checked={s.selector_show_magnifier} onChange={(v) => set("selector_show_magnifier", v)} caption="Pixel loupe next to the crosshair">Show magnifier</Checkbox>
      </Section>
    </>
  );
}
