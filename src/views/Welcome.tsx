import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { api, type Settings } from "../lib/api";
import { CheckRow } from "../components/home/form";
import AppIcon from "../components/home/AppIcon";
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
  const open = (pane: string) => <button className="ns-btn" onClick={() => openUrl(PANE + pane)}>Open System Settings</button>;
  let n = 0;

  return (
    <div className="flex h-full flex-col bg-[var(--bg-window)]">
      <div data-tauri-drag-region className="h-7 shrink-0" />
      <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <div className="grid place-items-center gap-1 pb-6 text-center">
          <AppIcon size={64} />
          <h1 className="t-large mt-3">Welcome to NeatShotX</h1>
          <p className="t-callout max-w-xs">Capture, annotate and share screenshots. A couple of quick things first.</p>
        </div>
        <div className="ns-group overflow-hidden">
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
            action={<CheckRow checked={login} onChange={async (v) => { try { v ? await enable() : await disable(); setLogin(v); } catch { /* ignored */ } }}>Start at login</CheckRow>}>
            {s ? <ShortcutList shortcuts={s.shortcuts} /> : null}
            <span className="mt-2 block">Change them any time in Preferences.</span>
          </Step>
        </div>
      </main>
      <footer className="flex shrink-0 justify-end border-t border-[var(--separator)] px-6 py-3">
        <button className="ns-btn ns-btn--primary ns-btn--large" onClick={() => getCurrentWindow().close()}>Get Started</button>
      </footer>
    </div>
  );
}
