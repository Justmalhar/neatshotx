import { Fragment } from "react";
import { motion } from "motion/react";
import { spring } from "../../lib/motion";
import { TOOL_GROUPS } from "./tools";
import type { Tool } from "./types";
import Tip from "./Tip";

export default function ToolSegment({ tool, setTool, emoji }: { tool: Tool; setTool: (t: Tool) => void; emoji: string }) {
  return (
    <div role="toolbar" aria-label="Tools" className="flex items-center rounded-[9px] bg-[var(--fill)] p-0.5">
      {TOOL_GROUPS.map((g, gi) => (
        <Fragment key={gi}>
          {gi > 0 && <span className="mx-0.5 h-4 w-px bg-[var(--separator)]" />}
          {g.map(({ id, icon: Icon, label, key }) => {
            const active = tool === id;
            return (
              <Tip key={id} label={label} kbd={key.toUpperCase()}>
                <motion.button whileTap={{ scale: 0.9 }} transition={spring.press} aria-pressed={active} aria-label={label}
                  onClick={() => setTool(id)}
                  className={`relative grid h-7 w-[30px] place-items-center rounded-[7px] ${active ? "" : "hover:bg-[var(--fill-2)]"}`}>
                  {active && (
                    <motion.span layoutId="tool-pill" transition={spring.ui} className="absolute inset-0 rounded-[7px]"
                      style={{ background: "var(--accent)", boxShadow: "var(--shadow-sm)" }} />
                  )}
                  <span className="relative grid place-items-center" style={{ color: active ? "var(--accent-fg)" : undefined }}>
                    {id === "emoji" ? <span className="text-[15px] leading-none">{emoji}</span> : <Icon size={16} strokeWidth={1.9} />}
                  </span>
                </motion.button>
              </Tip>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
