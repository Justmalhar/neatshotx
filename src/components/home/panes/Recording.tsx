import { Caption, Checkbox, PopUp, Section } from "../form";
import type { PaneProps } from "./types";

export default function Recording({ s, set }: PaneProps) {
  return (
    <>
      <Section label="Frame rate:">
        <PopUp label="Frame rate" className="w-28" value={s.record_fps} onChange={(v) => set("record_fps", v)} options={[15, 24, 30, 60].map((f) => [f, `${f} FPS`] as [number, string])} />
      </Section>
      <Section label="Before recording:">
        <Checkbox checked={s.record_countdown} onChange={(v) => set("record_countdown", v)}>Countdown before recording</Checkbox>
      </Section>
      <Section label="Audio:">
        <Checkbox checked={s.record_mic} onChange={(v) => set("record_mic", v)}>Record microphone</Checkbox>
        <input aria-label="Microphone device" className="input w-56" placeholder="Default microphone" value={s.record_mic_device} onChange={(e) => set("record_mic_device", e.target.value)} />
        <Caption>Leave empty for the system default. Required on Windows.</Caption>
        <Checkbox checked={s.record_system_audio} onChange={(v) => set("record_system_audio", v)} caption="Currently Linux (PulseAudio) only">Record computer audio</Checkbox>
      </Section>
      <Section label="Input overlays:">
        <Checkbox checked={s.record_show_clicks} onChange={(v) => set("record_show_clicks", v)}>Highlight clicks</Checkbox>
        <Checkbox checked={s.record_show_keys} onChange={(v) => set("record_show_keys", v)}>Show keystrokes</Checkbox>
        <div className="pl-[23px]"><Checkbox checked={s.keystrokes_only_modifiers} onChange={(v) => set("keystrokes_only_modifiers", v)}>Only modifier shortcuts</Checkbox></div>
        <Caption>On macOS, keystrokes are never shown while a password field has focus.</Caption>
      </Section>
      <Section label="Webcam:">
        <Checkbox checked={s.record_webcam} onChange={(v) => set("record_webcam", v)}>Show webcam overlay</Checkbox>
      </Section>
    </>
  );
}
