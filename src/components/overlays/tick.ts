let ctx: AudioContext | undefined;

/** Tiny UI click via Web Audio (no asset). Silent if audio is unavailable. */
export function tick(freq = 1200, vol = 0.06) {
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.06);
  } catch { /* ignore */ }
}
