import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { Check } from "lucide-react";
import { api, type Settings } from "../../lib/api";
import ShortcutInput from "./ShortcutInput";

const ACTION_LABELS: Record<string, string> = {
  "capture-area": "Capture Area",
  "capture-fullscreen": "Capture Fullscreen",
  "capture-window": "Capture Window",
  "capture-previous-area": "Capture Previous Area",
  "record-screen": "Record Screen",
  "scrolling-capture": "Scrolling Capture",
  "capture-text": "Capture Text (OCR)",
  "self-timer": "Self-Timer",
};

export default function SettingsForm() {
  const [s, setS] = useState<Settings | null>(null);
  const [login, setLogin] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.getSettings().then(setS); isEnabled().then(setLogin).catch(() => {}); }, []);
  if (!s) return null;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  const persist = async () => { await api.setSettings(s); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const Toggle = ({ k, label }: { k: keyof Settings; label: string }) => (
    <label className="flex items-center justify-between py-1.5 text-sm">{label}
      <input type="checkbox" checked={s[k] as boolean} onChange={(e) => set(k, e.target.checked as never)} />
    </label>
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-16">
      <Section title="General">
        <label className="flex items-center justify-between py-1.5 text-sm">Launch at login
          <input type="checkbox" checked={login} onChange={async (e) => { e.target.checked ? await enable() : await disable(); setLogin(e.target.checked); }} />
        </label>
        <div className="flex items-center gap-2 py-1.5 text-sm">
          <span className="flex-1">Save location</span>
          <span className="muted max-w-64 truncate text-xs">{s.save_dir}</span>
          <button className="btn" onClick={async () => { const d = await open({ directory: true }); if (typeof d === "string") set("save_dir", d); }}>Change…</button>
        </div>
        <label className="flex items-center justify-between py-1.5 text-sm">Image format
          <select className="input" value={s.image_format} onChange={(e) => set("image_format", e.target.value as Settings["image_format"])}>
            <option value="png">PNG</option><option value="jpg">JPG</option>
          </select>
        </label>
      </Section>

      <Section title="After capture">
        <Toggle k="show_quick_access" label="Show Quick Access Overlay" />
        <Toggle k="copy_after_capture" label="Copy to clipboard" />
        <Toggle k="save_after_capture" label="Save to save location" />
        <Toggle k="hide_desktop_icons_while_capturing" label="Hide desktop icons while capturing" />
        <label className="flex items-center justify-between py-1.5 text-sm">Self-timer (seconds)
          <input className="input w-20" type="number" min={1} max={30} value={s.self_timer_secs} onChange={(e) => set("self_timer_secs", +e.target.value)} />
        </label>
      </Section>

      <Section title="Recording">
        <label className="flex items-center justify-between py-1.5 text-sm">Frame rate
          <select className="input" value={s.record_fps} onChange={(e) => set("record_fps", +e.target.value)}>
            {[15, 24, 30, 60].map((f) => <option key={f} value={f}>{f} fps</option>)}
          </select>
        </label>
        <Toggle k="record_mic" label="Record microphone" />
        <label className="flex items-center justify-between gap-4 py-1.5 text-sm">Microphone device
          <input className="input flex-1" placeholder="Default (macOS/Linux) — required on Windows" value={s.record_mic_device} onChange={(e) => set("record_mic_device", e.target.value)} />
        </label>
        <Toggle k="record_system_audio" label="Record computer audio (Linux/PulseAudio)" />
        <Toggle k="record_show_clicks" label="Highlight clicks" />
        <Toggle k="record_show_keys" label="Show keystrokes" />
        <Toggle k="record_webcam" label="Show webcam overlay" />
      </Section>

      <Section title="Shortcuts">
        {Object.keys(ACTION_LABELS).map((a) => (
          <label key={a} className="flex items-center justify-between py-1 text-sm">{ACTION_LABELS[a]}
            <ShortcutInput value={s.shortcuts[a] ?? ""} onChange={(v) => set("shortcuts", { ...s.shortcuts, [a]: v })} />
          </label>
        ))}
      </Section>

      <Section title="Cloud upload">
        <p className="muted pb-2 text-xs">POSTs the file as multipart form-data to your endpoint (e.g. a self-hosted Zipline, XBackBone, or a Cloudflare Worker + R2). The first URL in the response is copied.</p>
        <label className="flex items-center gap-4 py-1.5 text-sm">Endpoint
          <input className="input flex-1" placeholder="https://share.example.com/api/upload" value={s.upload_url} onChange={(e) => set("upload_url", e.target.value)} />
        </label>
        <label className="flex items-center gap-4 py-1.5 text-sm">Form field
          <input className="input w-32" value={s.upload_field} onChange={(e) => set("upload_field", e.target.value)} />
        </label>
        <label className="flex items-center gap-4 py-1.5 text-sm">Authorization header
          <input className="input flex-1" type="password" value={s.upload_headers.Authorization ?? ""}
            onChange={(e) => set("upload_headers", { ...s.upload_headers, Authorization: e.target.value })} />
        </label>
      </Section>

      <div className="sticky bottom-0 flex justify-end py-3">
        <button className="btn btn-primary shadow-lg" onClick={persist}>{saved ? <><Check size={14} />Saved</> : "Save settings"}</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="muted mb-2 text-xs font-semibold tracking-wide uppercase">{title}</h2>
      <div className="glass divide-y divide-black/5 rounded-xl px-4 py-1 dark:divide-white/5">{children}</div>
    </section>
  );
}
