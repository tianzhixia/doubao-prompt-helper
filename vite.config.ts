import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "DoubaoPromptHelper",
      formats: ["iife"],
      fileName: () => "doubao-prompt-helper.user.js"
    }
  }
});
