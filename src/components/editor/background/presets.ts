/** Procedural backgrounds. The same draw fns paint the Konva canvas (Backdrop) and the panel swatches. */
export type Blob = [x: number, y: number, r: number, color: string]; // x,y,r relative (0..1; r vs max(w,h))
export type GradientPreset = { name: string; from: string; to: string; angle: number; blobs: Blob[] };
export type Wallpaper = { name: string; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void };

const g = (name: string, from: string, to: string, angle: number, blobs: Blob[]): GradientPreset => ({ name, from, to, angle, blobs });

export const GRADIENT_PRESETS: GradientPreset[] = [
  g("Pink", "#ff5fa2", "#a63cff", 35, [[0.15, 0.2, 0.7, "#ffb3d9"], [0.9, 0.9, 0.7, "#7a2cff"]]),
  g("Blue Violet", "#4f7bff", "#a35cff", 30, [[0.1, 0.1, 0.8, "#7fc2ff"], [0.95, 0.9, 0.6, "#c04fff"]]),
  g("Navy", "#0b1f4d", "#1d4ed8", 40, [[0.2, 0.9, 0.7, "#2f6bff"], [0.9, 0.1, 0.5, "#0a1633"]]),
  g("Mint", "#7ff5c8", "#18b3b8", 25, [[0.1, 0.1, 0.7, "#d3ffe9"], [0.9, 0.9, 0.7, "#0e8fa8"]]),
  g("Coral", "#ff8a6b", "#ff4f7b", 30, [[0.1, 0.1, 0.7, "#ffd0a0"], [0.9, 0.9, 0.7, "#e0306a"]]),
  g("Aurora", "#a855f7", "#22d3ee", 20, [[0.1, 0.9, 0.7, "#f472b6"], [0.9, 0.1, 0.7, "#06b6d4"]]),
  g("Pearl", "#fdf2ff", "#cfe6ff", 30, [[0.1, 0.1, 0.6, "#ffe3f1"], [0.9, 0.9, 0.7, "#c9dcff"]]),
  g("Peach Gray", "#ffd5c2", "#b8bcc8", 35, [[0.1, 0.2, 0.7, "#ffe6d6"], [0.9, 0.9, 0.7, "#9aa0b2"]]),
  g("Periwinkle", "#a5b4fc", "#c4b5fd", 35, [[0.1, 0.1, 0.7, "#e0e7ff"], [0.9, 0.9, 0.7, "#8b8cf0"]]),
  g("Midnight", "#0f0c29", "#302b63", 35, [[0.9, 0.1, 0.6, "#4b3fa8"], [0.1, 0.9, 0.7, "#0a0820"]]),
  g("Dusk Blue", "#3b5998", "#8fb2e8", 60, [[0.2, 0.9, 0.7, "#c8d9f5"], [0.9, 0.1, 0.6, "#26407a"]]),
  g("Lavender", "#e6d5ff", "#b9a2f0", 35, [[0.1, 0.1, 0.7, "#fbeaff"], [0.9, 0.9, 0.7, "#a58be8"]]),
  g("Violet Silk", "#6d28d9", "#c026d3", 45, [[0.2, 0.2, 0.6, "#8b5cf6"], [0.8, 0.9, 0.7, "#f0abfc"]]),
  g("Wine", "#5b0f2e", "#b0235c", 35, [[0.1, 0.9, 0.6, "#d6407a"], [0.9, 0.1, 0.6, "#3a0820"]]),
  g("Indigo", "#1e1b4b", "#4338ca", 40, [[0.9, 0.9, 0.7, "#6366f1"], [0.1, 0.1, 0.6, "#12102f"]]),
  g("Candy", "#ff9de6", "#8ec5ff", 30, [[0.1, 0.1, 0.7, "#ffd1f5"], [0.9, 0.9, 0.7, "#9be7ff"], [0.9, 0.1, 0.4, "#ffe29f"]]),
  g("Sunset", "#ff7e5f", "#feb47b", 70, [[0.1, 0.9, 0.7, "#ff5e8a"], [0.9, 0.1, 0.6, "#ffd27a"]]),
  g("Ocean Gold", "#0e7490", "#fbbf24", 35, [[0.1, 0.1, 0.7, "#164e8a"], [0.95, 0.95, 0.7, "#fde68a"]]),
  g("Crimson", "#7f1d1d", "#ef4444", 35, [[0.1, 0.9, 0.6, "#f87171"], [0.9, 0.1, 0.6, "#450a0a"]]),
  g("Rose Gold", "#f4c2c2", "#d4a5a5", 35, [[0.1, 0.1, 0.7, "#ffe4dc"], [0.9, 0.9, 0.7, "#c28b94"]]),
];

