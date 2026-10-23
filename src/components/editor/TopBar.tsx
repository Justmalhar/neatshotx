import { Copy, Download, ImagePlus, Pin, Redo2, RotateCcw, Save, Undo2, UploadCloud, type LucideIcon } from "lucide-react";
import type { Tool } from "./types";
import StyleBar, { type StylePatch, type StyleValues } from "./StyleBar";
import ToolSegment from "./ToolSegment";
import ZoomMenu from "./ZoomMenu";
import Tip from "./Tip";
import type { Zoom } from "./useZoom";

type Props = {
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

const Sep = () => <span className="mx-1 h-4 w-px bg-[var(--separator)]" />;

function IconBtn({ icon: Icon, label, kbd, onClick, disabled, active }: { icon: LucideIcon; label: string; kbd?: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <Tip label={label} kbd={kbd}>
      <button className="btn btn-icon" aria-label={label} disabled={disabled} data-active={active} onClick={onClick}><Icon size={16} strokeWidth={1.9} /></button>
    </Tip>
  );
}

/** Unified toolbar: tools | contextual style | history, view and share actions. Style row wraps below on narrow windows. */
export default function TopBar(p: Props) {
  return (
    <header className="mat-thick relative z-20 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2"
      style={{ boxShadow: "none", borderBottom: "0.5px solid var(--separator)" }}>
      <div className="order-1">
        <ToolSegment tool={p.tool} setTool={p.setTool} emoji={p.style.emoji} />
      </div>
      <div className="order-3 flex min-w-0 basis-full justify-center min-[1280px]:order-2 min-[1280px]:basis-auto min-[1280px]:flex-1">
        <StyleBar kind={p.styleKind} v={p.style} onChange={p.onStyle} />
      </div>
      <div className="order-2 ml-auto flex items-center gap-0.5 min-[1280px]:order-3 min-[1280px]:ml-0">
        <IconBtn icon={Undo2} label="Undo" kbd="⌘Z" onClick={p.undo} disabled={!p.canUndo} />
        <IconBtn icon={Redo2} label="Redo" kbd="⇧⌘Z" onClick={p.redo} disabled={!p.canRedo} />
        <Sep />
        <IconBtn icon={ImagePlus} label="Background" onClick={p.toggleBg} active={p.bgOn} />
        <IconBtn icon={RotateCcw} label="Revert to Original" onClick={p.revert} disabled={!p.canRevert} />
        <ZoomMenu zoom={p.zoom} />
        <Sep />
        <IconBtn icon={Pin} label="Pin to screen" onClick={p.pin} />
        <IconBtn icon={UploadCloud} label="Upload" onClick={p.upload} />
        <IconBtn icon={Download} label="Save As…" kbd="⇧⌘S" onClick={p.saveAs} />
        <Sep />
        <Tip label="Save" kbd="⌘S"><button className="btn btn-secondary" onClick={p.save}><Save size={15} />Save</button></Tip>
        <span className="w-1" />
        <Tip label="Copy" kbd="⌘C" align="end"><button className="btn btn-primary" onClick={p.copy}><Copy size={15} />Copy</button></Tip>
      </div>
    </header>
  );
}
