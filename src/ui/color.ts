/** Resolves a CSS color (incl. var(--accent) → -apple-system-control-accent) to rgb() for canvas APIs like Konva. */
export function resolveColor(css: string): string {
  const el = document.createElement("span");
  el.style.color = css;
  el.style.display = "none";
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  el.remove();
  return rgb;
}
