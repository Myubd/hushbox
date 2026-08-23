import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauriの規約(https://tauri.app/develop/#frontend)に合わせたVite設定。
// devUrlをtauri.conf.jsonのdevUrlと一致させる必要がある。
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
