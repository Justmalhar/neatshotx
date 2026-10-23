import { computeSnap } from "./snap";

const ok = (c: unknown, m = "assertion failed") => { if (!c) throw new Error(m); };
const assert = { ok, equal: (a: unknown, b: unknown) => ok(a === b, `expected ${b}, got ${a}`) };

const img = { x: 0, y: 0, w: 1000, h: 600 };
// left edge 4px off the image edge -> snaps, vertical guide at 0
let r = computeSnap({ x: 4, y: 100, w: 50, h: 50 }, [img], 6);
assert.equal(r.dx, -4); assert.equal(r.dy, 0);
assert.ok(r.guides.some((g) => g.o === "v" && g.pos === 0));
// outside threshold -> no snap
r = computeSnap({ x: 7, y: 100, w: 50, h: 50 }, [img], 6);
assert.equal(r.dx, 0); assert.equal(r.guides.length, 0);
// centre snaps to the image centre line (x=500) and other shape's edge
r = computeSnap({ x: 473, y: 100, w: 50, h: 50 }, [img], 6);
assert.equal(r.dx, 2); assert.ok(r.guides.some((g) => g.o === "v" && g.pos === 500));
const other = { x: 200, y: 300, w: 100, h: 100 };
r = computeSnap({ x: 100, y: 253, w: 80, h: 50 }, [img, other], 6);
assert.equal(r.dy, -3); assert.ok(r.guides.some((g) => g.o === "h" && g.pos === 300));
// resize: only the right edge may snap
r = computeSnap({ x: 10, y: 10, w: 988, h: 50 }, [img], 6, { x: [2], y: [] });
assert.equal(r.dx, 2); assert.equal(r.dy, 0);
console.log("snap ok");
