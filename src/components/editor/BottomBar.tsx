import { useState } from "react";
import { GripHorizontal, Pin, Share, Copy } from "lucide-react";
import ZoomMenu from "./ZoomMenu";
import { CapButton, ICON } from "./IconButton";
import type { Zoom } from "./useZoom";

type Props = {
  zoom: Zoom;
  canRevert: boolean;
  revert: () => void;
  /** Writes the current composition to a file and returns its path. */
  materialize: () => Promise<string>;
  share: () => void;
  pin: () => void;
  copy: () => void;
};

/** 52px bottom bar: zoom | "Drag Me" (drag the annotated image into other apps) | share, pin, copy. */
export default function BottomBar(p: Props) {
  const [pressed, setPressed] = useState(false);
  const drag = async () => {
    setPressed(true);
    try {
      const [{ startDrag }, path] = await Promise.all([import("@crabnebula/tauri-plugin-drag"), p.materialize()]);
      await startDrag({ item: [path], icon: path });
    } catch { /* drag cancelled or unsupported */ } finally { setPressed(false); }
  };
  return (
    <footer className="relative z-20 flex h-[52px] shrink-0 items-center gap-2 px-3"
      style={{ background: "var(--bg-window)", borderTop: "0.5px solid var(--separator)" }}>
      <ZoomMenu zoom={p.zoom} canRevert={p.canRevert} revert={p.revert} />
      <div className="flex-1" />
      <button className={"ns-capsule shrink-0 cursor-grab select-none px-4 " + (pressed ? "!cursor-grabbing !bg-[var(--fill-2)]" : "")}
        title="Drag the image into another app" aria-label="Drag me" onPointerDown={drag}>
        <GripHorizontal {...ICON} className="text-[var(--label-2)]" />Drag Me<GripHorizontal {...ICON} className="text-[var(--label-2)]" />
      </button>
      <div className="flex flex-1 justify-end gap-2">
        <CapButton icon={<Share {...ICON} />} label="Show in Finder" onClick={p.share} />
        <CapButton icon={<Pin {...ICON} />} label="Pin to screen" onClick={p.pin} />
        <CapButton icon={<Copy {...ICON} />} label="Copy" title="Copy (⌘C)" onClick={p.copy} />
      </div>
    </footer>
  );
}
