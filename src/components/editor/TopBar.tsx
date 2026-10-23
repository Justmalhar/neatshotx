import { ChevronDown, Crop, Image as ImageIcon, ImagePlus } from "lucide-react";
import Popover, { MenuItem } from "./Popover";
import type { Tool } from "./types";
import StyleBar, { type StylePatch, type StyleValues } from "./StyleBar";
import ToolPill from "./ToolPill";
import Tip from "./Tip";
import { CapButton, ICON, cap, capPrimary } from "./IconButton";

type Props = {
  tool: Tool;
  setTool: (t: Tool) => void;
  styleKind: Tool;
  style: StyleValues;
  onStyle: (p: StylePatch) => void;
  showBg: boolean;
  toggleBg: () => void;
  addCanvas: () => void;
  saveAs: () => void;
  saveAsPng: () => void;
  saveAsProject: () => void;
  done: () => void;
};

const MAC = navigator.userAgent.includes("Mac");

/**
 * Unified 52px bar that doubles as the title bar: [crop][canvas][background] [tool pill] [color][stroke] … [Save as…][Done].
 * macOS uses an overlay title bar, so 80px is reserved for the traffic lights; empty space drags the window.
 */
export default function TopBar(p: Props) {
  return (
    <header data-tauri-drag-region className="relative z-20 flex h-[52px] shrink-0 items-center gap-2 pr-3"
      style={{ paddingLeft: MAC ? 80 : 12, background: "var(--bg-window)", borderBottom: "0.5px solid var(--separator)" }}>
      <CapButton icon={<Crop {...ICON} />} label="Crop" kbd="C" active={p.tool === "crop"} onClick={() => p.setTool("crop")} />
      <CapButton icon={<ImagePlus {...ICON} />} label="Add canvas padding" onClick={p.addCanvas} />
      <CapButton icon={<ImageIcon {...ICON} />} label="Background" active={p.showBg} onClick={p.toggleBg} />
      <ToolPill tool={p.tool} setTool={p.setTool} emoji={p.style.emoji} />
      <StyleBar kind={p.styleKind} v={p.style} onChange={p.onStyle} />
      <div data-tauri-drag-region className="min-w-2 flex-1 self-stretch" />
      <span className={cap + " gap-0"}>
        <Tip label="Save As…" kbd="⇧⌘S" align="end"><button className="h-full rounded-l-full pl-4 pr-2 text-[13px] font-medium" onClick={p.saveAs}>Save as…</button></Tip>
        <Popover align="end" trigger={({ open, toggle }) => (
          <button className="grid h-full w-7 place-items-center rounded-r-full border-l-[0.5px] border-[var(--separator)] pr-1" aria-label="More save options" aria-pressed={open} onClick={toggle}>
            <ChevronDown size={13} strokeWidth={2.5} className="text-[var(--label-2)]" />
          </button>
        )}>
          {(close) => (
            <div className="flex flex-col">
              <MenuItem label="Save as PNG…" onClick={() => { close(); p.saveAsPng(); }} />
              <MenuItem label="Save as Project…" onClick={() => { close(); p.saveAsProject(); }} />
            </div>
          )}
        </Popover>
      </span>
      <Tip label="Save and close" kbd="⌘↩" align="end"><button className={capPrimary} onClick={p.done}>Done</button></Tip>
    </header>
  );
}
