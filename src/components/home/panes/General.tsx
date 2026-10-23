import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { Folder, Play } from "lucide-react";
import { fileName, type Settings } from "../../../lib/api";
import { Btn, Caption, Checkbox, PopUp, Section } from "../form";
import { playShutter, SHUTTERS } from "../../quick-access/shutter";
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
  const notify = async (v: boolean) => {
    if (v) { try { if (!(await isPermissionGranted())) await requestPermission(); } catch { /* the OS will prompt on first use */ } }
    set("notifications", v);
  };
  const flag = (k: keyof Settings) => s[k] as boolean;
  return (
    <>
      <Section label="Startup:">
        <Checkbox checked={login} onChange={async (v) => { try { v ? await enable() : await disable(); setLogin(v); } catch { /* ignored */ } }}>Start at login</Checkbox>
      </Section>
      <Section label="Menu bar:">
        <Checkbox checked={s.show_menu_bar_icon} onChange={(v) => set("show_menu_bar_icon", v)}
          caption="When hidden, use your shortcuts, or open NeatShotX again to get back to Preferences.">Show menu bar icon</Checkbox>
      </Section>
      <Section label="Sounds:">
        <Checkbox checked={s.play_sounds} onChange={(v) => set("play_sounds", v)}>Play sounds</Checkbox>
        <div className="flex items-center gap-2">
          <PopUp label="Shutter sound" className="w-28" value={s.shutter_sound} options={SHUTTERS} onChange={(v) => set("shutter_sound", v)} />
          <Btn aria-label="Preview sound" title="Preview" disabled={s.shutter_sound === "none"} onClick={() => playShutter(s.shutter_sound)}><Play size={11} /></Btn>
        </div>
      </Section>
      <Section label="Notifications:">
        <Checkbox checked={s.notifications} onChange={notify} caption="Only when Quick Access is off.">Show a notification after each capture</Checkbox>
      </Section>
      <Section label="Export location:">
        <div className="flex items-center gap-3">
          <button onClick={pick} title={s.save_dir} className="inline-flex h-[22px] w-[180px] items-center gap-1.5 rounded-[6px] bg-[var(--bg-content)] px-2 text-left shadow-[inset_0_0_0_0.5px_var(--separator),var(--shadow-sm)]">
            <Folder size={13} className="shrink-0 text-[var(--accent)]" /><span className="truncate">{fileName(s.save_dir) || s.save_dir}</span>
          </button>
          <button className="text-[var(--accent)] hover:underline" onClick={() => revealItemInDir(s.save_dir)}>Reveal in {mac ? "Finder" : "folder"}</button>
        </div>
      </Section>
      <Section label="File name:">
        <input aria-label="File name template" className="input !h-[22px] w-[260px]" value={s.file_name_template} spellCheck={false}
          onChange={(e) => set("file_name_template", e.target.value)} />
        <Caption>Tokens: {"{date}"} (2026-01-31), {"{time}"} (14.05.09), {"{counter}"} (increments).</Caption>
        <Checkbox checked={s.ask_for_name} onChange={(v) => set("ask_for_name", v)} caption="Shown before the file goes to the export location.">Ask for name after every capture</Checkbox>
      </Section>
      <Section label="Desktop icons:">
        <Checkbox checked={s.hide_desktop_icons_while_capturing} onChange={(v) => set("hide_desktop_icons_while_capturing", v)}>Hide while capturing</Checkbox>
      </Section>
      <Section label="Image format:">
        <PopUp label="Image format" className="w-24" value={s.image_format} options={[["png", "PNG"], ["jpg", "JPG"], ["webp", "WebP"]]} onChange={(v) => set("image_format", v)} />
        <Checkbox checked={s.scale_retina_1x} onChange={(v) => set("scale_retina_1x", v)} caption="Downsizes captures by the display scale factor.">Scale Retina screenshots to 1x</Checkbox>
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
