import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

// Builds only the hero bundle into ../public/hero; index.html stays hand-built by build.py.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: "../public/hero",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        entryFileNames: "hero.js",
        assetFileNames: "hero[extname]",
      },
    },
  },
});
