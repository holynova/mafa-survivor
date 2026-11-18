import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const graybox = process.env.VITE_ASSET_MODE === "graybox";
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  publicDir: graybox ? false : "public",
  resolve: {
    alias: graybox ? [{
      find: /^(?:.*\/)?assets\/bronze\/[^/]+\.webp(\?url)?$/,
      replacement: fileURLToPath(new URL("./src/assets/graybox-blank.svg", import.meta.url)) + "$1",
    }] : [],
  },
  server: {
    host: "127.0.0.1", port: 5178, strictPort: true,
    // Release worktrees/staging are not application sources. Watching them
    // reloads the game hundreds of times during an unrelated deployment.
    watch: { ignored: ["**/.artifacts/**", "**/.cache/**"] },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    // Keep the new UI artwork within the shared Worker's static file budget.
    assetsInlineLimit: file => file.includes("/src/assets/bronze/") ? true : undefined,
  },
});
