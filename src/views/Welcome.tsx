import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { Aperture } from "lucide-react";
import { api, type Settings } from "../lib/api";
import { Btn, Checkbox } from "../components/home/form";
import Step from "../components/welcome/Step";
import ShortcutList from "../components/welcome/ShortcutList";

const PANE = "x-apple.systempreferences:com.apple.preference.security?Privacy_";

/** First-run guide: permissions (macOS), shortcuts, start at login. */
export default function Welcome() {
  const [os, setOs] = useState("");
  const [s, setS] = useState<Settings | null>(null);
  const [login, setLogin] = useState(false);
  useEffect(() => {
    api.platform().then(setOs);
    api.getSettings().then(setS);
    isEnabled().then(setLogin).catch(() => {});
  }, []);
  const mac = os === "macos";
  const open = (pane: string) => <Btn onClick={() => openUrl(PANE + pane)}>Open System Settings</Btn>;
  let n = 0;

  return (
    <div className="flex h-full flex-col bg-[var(--bg-window)]">
      <div data-tauri-drag-region className="h-7 shrink-0" />
      <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <div className="grid place-items-center gap-1 pb-4 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-[15px] bg-gradient-to-b from-[#5ac8fa] to-[var(--accent)] text-white shadow-[var(--shadow-md)]"><Aperture size={36} strokeWidth={1.6} /></div>
          <h1 className="t-title mt-2">Welcome to NeatShotX</h1>
          <p className="t-callout max-w-xs">Capture, annotate and share screenshots. A couple of quick things first.</p>
        </div>
        <div className="grid gap-2.5">
          {mac && (
            <Step n={++n} title="Allow Screen Recording" action={open("ScreenCapture")} delay={0.05}>
              NeatShotX needs this to take screenshots. Turn it on for NeatShotX, then relaunch the app if macOS asks.
            </Step>
          )}
          {mac && (
            <Step n={++n} title="Allow Accessibility" action={open("Accessibility")} delay={0.1}>
              Optional. Lets Scrolling Capture scroll for you. Without it, scroll by hand.
            </Step>
          )}
          <Step n={++n} title="Your shortcuts" delay={0.15}
            action={<Checkbox checked={login} onChange={async (v) => { try { v ? await enable() : await disable(); setLogin(v); } catch { /* ignored */ } }}>Start at login</Checkbox>}>
            {s ? <ShortcutList shortcuts={s.shortcuts} /> : null}
            <span className="mt-2 block">Change them any time in Preferences.</span>
          </Step>
        </div>
      </main>
      <footer className="shrink-0 border-t border-[var(--separator)] px-6 py-3">
        <button className="btn btn-primary !h-8 w-full" onClick={() => getCurrentWindow().close()}>Get Started</button>
      </footer>
    </div>
  );
}
