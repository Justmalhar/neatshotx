import { ChevronDown, Crop, Image as ImageIcon, ImagePlus } from "lucide-react";
import { nativeMenu } from "../../ui/menu";
import type { Tool } from "./types";
import StyleBar, { type StylePatch, type StyleValues } from "./StyleBar";
import ToolPill from "./ToolPill";
import { CHEVRON, CapButton, ICON } from "./IconButton";

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
      <CapButton icon={<Crop {...ICON} />} label="Crop" title="Crop (C)" active={p.tool === "crop"} onClick={() => p.setTool("crop")} />
      <CapButton icon={<ImagePlus {...ICON} />} label="Add canvas padding" onClick={p.addCanvas} />
      <CapButton icon={<ImageIcon {...ICON} />} label="Background" active={p.showBg} onClick={p.toggleBg} />
      <ToolPill tool={p.tool} setTool={p.setTool} emoji={p.style.emoji} />
      <StyleBar kind={p.styleKind} v={p.style} onChange={p.onStyle} />
      <div data-tauri-drag-region className="min-w-2 flex-1 self-stretch" />
      <div className="ns-capsule shrink-0 !gap-0 !p-0">
        <button className="h-full rounded-l-full pr-2 pl-4 hover:bg-[var(--fill)]" title="Save As… (⇧⌘S)" onClick={p.saveAs}>Save as…</button>
        <button className="grid h-full w-8 place-items-center rounded-r-full border-l-[0.5px] border-[var(--separator)] hover:bg-[var(--fill)]" aria-label="More save options" title="More save options"
          onClick={(e) => nativeMenu([
            { label: "Save as PNG…", action: p.saveAsPng },
            { label: "Save as Project…", accelerator: "Alt+CmdOrCtrl+S", action: p.saveAsProject },
          ], e.currentTarget.parentElement)}>
          <ChevronDown {...CHEVRON} />
        </button>
      </div>
      <button className="ns-capsule ns-capsule--primary shrink-0 px-4" title="Save and close (⌘↩)" onClick={p.done}>Done</button>
    </header>
  );
}
