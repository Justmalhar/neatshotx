import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import Group from "../ui/Group";
import Row, { SelectRow, ToggleRow } from "../ui/Row";
import type { PaneProps } from "./types";

export default function General({ s, set }: PaneProps) {
  const [login, setLogin] = useState(false);
  useEffect(() => { isEnabled().then(setLogin).catch(() => {}); }, []);
  return (
    <>
      <Group title="Startup">
        <ToggleRow label="Launch at login" caption="Start NeatShotX in the menu bar when you sign in" checked={login}
          onChange={async (v) => { try { v ? await enable() : await disable(); setLogin(v); } catch { /* ignored */ } }} />
      </Group>
      <Group title="Saving">
        <Row label="Save location" caption={s.save_dir}>
          <button className="btn btn-secondary" onClick={async () => { const d = await open({ directory: true, defaultPath: s.save_dir }); if (typeof d === "string") set("save_dir", d); }}>Change…</button>
          <button className="btn btn-secondary" onClick={() => revealItemInDir(s.save_dir)}>Reveal</button>
        </Row>
        <SelectRow label="Image format" value={s.image_format} options={[["png", "PNG"], ["jpg", "JPG"]]} onChange={(v) => set("image_format", v)} />
      </Group>
      <Group title="Feedback">
        <ToggleRow label="Play sounds" caption="Shutter and recording cues" checked={s.play_sounds} onChange={(v) => set("play_sounds", v)} />
      </Group>
    </>
  );
}
