import { invoke, convertFileSrc } from "@tauri-apps/api/core";

export type Region = { monitor: number; x: number; y: number; w: number; h: number };
export type WindowRect = { id: number; title: string; app: string; x: number; y: number; w: number; h: number };
export type Settings = {
  save_dir: string;
  image_format: "png" | "jpg" | "webp";
  copy_after_capture: boolean;
  save_after_capture: boolean;
  show_quick_access: boolean;
  self_timer_secs: number;
  hide_desktop_icons_while_capturing: boolean;
  screenshot_annotate: boolean;
  screenshot_pin: boolean;
  qa_position: "left" | "right";
  qa_auto_close_secs: number;
  qa_close_after_drag: boolean;
  scroll_auto: boolean;
  selector_remember_last: boolean;
  selector_show_magnifier: boolean;
  play_sounds: boolean;
  history_keep_days: number;
  window_shadow: boolean;
  window_padding: number;
  scale_retina_1x: boolean;
  file_name_template: string;
  ask_for_name: boolean;
  shutter_sound: "default" | "subtle" | "pop" | "classic" | "none";
  notifications: boolean;
  show_menu_bar_icon: boolean;
  qa_follow_active_screen: boolean;
  onboarded: boolean;
  shortcuts: Record<string, string>;
};

export type HistoryItem = { path: string; mtime: number };

export const api = {
  listWindows: (monitor: number) => invoke<WindowRect[]>("list_windows", { monitor }),
  finishSelection: (region: Region, windowId?: number) => invoke("finish_selection", { region, windowId }),
  cancelSelection: () => invoke("cancel_selection"),
  copyImage: (path: string) => invoke("copy_image", { path }),
  copyPng: (dataB64: string) => invoke("copy_png", { dataB64 }),
  writePng: (dataB64: string, path?: string, copy = false) => invoke<string>("write_png", { dataB64, path, copy }),
  listHistory: () => invoke<HistoryItem[]>("list_history"),
  deleteCapture: (path: string) => invoke("delete_capture", { path }),
  copyFile: (src: string, dest: string) => invoke("copy_file", { src, dest }),
  finishScroll: (keep: boolean) => invoke("finish_scroll", { keep }),
  takePending: () => invoke<string[]>("take_pending"),
  qaResize: (height: number) => invoke("qa_resize", { height }),
  openEditor: (path: string) => invoke("open_editor", { path }),
  openPin: (path: string) => invoke("open_pin", { path }),
  action: (name: string) => invoke("action", { name }),
  platform: () => invoke<string>("platform"),
  readTextFile: (path: string) => invoke<string>("read_text_file", { path }),
  writeTextFile: (path: string, contents: string) => invoke("write_text_file", { path, contents }),
  clearHistory: () => invoke("clear_history"),
  lastRegion: () => invoke<Region | null>("last_region"),
  getSettings: () => invoke<Settings>("get_settings"),
  setSettings: (settings: Settings) => invoke("set_settings", { settings }),
  /** Same-origin Blob URL so canvases stay exportable. */
  blobUrl: async (path: string) => {
    const buf = await invoke<ArrayBuffer>("read_file", { path });
    return URL.createObjectURL(new Blob([buf]));
  },
};

export const fileSrc = (path: string) => convertFileSrc(path);
export const fileName = (p: string) => p.split(/[\\/]/).pop() ?? p;
export const param = (k: string) => new URLSearchParams(location.hash.split("?")[1] ?? "").get(k);
