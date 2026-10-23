import { invoke, convertFileSrc } from "@tauri-apps/api/core";

export type Region = { monitor: number; x: number; y: number; w: number; h: number };
export type WindowRect = { id: number; title: string; app: string; x: number; y: number; w: number; h: number };
export type Settings = {
  save_dir: string;
  image_format: "png" | "jpg";
  copy_after_capture: boolean;
  save_after_capture: boolean;
  show_quick_access: boolean;
  self_timer_secs: number;
  hide_desktop_icons_while_capturing: boolean;
  record_fps: number;
  record_mic: boolean;
  record_mic_device: string;
  record_system_audio: boolean;
  record_show_clicks: boolean;
  record_show_keys: boolean;
  record_webcam: boolean;
  record_countdown: boolean;
  keystrokes_only_modifiers: boolean;
  qa_position: "left" | "right";
  qa_auto_close_secs: number;
  qa_close_after_drag: boolean;
  qa_close_after_upload: boolean;
  selector_remember_last: boolean;
  selector_show_magnifier: boolean;
  play_sounds: boolean;
  history_keep_days: number;
  upload_url: string;
  upload_field: string;
  upload_headers: Record<string, string>;
  shortcuts: Record<string, string>;
};

export const api = {
  listWindows: (monitor: number) => invoke<WindowRect[]>("list_windows", { monitor }),
  finishSelection: (region: Region, windowId?: number) => invoke("finish_selection", { region, windowId }),
  cancelSelection: () => invoke("cancel_selection"),
  copyImage: (path: string) => invoke("copy_image", { path }),
  copyPng: (dataB64: string) => invoke("copy_png", { dataB64 }),
  writePng: (dataB64: string, path?: string, copy = false) => invoke<string>("write_png", { dataB64, path, copy }),
  listHistory: () => invoke<string[]>("list_history"),
  deleteCapture: (path: string) => invoke("delete_capture", { path }),
  copyFile: (src: string, dest: string) => invoke("copy_file", { src, dest }),
  stopRecording: (asGif: boolean) => invoke<string>("stop_recording", { asGif }),
  cancelRecording: () => invoke("cancel_recording"),
  convertToGif: (path: string) => invoke<string>("convert_to_gif", { path }),
  finishScroll: (keep: boolean) => invoke("finish_scroll", { keep }),
  upload: (path: string) => invoke<string>("upload", { path }),
  takePending: () => invoke<string[]>("take_pending"),
  qaResize: (height: number) => invoke("qa_resize", { height }),
  openEditor: (path: string) => invoke("open_editor", { path }),
  openPin: (path: string) => invoke("open_pin", { path }),
  action: (name: string) => invoke("action", { name }),
  platform: () => invoke<string>("platform"),
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
export const isVideo = (p: string) => /\.(mp4|mov|webm)$/i.test(p);
export const isGif = (p: string) => /\.gif$/i.test(p);
export const fileName = (p: string) => p.split(/[\\/]/).pop() ?? p;
export const param = (k: string) => new URLSearchParams(location.hash.split("?")[1] ?? "").get(k);
