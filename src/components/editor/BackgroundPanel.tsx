import { GRADIENTS, type Background } from "./types";

export default function BackgroundPanel({ bg, setBg }: { bg: Background; setBg: (b: Background) => void }) {
  const row = "flex flex-col gap-1.5 text-xs font-medium";
  return (
    <div className="glass flex w-60 flex-col gap-4 rounded-2xl p-4">
      <div className="text-sm font-semibold">Background</div>
      <div className="grid grid-cols-4 gap-2">
        {GRADIENTS.map(([a, b], i) => (
          <button key={i} onClick={() => setBg({ ...bg, gradient: i })} className="aspect-square rounded-lg transition hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${a}, ${b})`, outline: bg.gradient === i ? "2px solid var(--accent)" : "none", outlineOffset: 2 }} />
        ))}
      </div>
      <label className={row}>Padding · {bg.padding}px
        <input type="range" min={0} max={240} value={bg.padding} onChange={(e) => setBg({ ...bg, padding: +e.target.value })} />
      </label>
      <label className={row}>Corner radius · {bg.radius}px
        <input type="range" min={0} max={48} value={bg.radius} onChange={(e) => setBg({ ...bg, radius: +e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input type="checkbox" checked={bg.shadow} onChange={(e) => setBg({ ...bg, shadow: e.target.checked })} />Shadow
      </label>
    </div>
  );
}
