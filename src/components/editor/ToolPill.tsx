import { Fragment } from "react";
import { motion } from "motion/react";
import { spring } from "../../lib/motion";
import { TOOL_GROUPS } from "./tools";
import type { Tool } from "./types";
import { ICON, Sep } from "./IconButton";
import Tip from "./Tip";

/** One light-gray capsule holding every tool; the selected tool's accent capsule glides between slots (shared layoutId). */
export default function ToolPill({ tool, setTool, emoji }: { tool: Tool; setTool: (t: Tool) => void; emoji: string }) {
  const glyph = (id: Tool, Icon: React.ElementType, fill?: boolean) =>
    id === "emoji" ? <span className="text-[16px] leading-none">{emoji}</span>
    : id === "counter" ? <span className="grid h-[17px] w-[17px] place-items-center rounded-full border-2 border-current text-[10px] font-bold leading-none">1</span>
    : <Icon {...ICON} fill={fill ? "currentColor" : "none"} />;
  return (
    <div role="toolbar" aria-label="Tools" data-tauri-drag-region className="flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-[var(--fill)] p-[3px]">
      {TOOL_GROUPS.map((g, gi) => (
        <Fragment key={gi}>
          {gi > 0 && <Sep />}
          {g.map(({ id, icon, label, key, fill }) => {
            const on = tool === id;
            return (
              <Tip key={id} label={label} kbd={key.toUpperCase()}>
                <button aria-pressed={on} aria-label={label} onClick={() => setTool(id)}
                  className={"relative grid h-[30px] w-[34px] place-items-center rounded-full transition-colors duration-100 active:scale-95 " +
                    (on ? "text-white" : "text-[var(--label)] hover:bg-[var(--fill-2)]")}>
                  {on && <motion.span layoutId="tool-pill" transition={spring.ui} className="absolute inset-0 rounded-full bg-[var(--accent)]" style={{ boxShadow: "var(--shadow-sm)" }} />}
                  <span className="relative grid place-items-center">{glyph(id, icon, fill)}</span>
                </button>
              </Tip>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
