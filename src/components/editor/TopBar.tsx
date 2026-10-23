import { useEffect, useRef, useState } from "react";
import { Copy, Download, ImagePlus, Pin, Redo2, RotateCcw, Save, Undo2, UploadCloud } from "lucide-react";
import type { Tool } from "./types";
import StyleBar, { type StylePatch, type StyleValues } from "./StyleBar";
import ToolSegment from "./ToolSegment";
import ZoomMenu from "./ZoomMenu";
import Tip from "./Tip";
import { Group, ICON, IconButton, Sep } from "./IconButton";
import type { Zoom } from "./useZoom";

type Props = {
  name: string;
  dims: string;
  tool: Tool;
  setTool: (t: Tool) => void;
  styleKind: Tool;
  style: StyleValues;
  onStyle: (p: StylePatch) => void;
  zoom: Zoom;
  canUndo: boolean;
  canRedo: boolean;
  canRevert: boolean;
  bgOn: boolean;
  undo: () => void;
  redo: () => void;
  revert: () => void;
  toggleBg: () => void;
  pin: () => void;
  upload: () => void;
  saveAs: () => void;
  save: () => void;
  copy: () => void;
};

const MAC = navigator.userAgent.includes("Mac");

/** Bar width in px; drives collapse (rare tools -> More, then labels, then title) so the row never wraps. */
function useWidth() {
  const ref = useRef<HTMLElement>(null);
  const [w, setW] = useState(1400);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Unified 52px toolbar that doubles as the title bar (Preview/Freeform style): tools | contextual style | spacer (+title) | actions.
 * On macOS the window uses an overlay title bar, so 80px is reserved for the traffic lights. Double-click on empty
 * bar space zooms the window natively via data-tauri-drag-region.
 */
export default function TopBar(p: Props) {
  const [ref, w] = useWidth();
  const compact = w < 1040, labels = w >= 900, title = w >= 1320; // measured bar width, never wrap
  return (
    <header ref={ref} data-tauri-drag-region className="mat-thick relative z-20 flex h-[52px] shrink-0 items-center gap-1 pr-3"
      style={{ paddingLeft: MAC ? 80 : 12, boxShadow: "none", borderBottom: "0.5px solid var(--separator)" }}>
      <ToolSegment tool={p.tool} setTool={p.setTool} emoji={p.style.emoji} compact={compact} />
      <Sep />
      <StyleBar kind={p.styleKind} v={p.style} onChange={p.onStyle} />

      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-baseline justify-center gap-2 px-2">
        {title && (
          <>
            <span className="t-headline pointer-events-none truncate">{p.name}</span>
            <span className="t-caption tabular pointer-events-none shrink-0">{p.dims}</span>
          </>
        )}
      </div>

      <Group>
        <IconButton icon={Undo2} label="Undo" kbd="⌘Z" onClick={p.undo} disabled={!p.canUndo} />
        <IconButton icon={Redo2} label="Redo" kbd="⇧⌘Z" onClick={p.redo} disabled={!p.canRedo} />
        <Sep />
        <IconButton icon={ImagePlus} label="Background" onClick={p.toggleBg} active={p.bgOn} />
        <IconButton icon={RotateCcw} label="Revert to Original" onClick={p.revert} disabled={!p.canRevert} />
        <ZoomMenu zoom={p.zoom} />
        <Sep />
        <IconButton icon={Pin} label="Pin to screen" onClick={p.pin} />
        <IconButton icon={UploadCloud} label="Upload" onClick={p.upload} />
        <IconButton icon={Download} label="Save As…" kbd="⇧⌘S" onClick={p.saveAs} />
        <Sep />
        <Tip label="Save" kbd="⌘S">
          <button className="btn !h-7 !rounded-[7px] !px-2.5" aria-label="Save" style={{ boxShadow: "0 0 0 0.5px var(--separator)" }} onClick={p.save}>
            <Save {...ICON} size={15} />{labels && "Save"}
          </button>
        </Tip>
        <Tip label="Copy" kbd="⌘C" align="end">
          <button className="btn btn-primary !h-7 !rounded-[7px] !px-2.5" aria-label="Copy" onClick={p.copy}>
            <Copy {...ICON} size={15} />{labels && "Copy"}
          </button>
        </Tip>
      </Group>
    </header>
  );
}
