import { Fragment } from "react";
import { MoreHorizontal } from "lucide-react";
import { TOOL_GROUPS, TOOLS } from "./tools";
import type { Tool } from "./types";
import { ICON, Sep, iconBtn } from "./IconButton";
import Popover from "./Popover";
import Tip from "./Tip";

/** Rarely used tools; folded into a "More" popover on narrow windows. */
const RARE: Tool[] = ["pixelate", "blur", "spotlight", "emoji"];

export default function ToolSegment({ tool, setTool, emoji, compact }: { tool: Tool; setTool: (t: Tool) => void; emoji: string; compact: boolean }) {
  const glyph = (id: Tool, Icon: React.ElementType) =>
    id === "emoji" ? <span className="text-[15px] leading-none">{emoji}</span> : <Icon {...ICON} />;
  const groups = TOOL_GROUPS.map((g) => (compact ? g.filter((t) => !RARE.includes(t.id)) : g));
  const hidden = TOOLS.filter((t) => RARE.includes(t.id));
  const hiddenActive = compact && RARE.includes(tool);
  return (
    <div role="toolbar" aria-label="Tools" data-tauri-drag-region className="flex shrink-0 items-center gap-1">
      {groups.map((g, gi) => (
        <Fragment key={gi}>
          {gi > 0 && <Sep />}
          {g.map(({ id, icon: Icon, label, key }) => (
            <Tip key={id} label={label} kbd={key.toUpperCase()}>
              <button className={iconBtn} aria-pressed={tool === id} aria-label={label} onClick={() => setTool(id)}>{glyph(id, Icon)}</button>
            </Tip>
          ))}
        </Fragment>
      ))}
      {compact && (
        <Popover align="start" trigger={({ open, toggle }) => (
          <Tip label="More tools">
            <button className={iconBtn} aria-label="More tools" aria-pressed={open || hiddenActive} onClick={toggle}>
              {hiddenActive ? glyph(tool, TOOLS.find((t) => t.id === tool)!.icon) : <MoreHorizontal {...ICON} />}
            </button>
          </Tip>
        )}>
          {(close) => (
            <div className="flex flex-col">
              {hidden.map(({ id, icon: Icon, label, key }) => (
                <button key={id} className="btn w-full min-w-[170px] justify-start gap-2.5 !px-2 text-left" data-active={tool === id}
                  onClick={() => { setTool(id); close(); }}>
                  <span className="grid w-[18px] place-items-center">{glyph(id, Icon)}</span>
                  <span className="flex-1">{label}</span>
                  <span className="t-caption tabular" style={tool === id ? { color: "inherit" } : undefined}>{key.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
        </Popover>
      )}
    </div>
  );
}
