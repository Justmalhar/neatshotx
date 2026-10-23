import { useRef, useState, type ReactNode } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { api } from "../../../lib/api";
import type { Background, BgAlign, BgRatio } from "../types";
import { GRADIENT_PRESETS, PLAIN_COLORS, WALLPAPERS, swatchURL } from "./presets";

const CSS = `
.bgp-range{-webkit-appearance:none;appearance:none;width:100%;height:16px;background:transparent;accent-color:var(--accent);margin:0}
.bgp-range::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:linear-gradient(to right,var(--accent) var(--v),var(--fill-2) var(--v))}
.bgp-range::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5px;border-radius:50%;background:#fff;box-shadow:0 0 0 .5px rgba(0,0,0,.2),0 1px 3px rgba(0,0,0,.3)}
.bgp-range:focus-visible{outline:none}.bgp-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 45%,transparent),0 1px 3px rgba(0,0,0,.3)}
`;
const ring = (on: boolean) => (on ? "0 0 0 2px var(--bg-window), 0 0 0 4px var(--accent)" : "inset 0 0 0 .5px rgba(0,0,0,.18)");
const hd = "text-[13px] font-semibold tracking-[-0.006em]";

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between"><h3 className={hd}>{title}</h3>{right}</div>
      {children}
    </section>
  );
}

function Tile({ on, onClick, label, children, className = "" }: { on: boolean; onClick: () => void; label: string; children?: ReactNode; className?: string }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={on} onClick={onClick}
      className={`relative aspect-square overflow-hidden rounded-[8px] bg-cover bg-center transition-transform active:scale-95 ${className}`}
      style={{ boxShadow: ring(on) }}>{children}</button>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-0.5">
      <span className="t-caption">{label}</span>
      <input type="range" min={0} max={100} value={value} className="bgp-range" style={{ ["--v" as string]: `${value}%` }} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

const ALIGNS: BgAlign[] = ["tl", "t", "tr", "l", "c", "r", "bl", "b", "br"];
const RATIOS: BgRatio[] = ["auto", "16:9", "4:3", "1:1", "9:16", "3:2"];

function AlignGlyph({ a, on }: { a: BgAlign; on: boolean }) {
  const x = a.includes("l") ? 2 : a.includes("r") ? 8 : 5, y = a.startsWith("t") ? 2 : a.startsWith("b") ? 8 : 5;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <rect x="1" y="1" width="16" height="16" rx="3" fill="none" stroke={on ? "#fff" : "currentColor"} strokeOpacity={on ? 0.8 : 0.35} />
      <rect x={x + 1} y={y + 1} width="6" height="6" rx="1.5" fill={on ? "#fff" : "currentColor"} fillOpacity={on ? 1 : 0.7} />
    </svg>
  );
}

