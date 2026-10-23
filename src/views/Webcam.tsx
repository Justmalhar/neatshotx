import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "motion/react";
import { Circle, FlipHorizontal2, RectangleHorizontal, VideoOff } from "lucide-react";
import { IconButton } from "../components/overlays/IconButton";

const SIZES = { S: 160, M: 220, L: 320 } as const;

/** Webcam bubble, captured as part of the recording. */
export default function Webcam() {
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [round, setRound] = useState(true);
  const [mirror, setMirror] = useState(true);
  const [size, setSize] = useState<keyof typeof SIZES>("M");
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 480, height: 480 } })
      .then((s) => { stream = s; if (ref.current) ref.current.srcObject = s; })
      .catch((e) => setErr(String(e)));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const resize = (k: keyof typeof SIZES) => {
    setSize(k);
    getCurrentWindow().setSize(new LogicalSize(SIZES[k], SIZES[k])).catch(() => {});
  };

  return (
    <div className="h-full w-full p-1.5" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <motion.div
        className="relative h-full w-full cursor-grab overflow-hidden bg-black active:cursor-grabbing"
        animate={{ borderRadius: round ? 9999 : 28 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        style={{ boxShadow: "0 0 0 2px rgba(255,255,255,.85), var(--shadow-lg)" }}
        onMouseDown={(e) => e.button === 0 && getCurrentWindow().startDragging()}
      >
        {err ? (
          <div className="mat-hud grid h-full place-items-center rounded-none p-4 text-center">
            <div className="flex flex-col items-center gap-2 text-[12px] text-white/80">
              <VideoOff size={26} />Camera unavailable
            </div>
          </div>
        ) : (
          <video ref={ref} autoPlay muted playsInline className="pointer-events-none h-full w-full object-cover"
            style={{ transform: mirror ? "scaleX(-1)" : undefined }} />
        )}
        <AnimatePresence>
          {hover && (
            <motion.div
              className="mat-hud absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full p-0.5"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <IconButton label={round ? "Rounded rectangle" : "Circle"} onClick={() => setRound(!round)}>
                {round ? <RectangleHorizontal size={14} /> : <Circle size={14} />}
              </IconButton>
              <IconButton label="Mirror" active={mirror} onClick={() => setMirror(!mirror)}><FlipHorizontal2 size={14} /></IconButton>
              {(Object.keys(SIZES) as (keyof typeof SIZES)[]).map((k) => (
                <IconButton key={k} label={`Size ${k}`} active={size === k} onClick={() => resize(k)} className="text-[11px]">{k}</IconButton>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
