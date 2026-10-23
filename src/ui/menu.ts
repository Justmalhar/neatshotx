import { LogicalPosition } from "@tauri-apps/api/dpi";
import { Menu } from "@tauri-apps/api/menu";

export type MenuEntry =
  | { label: string; action: () => void; accelerator?: string; checked?: boolean; disabled?: boolean }
  | "separator";

/**
 * Shows a real OS menu (NSMenu / Win32 / GTK) — use for command lists (Save as…, zoom, filters)
 * instead of HTML dropdowns. Pass the anchor element to open just below it, like a pop-up button.
 */
export async function nativeMenu(entries: MenuEntry[], anchor?: Element | null) {
  const items = entries.map((e) =>
    e === "separator"
      ? { item: "Separator" as const }
      : { text: e.label, action: e.action, accelerator: e.accelerator, enabled: !e.disabled, ...(e.checked !== undefined && { checked: e.checked }) },
  );
  const menu = await Menu.new({ items });
  const r = anchor?.getBoundingClientRect();
  await menu.popup(r ? new LogicalPosition(r.left, r.bottom + 4) : undefined);
}