export default function BackgroundPanel({ bg, setBg, img }: { bg: Background; setBg: (b: Background) => void; img: HTMLImageElement | null }) {
  const [more, setMore] = useState(false);
  const colorRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Background>) => setBg({ ...bg, ...p });
  const grads = more ? GRADIENT_PRESETS : GRADIENT_PRESETS.slice(0, 10);
  const isCustomColor = bg.kind === "color" && !PLAIN_COLORS.flat().includes(bg.color);

  const pickWallpaper = async () => {
    const path = await open({ multiple: false, filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "heic", "webp"] }] });
    if (typeof path !== "string") return;
    set({ kind: "wallpaper", wallpaper: -1, customWallpaper: await api.blobUrl(path) });
  };

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-[var(--separator)] bg-[var(--bg-window)] p-3.5 text-[var(--label)]">
      <style>{CSS}</style>
      <button type="button" onClick={() => set({ kind: "none" })} aria-pressed={bg.kind === "none"}
        className="h-8 w-full rounded-[8px] bg-[var(--bg-content)] text-[13px] font-medium transition-transform active:scale-[.98]"
        style={{ boxShadow: bg.kind === "none" ? "0 0 0 2px var(--accent)" : "var(--shadow-sm)" }}>None</button>

      <Section title="Gradients" right={
        <button type="button" onClick={() => setMore(!more)} className="t-caption flex items-center gap-0.5 hover:opacity-70">
          {more ? "Show less" : "Show more"}{more ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>}>
        <div className="grid grid-cols-5 gap-2.5">
          {grads.map((g, i) => (
            <Tile key={g.name} label={g.name} on={bg.kind === "gradient" && bg.gradient === i} onClick={() => set({ kind: "gradient", gradient: i })}
              className="" ><span className="absolute inset-0 bg-cover" style={{ backgroundImage: `url(${swatchURL("gradient", i)})` }} /></Tile>
          ))}
        </div>
      </Section>

      <Section title="Wallpapers">
        <div className="grid grid-cols-5 gap-2.5">
          {WALLPAPERS.map((w, i) => (
            <Tile key={w.name} label={w.name} on={bg.kind === "wallpaper" && bg.wallpaper === i} onClick={() => set({ kind: "wallpaper", wallpaper: i })}>
              <span className="absolute inset-0 bg-cover" style={{ backgroundImage: `url(${swatchURL("wallpaper", i)})` }} />
            </Tile>
          ))}
          {bg.customWallpaper && (
            <Tile label="Custom wallpaper" on={bg.kind === "wallpaper" && bg.wallpaper === -1} onClick={() => set({ kind: "wallpaper", wallpaper: -1 })}>
              <span className="absolute inset-0 bg-cover" style={{ backgroundImage: `url(${bg.customWallpaper})` }} />
            </Tile>
          )}
          <button type="button" aria-label="Choose wallpaper image" onClick={pickWallpaper}
            className="grid aspect-square place-items-center rounded-[8px] border border-dashed border-[var(--label-3)] text-[var(--label-2)] transition-transform hover:bg-[var(--fill)] active:scale-95">
            <Plus size={14} />
          </button>
        </div>
      </Section>

      <Section title="Blurred">
        <div className="grid grid-cols-5 gap-2.5">
          {["Light", "Dark", "Darker"].map((n, i) => (
            <Tile key={n} label={`Blurred ${n.toLowerCase()}`} on={bg.kind === "blurred" && bg.blurred === i} onClick={() => set({ kind: "blurred", blurred: i })} className="bg-[var(--fill-2)]">
              {img && <img src={img.src} alt="" draggable={false} className="absolute inset-0 h-full w-full scale-150 object-cover blur-[6px]" />}
              <span className="absolute inset-0" style={{ background: ["rgba(255,255,255,.4)", "rgba(0,0,0,.35)", "rgba(0,0,0,.6)"][i] }} />
            </Tile>
          ))}
        </div>
      </Section>

      <Section title="Plain color">
        <div className="flex flex-col gap-2">
          {PLAIN_COLORS.map((row, ri) => (
            <div key={ri} className="grid grid-cols-9 gap-1.5">
              {row.map((c) => {
                const custom = c === "custom", on = bg.kind === "color" && (custom ? isCustomColor : bg.color === c);
                return (
                  <button key={c} type="button" aria-label={custom ? "Custom color" : c} title={custom ? "Custom color" : c} aria-pressed={on}
                    onClick={() => (custom ? colorRef.current?.click() : set({ kind: "color", color: c }))}
                    className="aspect-square rounded-full transition-transform active:scale-90"
                    style={{
                      boxShadow: ring(on),
                      background: custom ? (isCustomColor && on ? bg.color : "conic-gradient(#ff3b30,#ffcc00,#34c759,#0a84ff,#af52de,#ff3b30)")
                        : c === "transparent" ? "repeating-conic-gradient(#ccc 0 25%,#fff 0 50%) 0 0/8px 8px" : c,
                    }} />
                );
              })}
            </div>
          ))}
          <input ref={colorRef} type="color" className="pointer-events-none absolute h-0 w-0 opacity-0" tabIndex={-1} aria-hidden
            value={/^#[0-9a-f]{6}$/i.test(bg.color) ? bg.color : "#ffffff"} onChange={(e) => set({ kind: "color", color: e.target.value })} />
        </div>
      </Section>

      <hr className="border-[var(--separator)]" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="col-span-2"><Slider label="Padding" value={bg.padding} onChange={(v) => set({ padding: v })} /></div>
        <Slider label="Inset" value={bg.inset} onChange={(v) => set({ inset: v })} />
        <label className="flex items-end gap-1.5 pb-0.5 text-[12px]">
          <input type="checkbox" className="size-3.5 accent-[var(--accent)]" checked={bg.autoBalance} onChange={(e) => set({ autoBalance: e.target.checked })} />Auto-balance
        </label>
        <Slider label="Shadow" value={bg.shadow} onChange={(v) => set({ shadow: v })} />
        <Slider label="Corners" value={bg.radius} onChange={(v) => set({ radius: v })} />
      </div>

      <div className="flex items-start justify-between gap-4 pb-2">
        <div className="flex flex-col gap-1.5">
          <span className="t-caption">Alignment</span>
          <div className="grid grid-cols-3 gap-1">
            {ALIGNS.map((a) => (
              <button key={a} type="button" aria-label={`Align ${a}`} aria-pressed={bg.align === a} onClick={() => set({ align: a })}
                className="grid size-7 place-items-center rounded-[6px] transition-colors"
                style={{ background: bg.align === a ? "var(--label)" : "var(--fill)", color: bg.align === a ? "var(--bg-content)" : "var(--label)" }}>
                <AlignGlyph a={a} on={bg.align === a} />
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="t-caption">Ratio</span>
          <select value={bg.ratio} onChange={(e) => set({ ratio: e.target.value as BgRatio })}
            className="h-7 rounded-[6px] bg-[var(--bg-content)] px-2 text-[12px]" style={{ boxShadow: "var(--shadow-sm)" }}>
            {RATIOS.map((r) => <option key={r} value={r}>{r === "auto" ? "Auto" : r}</option>)}
          </select>
        </label>
      </div>
    </aside>
  );
}
