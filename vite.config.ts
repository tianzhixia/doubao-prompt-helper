import path from "node:path";
import { defineConfig } from "vite";

const userscriptBanner = `// ==UserScript==
// @name         Doubao Prompt Helper
// @namespace    https://github.com/
// @version      1.0.0
// @description  Prompt template helper for doubao.com.
// @match        https://www.doubao.com/*
// @match        https://doubao.com/*
// @grant        none
// ==/UserScript==
`;

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
    },
    rollupOptions: {
      output: {
        banner: userscriptBanner
      }
    }
  }
});
