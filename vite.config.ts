import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  publicDir: process.env.VITE_ASSET_MODE === "graybox" ? false : "public",
  server: { host: "127.0.0.1", port: 5178, strictPort: true },
  build: { chunkSizeWarningLimit: 1600 },
});
