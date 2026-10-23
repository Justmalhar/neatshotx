// Synthesized shutter sounds. No assets.
import type { Settings } from "../../lib/api";

export type Shutter = Settings["shutter_sound"];
export const SHUTTERS: [Shutter, string][] = [["default", "Default"], ["subtle", "Subtle"], ["pop", "Pop"], ["classic", "Classic"], ["none", "None"]];

let ctx: AudioContext | null = null;

/** Band-swept noise burst: the core of a shutter click. */
function burst(c: AudioContext, t: number, dur: number, f0: number, f1: number, gain: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

/** Short pitched blip. */
function pop(c: AudioContext, t: number) {
  const o = c.createOscillator();
  o.frequency.setValueAtTime(620, t);
  o.frequency.exponentialRampToValueAtTime(180, t + 0.09);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.11);
}

export function playShutter(kind: Shutter = "default") {
  if (kind === "none") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    if (kind === "subtle") burst(ctx, t, 0.08, 3200, 1400, 0.07);
    else if (kind === "pop") pop(ctx, t);
    else if (kind === "classic") { burst(ctx, t, 0.03, 4200, 2600, 0.3); burst(ctx, t + 0.075, 0.045, 3000, 1500, 0.26); }
    else burst(ctx, t, 0.12, 5200, 1600, 0.18);
  } catch {
    /* audio unavailable: silent */
  }
}
