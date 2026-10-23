import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  // Pre-bundle every Tauri API entry up front; discovering one mid-session makes Vite
  // re-optimize and serve 504 "Outdated Optimize Dep" to already-open windows.
  optimizeDeps: {
    include: [
      "@tauri-apps/api/core", "@tauri-apps/api/event", "@tauri-apps/api/window", "@tauri-apps/api/webviewWindow",
      "@tauri-apps/api/menu", "@tauri-apps/api/dpi", "@tauri-apps/api/app",
    ],
  },
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
});