export function drawGradient(ctx: CanvasRenderingContext2D, w: number, h: number, p: GradientPreset) {
  const a = (p.angle * Math.PI) / 180, m = Math.max(w, h);
  const dx = Math.cos(a) * m / 2, dy = Math.sin(a) * m / 2, cx = w / 2, cy = h / 2;
  const lg = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  lg.addColorStop(0, p.from); lg.addColorStop(1, p.to);
  ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
  for (const [x, y, r, c] of p.blobs) {
    const rg = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * m);
    rg.addColorStop(0, c); rg.addColorStop(1, c + "00"); // c is #rrggbb
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  }
}

/** Layered translucent sine ribbons. */
function waves(ctx: CanvasRenderingContext2D, w: number, h: number, layers: { c0: string; c1: string; y: number; amp: number; ph: number }[]) {
  for (const L of layers) {
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 60) {
      const t = x / w;
      ctx.lineTo(x, h * L.y + Math.sin(t * Math.PI * 2 + L.ph) * h * L.amp + Math.sin(t * Math.PI * 5 + L.ph * 2) * h * L.amp * 0.3);
    }
    ctx.lineTo(w, h); ctx.closePath();
    const lg = ctx.createLinearGradient(0, h * (L.y - L.amp), 0, h);
    lg.addColorStop(0, L.c0); lg.addColorStop(1, L.c1);
    ctx.fillStyle = lg; ctx.fill();
  }
}

export const WALLPAPERS: Wallpaper[] = [
  { name: "Waves", draw: (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#f9c4e3"); bg.addColorStop(0.5, "#a7b8ff"); bg.addColorStop(1, "#6fd3ff");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    waves(ctx, w, h, [
      { c0: "rgba(255,255,255,.55)", c1: "rgba(180,160,255,.35)", y: 0.35, amp: 0.1, ph: 0 },
      { c0: "rgba(255,160,220,.5)", c1: "rgba(120,140,255,.4)", y: 0.55, amp: 0.1, ph: 1.6 },
      { c0: "rgba(120,200,255,.55)", c1: "rgba(70,90,230,.55)", y: 0.75, amp: 0.08, ph: 3.1 },
    ]);
  } },
  { name: "Silk", draw: (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#050b24"); bg.addColorStop(1, "#0b2a7a");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    waves(ctx, w, h, [
      { c0: "rgba(60,120,255,.55)", c1: "rgba(5,15,60,.2)", y: 0.3, amp: 0.14, ph: 0.4 },
      { c0: "rgba(30,80,220,.5)", c1: "rgba(5,10,40,.3)", y: 0.5, amp: 0.12, ph: 2.2 },
      { c0: "rgba(120,170,255,.45)", c1: "rgba(10,30,110,.5)", y: 0.7, amp: 0.1, ph: 4 },
    ]);
  } },
  { name: "Dusk", draw: (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, "#2b1055"); sky.addColorStop(0.55, "#d4577b"); sky.addColorStop(1, "#ffb88c");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    const sun = ctx.createRadialGradient(w * 0.7, h * 0.55, 0, w * 0.7, h * 0.55, h * 0.4);
    sun.addColorStop(0, "rgba(255,230,180,.9)"); sun.addColorStop(1, "rgba(255,230,180,0)");
    ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
    const ridge = (y: number, amp: number, seed: number, c: string) => {
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += w / 80) { const t = x / w; ctx.lineTo(x, h * y - Math.abs(Math.sin(t * 7 + seed)) * h * amp - Math.sin(t * 17 + seed * 3) * h * amp * 0.15); }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    };
    ridge(0.75, 0.22, 1, "rgba(120,60,110,.7)"); ridge(0.88, 0.2, 3, "rgba(60,25,80,.85)"); ridge(1, 0.16, 5, "#1a0b33");
  } },
];

export const PLAIN_COLORS: string[][] = [
  ["#000000", "#ffffff", "#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#0a84ff", "#af52de", "transparent"],
  ["#3a3a3c", "#d1d1d6", "#ffb3ae", "#ffd6a0", "#fff1a8", "#b6efc6", "#a8d4ff", "#e0c4f5", "custom"],
];

const cache = new Map<string, string>();
/** Tiny canvas data URL of a gradient preset (idx) or wallpaper — same drawing as Backdrop. */
export function swatchURL(kind: "gradient" | "wallpaper", i: number, w = 72, h = 72): string {
  const key = `${kind}${i}${w}x${h}`;
  let u = cache.get(key);
  if (!u) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d")!;
    if (kind === "gradient") drawGradient(ctx, w, h, GRADIENT_PRESETS[i]); else WALLPAPERS[i].draw(ctx, w, h);
    u = c.toDataURL(); cache.set(key, u);
  }
  return u;
}
