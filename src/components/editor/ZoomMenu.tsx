import { ChevronDown } from "lucide-react";
import Popover, { MenuItem } from "./Popover";
import Tip from "./Tip";
import { cap } from "./IconButton";
import type { Zoom } from "./useZoom";

/** Bottom-left "100% ⌄" capsule; menu opens upward. Also hosts Revert to Original. */
export default function ZoomMenu({ zoom, revert, canRevert }: { zoom: Zoom; revert: () => void; canRevert: boolean }) {
  return (
    <Popover align="start" up trigger={({ open, toggle }) => (
      <Tip label="Zoom" side="top">
        <button className={cap + " tabular gap-1 px-3"} aria-pressed={open} onClick={toggle} aria-label="Zoom">
          {Math.round(zoom.scale * 100)}%<ChevronDown size={13} strokeWidth={2.5} className="text-[var(--label-2)]" />
        </button>
      </Tip>
    )}>
      {(close) => {
        const go = (f: () => void) => () => { f(); close(); };
        return (
          <div className="flex flex-col">
            <MenuItem label="Fit to Window" kbd="⌘0" checked={zoom.mode === "fit"} onClick={go(zoom.fit)} />
            <MenuItem label="50%" checked={zoom.mode === 0.5} onClick={go(() => zoom.set(0.5))} />
            <MenuItem label="100%" kbd="⌘1" checked={zoom.mode === 1} onClick={go(zoom.actual)} />
            <MenuItem label="200%" checked={zoom.mode === 2} onClick={go(() => zoom.set(2))} />
            <div className="my-1 h-px bg-[var(--separator)]" />
            <MenuItem label="Zoom In" kbd="⌘+" onClick={go(zoom.zoomIn)} />
            <MenuItem label="Zoom Out" kbd="⌘−" onClick={go(zoom.zoomOut)} />
            <div className="my-1 h-px bg-[var(--separator)]" />
            <button className="btn w-full min-w-[180px] justify-start gap-2 !px-2 text-left" disabled={!canRevert} onClick={go(revert)}>
              <span className="w-3.5" /><span className="flex-1">Revert to Original</span>
            </button>
          </div>
        );
      }}
    </Popover>
  );
}
