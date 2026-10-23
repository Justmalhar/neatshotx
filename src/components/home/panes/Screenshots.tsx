import { CheckRow, Select, Section } from "../form";
import type { PaneProps } from "./types";

export default function Screenshots({ s, set }: PaneProps) {
  return (
    <>
      <Section label="Self-timer interval:">
        <Select label="Self-timer interval" value={s.self_timer_secs} onChange={(v) => set("self_timer_secs", v)}
          options={[...new Set([3, 5, 10, 15, 30, s.self_timer_secs])].sort((a, b) => a - b).map((n) => [n, `${n} seconds`] as [number, string])} />
      </Section>
      <Section label="Window screenshots:">
        <CheckRow checked={s.window_shadow} onChange={(v) => set("window_shadow", v)}>Capture window shadow</CheckRow>
        <div className="t-body flex items-center gap-2">
          <span>Padding:</span>
          <Select label="Window padding" value={s.window_padding} onChange={(v) => set("window_padding", v)}
            options={[...new Set([0, 16, 32, 64, 96, s.window_padding])].sort((a, b) => a - b).map((n) => [n, n ? `${n} px` : "None"] as [number, string])} />
        </div>
      </Section>
      <Section label="Scrolling capture:">
        <CheckRow checked={s.scroll_auto} onChange={(v) => set("scroll_auto", v)}
          caption="Scrolls the selected area for you and stops at the bottom. On macOS this needs Accessibility permission; otherwise scroll by hand.">Scroll automatically</CheckRow>
      </Section>
      <Section label="Area selection:">
        <CheckRow checked={s.selector_remember_last} onChange={(v) => set("selector_remember_last", v)} caption="Start the area selector where you left off.">Remember last selection</CheckRow>
        <CheckRow checked={s.selector_show_magnifier} onChange={(v) => set("selector_show_magnifier", v)} caption="Pixel loupe next to the crosshair.">Show magnifier</CheckRow>
      </Section>
    </>
  );
}
