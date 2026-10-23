import { Aperture } from "lucide-react";

/** App icon tile (Welcome, About). Gradient derived from the system accent. */
export default function AppIcon({ size = 64 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, background: "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 65%, white), var(--accent))" }}
      className="grid place-items-center rounded-[var(--r-lg)] text-[var(--accent-fg)] shadow-[var(--shadow-md)]">
      <Aperture size={size * 0.56} strokeWidth={1.75} />
    </div>
  );
}
