// Rasterizes Lucide SVGs into tray-menu PNGs (dark + light variants) and the template tray glyph.
// Run: bun scripts/gen-menu-icons.ts
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ICONS = [
  "scan", "monitor", "app-window", "rotate-ccw-square", "arrow-down-to-line", "timer",
  "video", "eye-off", "eye", "pencil", "clipboard", "pin", "undo-2", "history",
];
const out = "src-tauri/icons/menu";
mkdirSync(out, { recursive: true });

const render = (name: string, color: string, px: number, stroke = 2) => {
  const svg = readFileSync(`node_modules/lucide-static/icons/${name}.svg`, "utf8")
    .replace(/stroke="currentColor"/, `stroke="${color}"`)
    .replace(/stroke-width="[\d.]+"/, `stroke-width="${stroke}"`);
  return new Resvg(svg, { fitTo: { mode: "width", value: px } }).render().asPng();
};

for (const name of ICONS) {
  writeFileSync(`${out}/${name}-dark.png`, render(name, "#1d1d1f", 36)); // for light menus
  writeFileSync(`${out}/${name}-light.png`, render(name, "#f5f5f7", 36)); // for dark menus
}
// Menu-bar glyph: black + alpha, used as a macOS template image (auto-tints).
writeFileSync("src-tauri/icons/tray.png", render("focus", "#000000", 44, 2.4));
console.log(`wrote ${ICONS.length * 2 + 1} icons`);
