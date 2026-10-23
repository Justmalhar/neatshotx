import { Circle } from "react-konva";
import type { Shape } from "./types";

/** Draggable endpoint handles for arrows/lines (replaces the Transformer). Rendered on the overlay layer, so never exported. */
export default function LineHandles({ s, scale, onChange, onEnd }: {
  s: Shape;
  scale: number;
  onChange: (s: Shape) => void;
  onEnd: (s: Shape) => void;
}) {
  const r = 5.5 / scale;
  const props = {
    radius: r, fill: "#fff", stroke: "#0a84ff", strokeWidth: 1.5 / scale, draggable: true, hitStrokeWidth: 10 / scale,
    shadowColor: "black", shadowOpacity: 0.3, shadowBlur: 3 / scale,
  };
  const move = (end: boolean) => (e: { target: { x(): number; y(): number } }) => {
    const p = { x: e.target.x(), y: e.target.y() };
    return end ? { ...s, w: p.x - s.x, h: p.y - s.y } : { ...s, x: p.x, y: p.y, w: s.x + s.w - p.x, h: s.y + s.h - p.y };
  };
  return (
    <>
      <Circle {...props} x={s.x} y={s.y} onDragMove={(e) => onChange(move(false)(e))} onDragEnd={(e) => onEnd(move(false)(e))} />
      <Circle {...props} x={s.x + s.w} y={s.y + s.h} onDragMove={(e) => onChange(move(true)(e))} onDragEnd={(e) => onEnd(move(true)(e))} />
    </>
  );
}
