import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { fileSrc, param } from "../lib/api";

/** Floating always-on-top screenshot. Wheel = opacity, double-click = close, drag = move. */
export default function Pin() {
  const path = param("p") ?? "";
  const [opacity, setOpacity] = useState(1);
  return (
    <div
      className="h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      style={{ opacity }}
      onMouseDown={(e) => e.button === 0 && e.detail === 1 && getCurrentWindow().startDragging()}
      onDoubleClick={() => getCurrentWindow().destroy()}
      onWheel={(e) => setOpacity((o) => Math.min(1, Math.max(0.15, o - e.deltaY / 800)))}
      onKeyDown={(e) => e.key === "Escape" && getCurrentWindow().destroy()}
      tabIndex={0}
    >
      <img src={fileSrc(path)} className="pointer-events-none h-full w-full object-contain" draggable={false} />
    </div>
  );
}
