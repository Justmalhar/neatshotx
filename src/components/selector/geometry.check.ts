// Run: bun src/components/selector/geometry.check.ts
import { fitRatio, moveRect, resizeRect, toImageRect } from "./geometry";

const ok = (c: boolean, m: string) => { if (!c) throw new Error("FAIL " + m); };
const B = { w: 1000, h: 600 };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

let r = resizeRect({ x: 100, y: 100, w: 0, h: 0 }, "se", { x: 50, y: 40 }, B, null);
ok(r.x === 50 && r.y === 40 && r.w === 50 && r.h === 60, "draw flips");
r = resizeRect({ x: 100, y: 100, w: 200, h: 100 }, "e", { x: 2000, y: 0 }, B, null);
ok(r.x === 100 && r.w === 900 && r.h === 100, "edge clamps to bounds, keeps other axis");
r = resizeRect({ x: 100, y: 100, w: 0, h: 0 }, "se", { x: 300, y: 120 }, B, 1);
ok(near(r.w, r.h) && r.w === 200, "ratio 1 grows to larger side");
r = resizeRect({ x: 100, y: 100, w: 100, h: 100 }, "e", { x: 900, y: 0 }, B, 16 / 9);
ok(near(r.w / r.h, 16 / 9) && r.y >= 0 && r.y + r.h <= B.h, "edge ratio stays in bounds");
r = resizeRect({ x: 500, y: 500, w: 0, h: 0 }, "se", { x: 5000, y: 5000 }, B, 1);
ok(near(r.w, r.h) && r.x + r.w <= B.w && r.y + r.h <= B.h, "corner ratio clamps");
r = moveRect({ x: 10, y: 10, w: 100, h: 100 }, 5000, -5000, B);
ok(r.x === 900 && r.y === 0, "move clamps");
r = fitRatio({ x: 0, y: 0, w: 400, h: 400 }, 16 / 9, B);
ok(near(r.w / r.h, 16 / 9), "fit");
const i = toImageRect({ x: 0.25, y: 0.25, w: 10.5, h: 10 }, 2);
ok(i.x === 1 && i.w === 21, "image rect");
console.log("geometry ok");
