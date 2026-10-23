import { layoutBackground } from "./layout";
import { DEFAULT_BACKGROUND as D } from "../types";
const assert = Object.assign(
  (c: unknown, m = "assert failed") => { if (!c) throw new Error(m); },
  { equal: (a: unknown, b: unknown, m?: string) => { if (a !== b) throw new Error(m ?? `${a} !== ${b}`); },
    deepEqual: (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } },
);

const none = layoutBackground({ ...D, kind: "none" }, 800, 600);
assert.deepEqual(none, { W: 800, H: 600, frame: { x: 0, y: 0, w: 800, h: 600 }, image: { x: 0, y: 0 }, radius: 0 });

const r = layoutBackground({ ...D, kind: "gradient", ratio: "16:9" }, 800, 600);
assert(Math.abs(r.W / r.H - 16 / 9) < 0.01, "16:9");
assert(r.frame.x + r.frame.w <= r.W && r.frame.y >= 0);

const tl = layoutBackground({ ...D, kind: "gradient", align: "tl", ratio: "1:1" }, 800, 600);
const pad = Math.round(0.4 * 0.25 * 800);
assert.equal(tl.frame.x, pad); assert.equal(tl.frame.y, pad);

const z = layoutBackground({ ...D, kind: "gradient", padding: 0, align: "r", ratio: "16:9" }, 600, 600);
assert.equal(z.frame.x + z.frame.w, z.W, "zero padding, right align on expanded axis");
const i = layoutBackground({ ...D, kind: "gradient", inset: 50 }, 800, 600);
assert(i.image.x === i.frame.x + (i.frame.w - 800) / 2);
console.log("layout.check ok");
