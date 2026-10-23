import { Fragment } from "react";
import { motion } from "motion/react";
import { spring } from "../../lib/motion";
import { TOOL_GROUPS } from "./tools";
import type { Tool } from "./types";
import { ICON, Sep } from "./IconButton";

/** One `--fill` capsule track holding every tool; the selected tool's accent highlight glides between slots (shared layoutId). */
export default function ToolPill({ tool, setTool, emoji }: { tool: Tool; setTool: (t: Tool) => void; emoji: string }) {
  const glyph = (id: Tool, Icon: React.ElementType, fill?: boolean) =>
    id === "emoji" ? <span className="leading-none" style={{ fontSize: 16 }}>{emoji}</span>
    : id === "counter" ? <span className="grid size-4 place-items-center rounded-full border-[1.75px] border-current font-bold leading-none" style={{ fontSize: 9, color: "inherit" }}>1</span>
    : <Icon {...ICON} fill={fill ? "currentColor" : "none"} />;
  return (
    <div role="toolbar" aria-label="Tools" data-tauri-drag-region className="flex h-8 shrink-0 items-center gap-0.5 rounded-full bg-[var(--fill)] p-0.5">
      {TOOL_GROUPS.map((g, gi) => (
        <Fragment key={gi}>
          {gi > 0 && <Sep />}
          {g.map(({ id, icon, label, key, fill }) => {
            const on = tool === id;
            return (
              <button key={id} aria-pressed={on} aria-label={label} title={`${label} (${key.toUpperCase()})`} onClick={() => setTool(id)}
                className="ns-tool relative !w-8 !rounded-full !px-0 aria-pressed:!bg-transparent aria-pressed:!text-[var(--accent-fg)]">
                {on && <motion.span layoutId="tool-pill" transition={spring.ui} className="absolute inset-0 rounded-full bg-[var(--accent)]" />}
                <span className="relative grid place-items-center">{glyph(id, icon, fill)}</span>
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
