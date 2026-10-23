import Group from "../ui/Group";
import Row, { SelectRow, ToggleRow } from "../ui/Row";
import type { PaneProps } from "./types";

export default function Recording({ s, set }: PaneProps) {
  return (
    <>
      <Group title="Video">
        <SelectRow label="Frame rate" value={s.record_fps} options={[15, 24, 30, 60].map((f) => [f, `${f} fps`] as [number, string])} onChange={(v) => set("record_fps", v)} />
        <ToggleRow label="Countdown before recording" checked={s.record_countdown} onChange={(v) => set("record_countdown", v)} />
        <ToggleRow label="Show webcam overlay" checked={s.record_webcam} onChange={(v) => set("record_webcam", v)} />
      </Group>
      <Group title="Audio">
        <ToggleRow label="Record microphone" checked={s.record_mic} onChange={(v) => set("record_mic", v)} />
        <Row label="Microphone device" caption="Leave empty for the system default. Required on Windows." keywords="mic input">
          <input className="input w-56" placeholder="Default" value={s.record_mic_device} onChange={(e) => set("record_mic_device", e.target.value)} />
        </Row>
        <ToggleRow label="Record computer audio" caption="Currently Linux (PulseAudio) only" checked={s.record_system_audio} onChange={(v) => set("record_system_audio", v)} />
      </Group>
      <Group title="Input overlays" footer="On macOS, keystrokes are never shown while a password field has focus.">
        <ToggleRow label="Highlight clicks" checked={s.record_show_clicks} onChange={(v) => set("record_show_clicks", v)} />
        <ToggleRow label="Show keystrokes" checked={s.record_show_keys} onChange={(v) => set("record_show_keys", v)} />
        <ToggleRow label="Only modifier shortcuts" caption="Show ⌘C, hide plain typing" checked={s.keystrokes_only_modifiers} onChange={(v) => set("keystrokes_only_modifiers", v)} />
      </Group>
    </>
  );
}
