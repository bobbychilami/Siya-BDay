import { defineConfig } from "vite";

/**
 * The invitation is published as a GitHub Pages *project* site:
 *   https://bobbychilami.github.io/Siya-BDay/
 * so every emitted asset URL must carry the repository prefix.
 */
export default defineConfig({
  base: "/Siya-BDay/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
});
