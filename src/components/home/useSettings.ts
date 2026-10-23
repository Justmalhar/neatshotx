import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Settings } from "../../lib/api";

export type SettingsCtl = { s: Settings; set: <K extends keyof Settings>(k: K, v: Settings[K]) => void; saved: boolean };

/** Loads settings; every change is persisted after a 300ms debounce (flushed on unmount). */
export function useSettings(): SettingsCtl | null {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const latest = useRef<Settings | null>(null);
  const timer = useRef<number>(0);
  const hide = useRef<number>(0);
  const dirty = useRef(false);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (!dirty.current || !latest.current) return;
    dirty.current = false;
    await api.setSettings(latest.current);
    setSaved(true);
    window.clearTimeout(hide.current);
    hide.current = window.setTimeout(() => setSaved(false), 1400);
  }, []);

  useEffect(() => {
    api.getSettings().then((v) => { latest.current = v; setS(v); });
    return () => { flush(); window.clearTimeout(hide.current); };
  }, [flush]);

  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    if (!latest.current) return;
    latest.current = { ...latest.current, [k]: v };
    dirty.current = true;
    setS(latest.current);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 300);
  }, [flush]);

  return s ? { s, set, saved } : null;
}
