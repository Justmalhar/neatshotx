import { useEffect, useRef } from "react";
import Konva from "konva";
import { Arrow, Circle, Ellipse, Group, Image as KImage, Line, Rect, Text } from "react-konva";
import type { Shape } from "./types";
import { FONT, contrast, fontOf, measure, pill } from "./text";

type Props = {
  s: Shape;
  unit: number;
  base: HTMLImageElement;
  counter: number;
  draggable: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onEdit: () => void;
  onDragStart?: () => void;
  /** Called after a Transformer resize; the caller bakes scale into geometry and resets it. */
  onTransform: (node: Konva.Node) => void;
  /** Hidden while its textarea is open. */
  editing?: boolean;
};

export default function ShapeNode({ s, unit, base, counter, draggable, onSelect, onMove, onEdit, onDragStart, onTransform, editing }: Props) {
  const sw = s.size * unit;
  const common = {
    id: s.id,
    x: s.x,
    y: s.y,
    draggable,
    onMouseDown: onSelect,
    onTap: onSelect,
    onDragStart,
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => onTransform(e.target),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onMove(e.target.x(), e.target.y()),
  };
  switch (s.kind) {
    case "arrow":
      return <Arrow {...common} points={[0, 0, s.w, s.h]} stroke={s.color} fill={s.color} strokeWidth={sw}
        pointerLength={sw * 3.5} pointerWidth={sw * 3.5} lineCap="round" lineJoin="round" hitStrokeWidth={sw + 12}
        shadowColor="black" shadowOpacity={0.25} shadowBlur={4 * unit} />;
    case "line":
      return <Line {...common} points={[0, 0, s.w, s.h]} stroke={s.color} strokeWidth={sw} lineCap="round" hitStrokeWidth={sw + 12} />;
    case "rect":
      return <Rect {...common} width={s.w} height={s.h} stroke={s.color} strokeWidth={sw} cornerRadius={4 * unit} />;
    case "filled":
      return <Rect {...common} width={s.w} height={s.h} fill={s.color} cornerRadius={4 * unit} />;
    case "ellipse":
      return <Ellipse {...common} x={s.x + s.w / 2} y={s.y + s.h / 2} radiusX={s.w / 2} radiusY={s.h / 2} stroke={s.color} strokeWidth={sw}
        onDragEnd={(e) => onMove(e.target.x() - s.w / 2, e.target.y() - s.h / 2)} />;
    case "pen":
      return <Line {...common} points={s.points} stroke={s.color} strokeWidth={sw} tension={0.4} lineCap="round" lineJoin="round" hitStrokeWidth={sw + 12} />;
    case "highlighter":
      return <Line {...common} points={s.points} stroke={s.color} strokeWidth={sw * 6} opacity={0.4} lineCap="round" lineJoin="round"
        globalCompositeOperation="multiply" />;
    case "text":
    case "emoji": {
      const fs = fontOf(s, unit);
      const fx = { text: s.text, fontSize: fs, fontStyle: "bold", fontFamily: FONT };
      if (s.kind === "text" && s.bg === "solid") {
        const m = measure(s.text || " ", fs), { px, py, r } = pill(fs);
        const h = m.h + py * 2;
        return (
          <Group {...common} visible={!editing} onDblClick={onEdit} onDblTap={onEdit}>
            <Rect width={m.w + px * 2} height={h} fill={s.color} cornerRadius={Math.min(r, h / 2)}
              shadowColor="black" shadowOpacity={0.25} shadowBlur={4 * unit} shadowOffsetY={1 * unit} />
            <Text {...fx} x={px} y={py} fill={contrast(s.color)} />
          </Group>
        );
      }
      return <Text {...common} {...fx} visible={!editing} fill={s.color} shadowColor="black" shadowOpacity={0.3} shadowBlur={3 * unit}
        onDblClick={onEdit} onDblTap={onEdit} />;
    }
    case "spotlight":
      // Invisible hit target so spotlights can be selected/moved/resized; the dimming mask is drawn by the editor.
      return <Rect {...common} width={s.w} height={s.h} fill="rgba(0,0,0,0.001)" />;
    case "counter": {
      const r = (6 + s.size * 3) * unit;
      return (
        <Group {...common}>
          <Circle radius={r} fill={s.color} shadowColor="black" shadowOpacity={0.3} shadowBlur={4 * unit} />
          <Text text={String(counter)} fill="white" fontStyle="bold" fontSize={r * 1.1} width={r * 2} height={r * 2}
            offsetX={r} offsetY={r} align="center" verticalAlign="middle" />
        </Group>
      );
    }
    case "pixelate":
    case "blur":
      return <Redact s={s} base={base} unit={unit} common={common} />;
    default:
      return null;
  }
}

function Redact({ s, base, unit, common }: { s: Shape; base: HTMLImageElement; unit: number; common: object }) {
  const ref = useRef<Konva.Image>(null);
  useEffect(() => {
    ref.current?.cache();
    ref.current?.getLayer()?.batchDraw();
  }, [s.x, s.y, s.w, s.h, base]);
  if (s.w < 2 || s.h < 2) return null;
  return (
    <KImage
      ref={ref}
      {...common}
      image={base}
      width={s.w}
      height={s.h}
      crop={{ x: s.x, y: s.y, width: s.w, height: s.h }}
      filters={[s.kind === "blur" ? Konva.Filters.Blur : Konva.Filters.Pixelate]}
      pixelSize={Math.max(6, 10 * unit)}
      blurRadius={18 * unit}
    />
  );
}
