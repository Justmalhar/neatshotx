import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { param } from "../lib/api";
import { KeyCap } from "../components/overlays/KeyCap";

const KEY_LABEL: Record<string, string> = {
  LShift: "⇧", RShift: "⇧", Shift: "⇧", LControl: "⌃", RControl: "⌃", Control: "⌃", LAlt: "⌥", RAlt: "⌥", Alt: "⌥",
  LOption: "⌥", ROption: "⌥", Option: "⌥", Command: "⌘", RCommand: "⌘", LCommand: "⌘", LMeta: "⌘", RMeta: "⌘", Meta: "⌘",
  Enter: "↩", Return: "↩", Space: "␣", Backspace: "⌫", Delete: "⌦", Tab: "⇥", Escape: "esc", Up: "↑", Down: "↓", Left: "←", Right: "→",
};
const MODS = new Set(["⇧", "⌃", "⌥", "⌘"]);
const label = (k: string) => KEY_LABEL[k] ?? k.replace(/^Key/, "").replace(/^Numpad/, "");

/** Click ripples + keystroke key-caps for recordings. Window is click-through. */
export default function InputOverlay() {
  const reduce = useReducedMotion();
  const showClicks = param("clicks") === "true", showKeys = param("keys") === "true", modsOnly = param("mods") === "true";
  const [clicks, setClicks] = useState<{ id: number; x: number; y: number }[]>([]);
  const [keys, setKeys] = useState<{ id: number; caps: string[] } | null>(null);

  useEffect(() => {
    // device_query reports points on macOS and physical pixels elsewhere.
    const scale = navigator.userAgent.includes("Mac") ? 1 : devicePixelRatio;
    const un = [
      listen<[number, number]>("input-click", (e) => {
        if (!showClicks) return;
        const id = Date.now() + Math.random();
        const [gx, gy] = e.payload;
        setClicks((c) => [...c, { id, x: gx / scale - screenX, y: gy / scale - screenY }]);
        setTimeout(() => setClicks((c) => c.filter((x) => x.id !== id)), 600);
      }),
      listen<string[]>("input-keys", (e) => {
        if (!showKeys) return;
        const caps = e.payload.map(label);
        if (modsOnly && !caps.some((c) => MODS.has(c))) return;
        const id = Date.now();
        setKeys({ id, caps });
        setTimeout(() => setKeys((k) => (k?.id === id ? null : k)), 1200);
      }),
    ];
    return () => un.forEach((p) => p.then((f) => f()));
  }, [showClicks, showKeys, modsOnly]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <AnimatePresence>
        {clicks.map((c) => (
          <motion.div key={c.id}
            initial={reduce ? { opacity: 0.8 } : { scale: 0.3, opacity: 0.9 }}
            animate={reduce ? { opacity: 0 } : { scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="absolute h-12 w-12 rounded-full border-[3px] border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_22%,transparent)]"
            style={{ left: c.x - 24, top: c.y - 24 }} />
        ))}
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-16 flex justify-center">
        <AnimatePresence mode="wait">
          {keys && (
            <motion.div key={keys.id} className="flex gap-1.5" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
              {keys.caps.map((c, i) => <KeyCap key={i} delay={i * 0.02} reduce={reduce}>{c}</KeyCap>)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
