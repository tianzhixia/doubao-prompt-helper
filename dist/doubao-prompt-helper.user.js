// ==UserScript==
// @name         Doubao Prompt Helper
// @namespace    https://github.com/
// @version      1.0.0
// @description  Prompt template helper for doubao.com.
// @match        https://www.doubao.com/*
// @match        https://doubao.com/*
// @grant        none
// ==/UserScript==
var DoubaoPromptHelper = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region src/index.ts
	function bootstrap() {}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
	//#endregion
	exports.bootstrap = bootstrap;
	return exports;
})({});
