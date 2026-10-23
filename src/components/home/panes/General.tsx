import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { Folder } from "lucide-react";
import { fileName, type Settings } from "../../../lib/api";
import { Caption, Checkbox, PopUp, Section } from "../form";
import type { PaneProps } from "./types";

const mac = /Mac/.test(navigator.platform);
const AFTER: [string, keyof Settings][] = [
  ["Show Quick Access Overlay", "show_quick_access"],
  ["Copy file to clipboard", "copy_after_capture"],
  ["Save", "save_after_capture"],
  ["Open Annotate tool", "screenshot_annotate"],
  ["Pin to the screen", "screenshot_pin"],
];

export default function General({ s, set }: PaneProps) {
  const [login, setLogin] = useState(false);
  useEffect(() => { isEnabled().then(setLogin).catch(() => {}); }, []);
  const pick = async () => { const d = await open({ directory: true, defaultPath: s.save_dir }); if (typeof d === "string") set("save_dir", d); };
  const flag = (k: keyof Settings) => s[k] as boolean;
  return (
    <>
      <Section label="Startup:">
        <Checkbox checked={login} onChange={async (v) => { try { v ? await enable() : await disable(); setLogin(v); } catch { /* ignored */ } }}>Start at login</Checkbox>
      </Section>
      <Section label="Sounds:">
        <Checkbox checked={s.play_sounds} onChange={(v) => set("play_sounds", v)}>Play sounds</Checkbox>
      </Section>
      <Section label="Export location:">
        <div className="flex items-center gap-3">
          <button onClick={pick} title={s.save_dir} className="inline-flex h-[22px] w-[180px] items-center gap-1.5 rounded-[6px] bg-[var(--bg-content)] px-2 text-left shadow-[inset_0_0_0_0.5px_var(--separator),var(--shadow-sm)]">
            <Folder size={13} className="shrink-0 text-[var(--accent)]" /><span className="truncate">{fileName(s.save_dir) || s.save_dir}</span>
          </button>
          <button className="text-[var(--accent)] hover:underline" onClick={() => revealItemInDir(s.save_dir)}>Reveal in {mac ? "Finder" : "folder"}</button>
        </div>
      </Section>
      <Section label="Desktop icons:">
        <Checkbox checked={s.hide_desktop_icons_while_capturing} onChange={(v) => set("hide_desktop_icons_while_capturing", v)}>Hide while capturing</Checkbox>
      </Section>
      <Section label="Image format:">
        <PopUp label="Image format" className="w-24" value={s.image_format} options={[["png", "PNG"], ["jpg", "JPG"]]} onChange={(v) => set("image_format", v)} />
      </Section>
      <Section label="After capture:">
        <Caption>Here you can decide what should happen after taking a screenshot.</Caption>
        <div className="w-full max-w-[380px] overflow-hidden rounded-[6px] shadow-[inset_0_0_0_0.5px_var(--separator)] ring-[0.5px] ring-[var(--separator)]">
          <div className="grid grid-cols-[84px_1fr] border-b border-[var(--separator)] px-3 py-1 font-medium">
            <span>Screenshot</span><span>Action</span>
          </div>
          {AFTER.map(([label, shot], i) => (
            <div key={label} className={`grid grid-cols-[84px_1fr] items-center px-3 py-1.5 ${i % 2 ? "" : "bg-[var(--fill)]"}`}>
              <span><Checkbox checked={flag(shot)} onChange={(v) => set(shot, v as never)} /></span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
