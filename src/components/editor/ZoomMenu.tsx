import { ChevronDown } from "lucide-react";
import Popover, { MenuItem } from "./Popover";
import Tip from "./Tip";
import type { Zoom } from "./useZoom";

export default function ZoomMenu({ zoom }: { zoom: Zoom }) {
  return (
    <Popover align="end" trigger={({ open, toggle }) => (
      <Tip label="Zoom">
        <button className="btn tabular !gap-1 !px-2" style={open ? { background: "var(--fill)" } : undefined} onClick={toggle}>
          {Math.round(zoom.scale * 100)}%<ChevronDown size={11} className="opacity-50" />
        </button>
      </Tip>
    )}>
      {(close) => {
        const go = (f: () => void) => () => { f(); close(); };
        return (
          <div className="flex flex-col">
            <MenuItem label="Zoom In" kbd="⌘+" onClick={go(zoom.zoomIn)} />
            <MenuItem label="Zoom Out" kbd="⌘−" onClick={go(zoom.zoomOut)} />
            <div className="my-1 h-px bg-[var(--separator)]" />
            <MenuItem label="Fit to Window" kbd="⌘0" checked={zoom.mode === "fit"} onClick={go(zoom.fit)} />
            <MenuItem label="Actual Size" kbd="⌘1" checked={zoom.mode === 1} onClick={go(zoom.actual)} />
            <MenuItem label="200%" checked={zoom.mode === 2} onClick={go(() => zoom.set(2))} />
          </div>
        );
      }}
    </Popover>
  );
}
