import { ChevronDown } from "lucide-react";
import { nativeMenu } from "../../ui/menu";
import { CHEVRON } from "./IconButton";
import type { Zoom } from "./useZoom";

/** Bottom-left "100% ⌄" capsule; opens a native OS menu. Also hosts Revert to Original. */
export default function ZoomMenu({ zoom, revert, canRevert }: { zoom: Zoom; revert: () => void; canRevert: boolean }) {
  const open = (el: Element) => nativeMenu([
    { label: "Fit to Window", accelerator: "CmdOrCtrl+0", checked: zoom.mode === "fit", action: zoom.fit },
    { label: "50%", checked: zoom.mode === 0.5, action: () => zoom.set(0.5) },
    { label: "100%", accelerator: "CmdOrCtrl+1", checked: zoom.mode === 1, action: zoom.actual },
    { label: "200%", checked: zoom.mode === 2, action: () => zoom.set(2) },
    "separator",
    { label: "Zoom In", accelerator: "CmdOrCtrl+Plus", action: zoom.zoomIn },
    { label: "Zoom Out", accelerator: "CmdOrCtrl+-", action: zoom.zoomOut },
    "separator",
    { label: "Revert to Original", disabled: !canRevert, action: revert },
  ], el);
  return (
    <button className="ns-capsule tabular shrink-0 gap-1" title="Zoom" aria-label="Zoom" onClick={(e) => open(e.currentTarget)}>
      {Math.round(zoom.scale * 100)}%<ChevronDown {...CHEVRON} />
    </button>
  );
}
