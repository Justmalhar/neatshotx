import type { ArrowStyle } from "./arrows";

/** Small SVG preview of an arrow style (currentColor), 40x22. */
export default function ArrowGlyph({ style, inverse, className }: { style: ArrowStyle; inverse?: boolean; className?: string }) {
  const tri = (x: number, y: number, a: number) => <path d={`M${x} ${y}L${x - 7 * Math.cos(a) - 4 * Math.sin(a)} ${y - 7 * Math.sin(a) + 4 * Math.cos(a)}L${x - 7 * Math.cos(a) + 4 * Math.sin(a)} ${y - 7 * Math.sin(a) - 4 * Math.cos(a)}Z`} fill="currentColor" />;
  const line = { stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, fill: "none" };
  return (
    <svg viewBox="0 0 40 22" width="40" height="22" className={className} style={inverse ? { transform: "scaleX(-1)" } : undefined} aria-hidden>
      {style === "tapered" && <path d="M4 17L28 9.6L27 6L36 8L27 14L28 12.4Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />}
      {style === "standard" && <><path d="M5 16L30 8" {...line} />{tri(36, 6, Math.atan2(-2, 6))}</>}
      {style === "curved" && <><path d="M5 17Q16 4 29 8" {...line} />{tri(36, 9, 0.35)}</>}
      {style === "double" && <><path d="M11 14L29 8" {...line} />{tri(36, 6, Math.atan2(-2, 6))}{tri(4, 17, Math.atan2(2, -6))}</>}
      {style === "line-dot" && <><path d="M5 17L30 8" {...line} /><circle cx="33" cy="7" r="3.5" fill="currentColor" /></>}
    </svg>
  );
}
