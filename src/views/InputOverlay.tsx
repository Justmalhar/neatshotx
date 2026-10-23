import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "motion/react";
import { param } from "../lib/api";

const KEY_LABEL: Record<string, string> = {
  LShift: "⇧", RShift: "⇧", LControl: "⌃", RControl: "⌃", LAlt: "⌥", RAlt: "⌥", LOption: "⌥", ROption: "⌥",
  Command: "⌘", RCommand: "⌘", LMeta: "⌘", RMeta: "⌘", Meta: "⌘", Enter: "↩", Space: "␣", Backspace: "⌫",
  Tab: "⇥", Escape: "esc", Up: "↑", Down: "↓", Left: "←", Right: "→",
};
const label = (k: string) => KEY_LABEL[k] ?? k.replace(/^Key/, "").replace(/^Numpad/, "");

/** Click ripples + keystroke HUD for recordings. Window is click-through. */
export default function InputOverlay() {
  const showClicks = param("clicks") === "true", showKeys = param("keys") === "true";
  const [clicks, setClicks] = useState<{ id: number; x: number; y: number }[]>([]);
  const [keys, setKeys] = useState<{ id: number; text: string } | null>(null);

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
        const id = Date.now();
        setKeys({ id, text: e.payload.map(label).join(" ") });
        setTimeout(() => setKeys((k) => (k?.id === id ? null : k)), 1200);
      }),
    ];
    return () => un.forEach((p) => p.then((f) => f()));
  }, [showClicks, showKeys]);

  return (
    <div className="pointer-events-none fixed inset-0">
      <AnimatePresence>
        {clicks.map((c) => (
          <motion.div key={c.id} initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 1.6, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="absolute h-12 w-12 rounded-full border-4 border-yellow-400 bg-yellow-300/30"
            style={{ left: c.x - 24, top: c.y - 24 }} />
        ))}
      </AnimatePresence>
      <AnimatePresence>
        {keys && (
          <motion.div key={keys.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-2xl bg-black/75 px-5 py-3 text-2xl font-semibold text-white shadow-2xl">
            {keys.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
