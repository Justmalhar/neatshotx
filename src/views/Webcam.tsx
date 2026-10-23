import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** Circular webcam bubble, captured as part of the recording. */
export default function Webcam() {
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 480, height: 480 } })
      .then((s) => { stream = s; if (ref.current) ref.current.srcObject = s; })
      .catch((e) => setErr(String(e)));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  return (
    <div className="h-full w-full cursor-grab overflow-hidden rounded-full border-4 border-white/80 bg-black shadow-2xl"
      onMouseDown={() => getCurrentWindow().startDragging()}>
      {err ? <div className="grid h-full place-items-center p-4 text-center text-xs text-white">Camera unavailable</div>
        : <video ref={ref} autoPlay muted playsInline className="h-full w-full scale-x-[-1] object-cover" />}
    </div>
  );
}
