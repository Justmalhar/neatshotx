import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { Folder, Play } from "lucide-react";
import { fileName, type Settings } from "../../../lib/api";
import { Caption, CheckRow, Select, Section } from "../form";
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
        <CheckRow checked={login} onChange={async (v) => { try { v ? await enable() : await disable(); setLogin(v); } catch { /* ignored */ } }}>Start at login</CheckRow>
      </Section>
      <Section label="Menu bar:">
        <CheckRow checked={s.show_menu_bar_icon} onChange={(v) => set("show_menu_bar_icon", v)}
          caption="When hidden, use your shortcuts, or open NeatShotX again to get back to Preferences.">Show menu bar icon</CheckRow>
      </Section>
      <Section label="Sounds:">
        <CheckRow checked={s.play_sounds} onChange={(v) => set("play_sounds", v)}>Play sounds</CheckRow>
        <div className="flex items-center gap-2">
          <Select label="Shutter sound" value={s.shutter_sound} options={SHUTTERS} onChange={(v) => set("shutter_sound", v)} />
          <button className="ns-btn" aria-label="Preview sound" title="Preview sound" disabled={s.shutter_sound === "none"} onClick={() => playShutter(s.shutter_sound)}><Play size={14} strokeWidth={1.75} /></button>
        </div>
      </Section>
      <Section label="Notifications:">
        <CheckRow checked={s.notifications} onChange={notify} caption="Only when Quick Access is off.">Show a notification after each capture</CheckRow>
      </Section>
      <Section label="Export location:">
        <div className="flex items-center gap-2">
          <button onClick={pick} title={s.save_dir} className="ns-btn w-[180px] !justify-start">
            <Folder size={14} strokeWidth={1.75} className="shrink-0 text-[var(--accent)]" /><span className="truncate">{fileName(s.save_dir) || s.save_dir}</span>
          </button>
          <button className="ns-btn ns-btn--plain" onClick={() => revealItemInDir(s.save_dir)}>Reveal in {mac ? "Finder" : "folder"}</button>
        </div>
      </Section>
      <Section label="File name:">
        <input aria-label="File name template" className="ns-field w-[260px]" value={s.file_name_template} spellCheck={false}
          onChange={(e) => set("file_name_template", e.target.value)} />
        <Caption>Tokens: {"{date}"} (2026-01-31), {"{time}"} (14.05.09), {"{counter}"} (increments).</Caption>
        <CheckRow checked={s.ask_for_name} onChange={(v) => set("ask_for_name", v)} caption="Shown before the file goes to the export location.">Ask for name after every capture</CheckRow>
      </Section>
      <Section label="Desktop icons:">
        <CheckRow checked={s.hide_desktop_icons_while_capturing} onChange={(v) => set("hide_desktop_icons_while_capturing", v)}>Hide while capturing</CheckRow>
      </Section>
      <Section label="Image format:">
        <Select label="Image format" value={s.image_format} options={[["png", "PNG"], ["jpg", "JPG"], ["webp", "WebP"]]} onChange={(v) => set("image_format", v)} />
        <CheckRow checked={s.scale_retina_1x} onChange={(v) => set("scale_retina_1x", v)} caption="Downsizes captures by the display scale factor.">Scale Retina screenshots to 1x</CheckRow>
      </Section>
      <Section label="After capture:">
        <Caption>Here you can decide what should happen after taking a screenshot.</Caption>
        <div className="ns-group t-body w-full max-w-[380px] overflow-hidden">
          <div className="t-caption grid grid-cols-[84px_1fr] px-3 py-1"><span>Screenshot</span><span>Action</span></div>
          {AFTER.map(([label, shot]) => (
            <label key={label} className="grid grid-cols-[84px_1fr] items-center px-3 py-2">
              <span><input type="checkbox" className="ns-check" checked={flag(shot)} onChange={(e) => set(shot, e.target.checked as never)} /></span>
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Section>
    </>
  );
}
