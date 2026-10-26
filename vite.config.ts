import { defineConfig } from "vite";
export default defineConfig({
  server: { host: "127.0.0.1", port: 5178, strictPort: true },
  build: { chunkSizeWarningLimit: 1600 },
});
