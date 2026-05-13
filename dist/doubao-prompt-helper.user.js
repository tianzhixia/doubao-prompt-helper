// ==UserScript==
// @name         豆包 Prompt 助手
// @namespace    https://github.com/your-name/doubao-prompt-helper
// @version      1.0.0
// @description  在豆包网页中快速调用本地 prompt 模板
// @match        https://www.doubao.com/*
// @match        https://doubao.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      raw.githubusercontent.com
// @connect      *
// @license      MIT
// ==/UserScript==
var DoubaoPromptHelper = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region src/core/doubao-adapter.ts
	var doubaoSelectors = {
		textarea: "textarea",
		contentEditable: "[contenteditable]:not([contenteditable=\"false\"])",
		roleTextbox: "[role=\"textbox\"]",
		get inputCandidates() {
			return [
				this.textarea,
				this.contentEditable,
				this.roleTextbox
			].join(",");
		}
	};
	function findInputElement(root = getDefaultRoot()) {
		if (!root) return null;
		try {
			return collectInputCandidates(root).filter(isUsableInputCandidate).map((element) => ({
				element,
				score: scoreInputCandidate(element)
			})).sort((left, right) => right.score - left.score)[0]?.element ?? null;
		} catch {
			return null;
		}
	}
	function getInputText() {
		const element = findInputElement();
		if (!element) return "";
		try {
			return readElementText(element);
		} catch {
			return "";
		}
	}
	function insertText(text) {
		try {
			const element = findInputElement();
			if (!element) return false;
			const inserted = insertElementText(element, text);
			if (inserted) dispatchInputEvents(element, "insertText", text);
			return inserted;
		} catch {
			return false;
		}
	}
	function observeInputReady(callback) {
		const root = getDefaultRoot();
		if (!root) return () => void 0;
		const notifiedElements = /* @__PURE__ */ new WeakSet();
		const notifyIfReady = () => {
			const element = findInputElement();
			if (!element || notifiedElements.has(element)) return;
			notifiedElements.add(element);
			callback(element);
		};
		try {
			notifyIfReady();
			if (typeof MutationObserver === "undefined") return () => void 0;
			const observer = new MutationObserver(() => notifyIfReady());
			observer.observe(root.documentElement, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: [
					"contenteditable",
					"role",
					"disabled",
					"readonly",
					"aria-disabled",
					"hidden",
					"style",
					"class"
				]
			});
			return () => observer.disconnect();
		} catch {
			return () => void 0;
		}
	}
	function collectInputCandidates(root) {
		const candidates = [];
		if (isElement(root) && root.matches(doubaoSelectors.inputCandidates)) candidates.push(root);
		root.querySelectorAll(doubaoSelectors.inputCandidates).forEach((element) => candidates.push(element));
		return [...new Set(candidates)];
	}
	function isUsableInputCandidate(element) {
		if (!isEditableCandidate(element) || !isVisible(element)) return false;
		if (isValueInputElement(element)) return !element.disabled && !element.readOnly && element.type !== "hidden";
		return element.getAttribute("aria-disabled") !== "true" && !element.hasAttribute("disabled");
	}
	function isEditableCandidate(element) {
		return isTextareaElement(element) || isRoleTextbox(element) || isContentEditableElement(element);
	}
	function scoreInputCandidate(element) {
		const rect = element.getBoundingClientRect();
		let score = 0;
		if (isActiveElement(element)) score += 1e3;
		if (isTextareaElement(element)) score += 300;
		if (isContentEditableElement(element)) score += 250;
		if (isRoleTextbox(element)) score += 200;
		score += Math.min(rect.width, 800) / 10;
		score += Math.min(rect.height, 240) / 8;
		if (typeof window !== "undefined" && rect.top > window.innerHeight * .35) score += 120;
		if (readElementText(element).trim().length > 0) score += 30;
		return score;
	}
	function readElementText(element) {
		if (isValueInputElement(element)) return element.value;
		return element.innerText ?? element.textContent ?? "";
	}
	function insertElementText(element, text) {
		element.focus();
		if (isValueInputElement(element)) {
			const value = element.value;
			const start = element.selectionStart ?? value.length;
			const end = element.selectionEnd ?? value.length;
			setNativeValue(element, `${value.slice(0, start)}${text}${value.slice(end)}`);
			element.setSelectionRange(start + text.length, start + text.length);
			return true;
		}
		if (insertTextAtContentSelection(element, text)) return true;
		element.append(document.createTextNode(text));
		moveContentCursorToEnd(element);
		return true;
	}
	function insertTextAtContentSelection(element, text) {
		const selection = document.getSelection();
		if (!selection || selection.rangeCount === 0 || !isSelectionInside(element)) return false;
		const range = selection.getRangeAt(0);
		const textNode = document.createTextNode(text);
		range.deleteContents();
		range.insertNode(textNode);
		range.setStartAfter(textNode);
		range.setEndAfter(textNode);
		selection.removeAllRanges();
		selection.addRange(range);
		return true;
	}
	function moveContentCursorToEnd(element) {
		const selection = document.getSelection();
		const range = document.createRange();
		range.selectNodeContents(element);
		range.collapse(false);
		selection?.removeAllRanges();
		selection?.addRange(range);
	}
	function dispatchInputEvents(element, inputType, data) {
		const inputEvent = createInputEvent(inputType, data);
		element.dispatchEvent(inputEvent);
		element.dispatchEvent(new Event("change", { bubbles: true }));
	}
	function createInputEvent(inputType, data) {
		try {
			return new InputEvent("input", {
				bubbles: true,
				cancelable: true,
				data,
				inputType
			});
		} catch {
			return new Event("input", {
				bubbles: true,
				cancelable: true
			});
		}
	}
	function setNativeValue(element, value) {
		const prototype = isTextareaElement(element) ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
		const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
		if (valueSetter) {
			valueSetter.call(element, value);
			return;
		}
		element.value = value;
	}
	function isSelectionInside(element) {
		const selection = document.getSelection();
		if (!selection?.anchorNode || !selection.focusNode) return false;
		return element.contains(selection.anchorNode) && element.contains(selection.focusNode);
	}
	function isVisible(element) {
		if (element.hidden) return false;
		const view = element.ownerDocument.defaultView;
		if (!view) return false;
		const style = view.getComputedStyle(element);
		if (style.display === "none" || style.visibility === "hidden") return false;
		const rect = element.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	}
	function isActiveElement(element) {
		const activeElement = document.activeElement;
		return activeElement === element || element.contains(activeElement);
	}
	function isRoleTextbox(element) {
		return element.getAttribute("role") === "textbox";
	}
	function isContentEditableElement(element) {
		return element.isContentEditable;
	}
	function isTextareaElement(element) {
		return element instanceof HTMLTextAreaElement;
	}
	function isValueInputElement(element) {
		return element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement;
	}
	function isElement(value) {
		return value instanceof Element;
	}
	function getDefaultRoot() {
		return typeof document === "undefined" ? null : document;
	}
	//#endregion
	//#region src/core/selection.ts
	function getCurrentSelection() {
		return window.getSelection()?.toString() ?? "";
	}
	//#endregion
	//#region src/templates/default-templates.ts
	var DEFAULT_TEMPLATES = [
		{
			id: "webpage-summary",
			name: "网页总结",
			category: "阅读",
			description: "总结当前网页或选中文本的核心内容",
			shortcut: "/summary",
			content: "请基于以下信息总结网页内容。\n\n页面标题：{{pageTitle}}\n页面链接：{{pageUrl}}\n日期：{{date}}\n\n选中内容：\n{{selection}}\n\n补充要求：\n{{input}}\n\n请输出：\n1. 一句话结论\n2. 核心要点\n3. 值得继续关注的问题"
		},
		{
			id: "extract-opinions",
			name: "提炼观点",
			category: "阅读",
			description: "从文本中提炼明确观点、依据和潜在反驳",
			shortcut: "/points",
			content: "请从以下内容中提炼观点。\n\n文本：\n{{selection}}\n\n我的关注点：{{input}}\n\n请按以下结构输出：\n- 主要观点\n- 支撑依据\n- 隐含假设\n- 可能的反对意见\n- 可复用表达"
		},
		{
			id: "xiaohongshu-rewrite",
			name: "小红书改写",
			category: "写作",
			description: "把素材改写成自然、有分享感的小红书风格文案",
			shortcut: "/xhs",
			content: "请把以下素材改写成小红书风格文案。\n\n素材：\n{{selection}}\n\n目标受众或语气要求：{{input}}\n\n请输出：\n1. 标题 5 个\n2. 正文一版，语气自然，不夸张\n3. 适合的标签 8 个\n\n日期参考：{{date}}"
		},
		{
			id: "weekly-report",
			name: "周报生成",
			category: "办公",
			description: "根据零散工作记录生成结构清晰的周报",
			shortcut: "/weekly",
			content: "请根据以下工作记录生成周报。\n\n记录：\n{{selection}}\n\n补充说明：{{input}}\n\n日期：{{date}}\n\n请按以下结构输出：\n- 本周完成\n- 关键进展\n- 风险与阻塞\n- 下周计划\n- 需要协同的事项"
		},
		{
			id: "email-polish",
			name: "邮件润色",
			category: "办公",
			description: "润色邮件内容，使表达清晰、礼貌、专业",
			shortcut: "/email",
			content: "请润色以下邮件内容。\n\n原文：\n{{selection}}\n\n收件人背景或沟通目标：{{input}}\n\n请输出：\n1. 润色后的邮件正文\n2. 更简洁的主题建议\n3. 如有语气风险，请指出并给出替代表达"
		},
		{
			id: "competitor-analysis",
			name: "竞品分析",
			category: "产品",
			description: "从页面或资料中整理竞品信息和产品启发",
			shortcut: "/competitor",
			content: "请基于以下资料做竞品分析。\n\n资料来源：{{pageTitle}}\n链接：{{pageUrl}}\n\n资料内容：\n{{selection}}\n\n分析目标：{{input}}\n\n请输出：\n- 竞品定位\n- 核心功能\n- 用户价值\n- 优势与短板\n- 对我们的启发\n- 后续验证问题"
		},
		{
			id: "requirement-breakdown",
			name: "需求拆解",
			category: "产品",
			description: "把需求描述拆解为目标、范围、流程和验收标准",
			shortcut: "/req",
			content: "请拆解以下需求。\n\n需求描述：\n{{selection}}\n\n补充背景：{{input}}\n\n请输出：\n1. 目标与非目标\n2. 用户场景\n3. 功能范围\n4. 关键流程\n5. 边界情况\n6. 验收标准\n7. 待确认问题"
		},
		{
			id: "feedback-root-cause",
			name: "用户反馈归因",
			category: "产品",
			description: "整理用户反馈，归因问题类型并提出处理建议",
			shortcut: "/feedback",
			content: "请分析以下用户反馈并做归因。\n\n反馈内容：\n{{selection}}\n\n产品或用户背景：{{input}}\n\n请输出：\n- 反馈摘要\n- 问题分类\n- 可能根因\n- 影响范围判断\n- 优先级建议\n- 可执行改进项\n- 需要继续追问的问题"
		},
		{
			id: "translate-and-explain",
			name: "翻译并解释",
			category: "学习",
			description: "翻译文本并解释关键概念、语气和上下文",
			shortcut: "/translate",
			content: "请翻译并解释以下内容。\n\n原文：\n{{selection}}\n\n目标语言或解释要求：{{input}}\n\n请输出：\n1. 自然流畅的翻译\n2. 关键词解释\n3. 原文语气和上下文说明\n4. 如果有歧义，请列出不同理解"
		},
		{
			id: "action-items",
			name: "生成行动项",
			category: "办公",
			description: "从会议记录或讨论文本中提取明确行动项",
			shortcut: "/todo",
			content: "请从以下内容中生成行动项。\n\n内容：\n{{selection}}\n\n补充说明：{{input}}\n\n日期：{{date}}\n\n请输出表格，包含：\n- 行动项\n- 负责人\n- 截止时间\n- 优先级\n- 依赖事项\n- 备注\n\n如果信息缺失，请用“待确认”标记。"
		}
	];
	//#endregion
	//#region src/core/storage.ts
	var STORAGE_KEYS = {
		templates: "doubao-prompt-helper:templates",
		settings: "doubao-prompt-helper:settings"
	};
	var DEFAULT_SETTINGS = { remoteTemplateUrl: "" };
	async function getTemplates() {
		return getValue(STORAGE_KEYS.templates, DEFAULT_TEMPLATES);
	}
	async function saveTemplates(templates) {
		await setValue(STORAGE_KEYS.templates, templates);
	}
	async function getSettings() {
		return getValue(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
	}
	async function saveSettings(settings) {
		await setValue(STORAGE_KEYS.settings, settings);
	}
	async function getValue(key, defaultValue) {
		const gmGetValue = getGMGetValue();
		if (gmGetValue) return gmGetValue(key, defaultValue);
		return getLocalStorageValue(key, defaultValue);
	}
	async function setValue(key, value) {
		const gmSetValue = getGMSetValue();
		if (gmSetValue) {
			await gmSetValue(key, value);
			return;
		}
		setLocalStorageValue(key, value);
	}
	function getLocalStorageValue(key, defaultValue) {
		const storedValue = getLocalStorage()?.getItem(key);
		if (storedValue === null || storedValue === void 0) return defaultValue;
		try {
			return JSON.parse(storedValue);
		} catch {
			return defaultValue;
		}
	}
	function setLocalStorageValue(key, value) {
		getLocalStorage()?.setItem(key, JSON.stringify(value));
	}
	function getGMGetValue() {
		const gm = globalThis;
		return typeof gm.GM_getValue === "function" ? gm.GM_getValue.bind(globalThis) : void 0;
	}
	function getGMSetValue() {
		const gm = globalThis;
		return typeof gm.GM_setValue === "function" ? gm.GM_setValue.bind(globalThis) : void 0;
	}
	function getLocalStorage() {
		return typeof globalThis.localStorage === "undefined" ? void 0 : globalThis.localStorage;
	}
	//#endregion
	//#region src/core/template-manager.ts
	function parseTemplatesJson(content) {
		let data;
		try {
			data = JSON.parse(content);
		} catch {
			throw new Error("JSON 解析失败，请检查文件格式。");
		}
		return parseTemplatesData(data);
	}
	function parseTemplatesData(data) {
		const rawTemplates = Array.isArray(data) ? data : isTemplateContainer(data) ? data.templates : null;
		if (!rawTemplates) throw new Error("JSON 必须是模板数组，或包含 templates 数组。");
		return rawTemplates.map(normalizeTemplate);
	}
	function normalizeTemplate(value, index) {
		if (!isRecord(value)) throw new Error(`第 ${index + 1} 个模板必须是对象。`);
		const id = readRequiredString(value, "id", index);
		const name = readRequiredString(value, "name", index);
		const content = readRequiredString(value, "content", index);
		return {
			id,
			name,
			category: readOptionalString(value, "category") || "未分类",
			description: readOptionalString(value, "description"),
			shortcut: readOptionalString(value, "shortcut"),
			content,
			createdAt: readOptionalString(value, "createdAt"),
			updatedAt: readOptionalString(value, "updatedAt")
		};
	}
	function readRequiredString(value, key, index) {
		const fieldValue = value[key];
		if (typeof fieldValue !== "string" || fieldValue.trim() === "") throw new Error(`第 ${index + 1} 个模板缺少必填字段 ${key}。`);
		return fieldValue;
	}
	function readOptionalString(value, key) {
		const fieldValue = value[key];
		return typeof fieldValue === "string" ? fieldValue : void 0;
	}
	function isTemplateContainer(value) {
		return isRecord(value) && Array.isArray(value.templates);
	}
	function isRecord(value) {
		return typeof value === "object" && value !== null;
	}
	//#endregion
	//#region src/core/template-engine.ts
	function renderTemplate(content, context = {}) {
		return content.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (_match, key) => context[key] ?? "");
	}
	//#endregion
	//#region src/ui/styles.ts
	var styles = `
:host {
  all: initial;
  color-scheme: light;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    "PingFang SC",
    "Microsoft YaHei",
    sans-serif;
}

* {
  box-sizing: border-box;
}

.dbph-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: rgba(15, 23, 42, 0.22);
}

.dbph-panel {
  position: fixed;
  top: 72px;
  right: 24px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  width: min(420px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 112px));
  overflow: hidden;
  color: #172033;
  background: #ffffff;
  border: 1px solid #d8dee8;
  border-radius: 8px;
  box-shadow:
    0 24px 64px rgba(15, 23, 42, 0.22),
    0 4px 16px rgba(15, 23, 42, 0.12);
}

.dbph-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid #e6eaf0;
}

.dbph-panel-title {
  margin: 0;
  color: #121826;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: 0;
}

.dbph-close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #566274;
  background: transparent;
  border: 0;
  border-radius: 6px;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.dbph-close-button:hover {
  color: #121826;
  background: #eef2f7;
}

.dbph-close-button:focus-visible,
.dbph-search-input:focus-visible,
.dbph-template:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.dbph-search {
  padding: 12px 16px;
  border-bottom: 1px solid #e6eaf0;
}

.dbph-search-input {
  display: block;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  color: #172033;
  background: #f8fafc;
  border: 1px solid #cfd7e3;
  border-radius: 6px;
  font: inherit;
  font-size: 14px;
  letter-spacing: 0;
}

.dbph-search-input::placeholder {
  color: #8a95a5;
}

.dbph-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #e6eaf0;
}

.dbph-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 30px;
  padding: 0 10px;
  color: #344054;
  background: #ffffff;
  border: 1px solid #cfd7e3;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
}

.dbph-action-button:hover {
  color: #121826;
  background: #f3f6fa;
  border-color: #b8c4d4;
}

.dbph-action-button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.dbph-import-label {
  position: relative;
}

.dbph-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.dbph-remote {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #e6eaf0;
}

.dbph-remote-label {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: #475467;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.dbph-remote-input {
  display: block;
  width: 100%;
  height: 32px;
  min-width: 0;
  padding: 0 10px;
  color: #172033;
  background: #f8fafc;
  border: 1px solid #cfd7e3;
  border-radius: 6px;
  font: inherit;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
}

.dbph-remote-input::placeholder {
  color: #98a2b3;
}

.dbph-remote-input:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.dbph-sync-button {
  height: 32px;
}

.dbph-status {
  min-height: 0;
  margin: 0;
  padding: 0 16px;
  color: #147a4a;
  font-size: 12px;
  line-height: 0;
}

.dbph-status:not(:empty) {
  padding-top: 8px;
  line-height: 1.4;
}

.dbph-status-error {
  color: #b42318;
}

.dbph-template-list {
  flex: 1 1 auto;
  min-height: 160px;
  overflow: auto;
  padding: 8px 8px 12px;
}

.dbph-category {
  margin: 0;
  padding: 8px 0 4px;
}

.dbph-category-title {
  margin: 0 0 6px;
  padding: 0 8px;
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: 0;
}

.dbph-category-list {
  display: grid;
  gap: 4px;
}

.dbph-template {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 10px 12px;
  color: #172033;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
}

.dbph-template:hover {
  background: #f3f6fa;
  border-color: #dce3ee;
}

.dbph-template-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.dbph-template-name {
  overflow: hidden;
  color: #121826;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dbph-template-description {
  display: -webkit-box;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dbph-template-shortcut {
  flex: 0 0 auto;
  max-width: 96px;
  overflow: hidden;
  padding: 3px 7px;
  color: #175cd3;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dbph-empty {
  margin: 48px 12px;
  color: #667085;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
}

@media (max-width: 520px) {
  .dbph-panel {
    top: 12px;
    right: 12px;
    left: 12px;
    width: auto;
    max-height: calc(100vh - 24px);
  }

  .dbph-actions,
  .dbph-remote {
    grid-template-columns: 1fr;
  }

  .dbph-actions {
    display: grid;
  }
}
`;
	//#endregion
	//#region src/ui/panel.ts
	var activePanel = null;
	function openPromptPanel(options) {
		activePanel?.close();
		const host = document.createElement("div");
		host.className = "dbph-host";
		const shadowRoot = host.attachShadow({ mode: "open" });
		const state = {
			templates: [...options.templates],
			settings: { ...options.settings },
			query: options.initialQuery ?? ""
		};
		const style = document.createElement("style");
		style.textContent = styles;
		const backdrop = document.createElement("div");
		backdrop.className = "dbph-backdrop";
		const panel = document.createElement("section");
		panel.className = "dbph-panel";
		panel.setAttribute("role", "dialog");
		panel.setAttribute("aria-modal", "true");
		panel.setAttribute("aria-label", options.title ?? "Prompt 模板");
		const header = document.createElement("header");
		header.className = "dbph-panel-header";
		const title = document.createElement("h2");
		title.className = "dbph-panel-title";
		title.textContent = options.title ?? "Prompt 模板";
		const closeButton = document.createElement("button");
		closeButton.className = "dbph-close-button";
		closeButton.type = "button";
		closeButton.setAttribute("aria-label", "关闭");
		closeButton.textContent = "×";
		const searchWrap = document.createElement("div");
		searchWrap.className = "dbph-search";
		const searchInput = document.createElement("input");
		searchInput.className = "dbph-search-input";
		searchInput.type = "search";
		searchInput.placeholder = "搜索模板、分类或快捷命令";
		searchInput.autocomplete = "off";
		searchInput.value = state.query;
		const actions = document.createElement("div");
		actions.className = "dbph-actions";
		const exportButton = document.createElement("button");
		exportButton.className = "dbph-action-button";
		exportButton.type = "button";
		exportButton.textContent = "导出 JSON";
		const importLabel = document.createElement("label");
		importLabel.className = "dbph-action-button dbph-import-label";
		importLabel.textContent = "导入 JSON";
		const importInput = document.createElement("input");
		importInput.className = "dbph-file-input";
		importInput.type = "file";
		importInput.accept = "application/json,.json";
		const resetButton = document.createElement("button");
		resetButton.className = "dbph-action-button";
		resetButton.type = "button";
		resetButton.textContent = "恢复默认";
		const remote = document.createElement("div");
		remote.className = "dbph-remote";
		const remoteLabel = document.createElement("label");
		remoteLabel.className = "dbph-remote-label";
		remoteLabel.textContent = "远程模板 URL";
		const remoteInput = document.createElement("input");
		remoteInput.className = "dbph-remote-input";
		remoteInput.type = "url";
		remoteInput.inputMode = "url";
		remoteInput.placeholder = "https://raw.githubusercontent.com/...";
		remoteInput.autocomplete = "off";
		remoteInput.value = readRemoteTemplateUrl(state.settings);
		const syncRemoteButton = document.createElement("button");
		syncRemoteButton.className = "dbph-action-button dbph-sync-button";
		syncRemoteButton.type = "button";
		syncRemoteButton.textContent = "同步远程模板";
		const status = document.createElement("p");
		status.className = "dbph-status";
		status.setAttribute("role", "status");
		const list = document.createElement("div");
		list.className = "dbph-template-list";
		list.setAttribute("role", "list");
		const close = () => {
			document.removeEventListener("keydown", handleKeydown, true);
			host.remove();
			if (activePanel === handle) activePanel = null;
		};
		const handle = {
			element: host,
			close,
			updateTemplates: (templates) => {
				state.templates = [...templates];
				renderTemplateList(list, state.templates, state.query, options.onSelect, close);
			}
		};
		const handleKeydown = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				close();
			}
		};
		closeButton.addEventListener("click", close);
		backdrop.addEventListener("click", close);
		exportButton.addEventListener("click", () => {
			exportTemplates(state.templates);
			setStatus(status, `已导出 ${state.templates.length} 个模板`);
		});
		importInput.addEventListener("change", () => {
			const file = importInput.files?.[0];
			importInput.value = "";
			if (!file) return;
			importTemplatesFromFile(file, options, state, list, searchInput, status, close);
		});
		resetButton.addEventListener("click", () => {
			resetTemplates(options, state, list, searchInput, status, close);
		});
		remoteInput.addEventListener("change", () => {
			saveRemoteTemplateUrl(options, state, remoteInput.value, status);
		});
		syncRemoteButton.addEventListener("click", () => {
			syncRemoteTemplates$1(options, state, remoteInput.value, list, searchInput, status, close);
		});
		searchInput.addEventListener("input", () => {
			state.query = searchInput.value;
			renderTemplateList(list, state.templates, state.query, options.onSelect, close);
		});
		document.addEventListener("keydown", handleKeydown, true);
		header.append(title, closeButton);
		searchWrap.append(searchInput);
		importLabel.append(importInput);
		actions.append(exportButton, importLabel);
		if (options.defaultTemplates?.length) actions.append(resetButton);
		remoteLabel.append(remoteInput);
		remote.append(remoteLabel, syncRemoteButton);
		panel.append(header, searchWrap, actions, remote, status, list);
		shadowRoot.append(style, backdrop, panel);
		document.body.append(host);
		renderTemplateList(list, state.templates, state.query, options.onSelect, close);
		activePanel = handle;
		searchInput.focus();
		return handle;
	}
	async function importTemplatesFromFile(file, options, state, list, searchInput, status, close) {
		try {
			const templates = parseTemplatesJson(await file.text());
			await saveChangedTemplates(options, templates);
			state.templates = templates;
			state.query = "";
			searchInput.value = "";
			renderTemplateList(list, state.templates, state.query, options.onSelect, close);
			setStatus(status, `已导入并保存 ${templates.length} 个模板`);
		} catch (error) {
			setStatus(status, getErrorMessage(error), true);
		}
	}
	async function resetTemplates(options, state, list, searchInput, status, close) {
		const defaultTemplates = options.defaultTemplates;
		if (!defaultTemplates?.length) return;
		if (!window.confirm("恢复默认模板会覆盖当前模板，是否继续？")) return;
		try {
			const templates = defaultTemplates.map((template) => ({ ...template }));
			await saveChangedTemplates(options, templates);
			state.templates = templates;
			state.query = "";
			searchInput.value = "";
			renderTemplateList(list, state.templates, state.query, options.onSelect, close);
			setStatus(status, `已恢复默认模板，共 ${templates.length} 个`);
		} catch (error) {
			setStatus(status, getErrorMessage(error), true);
		}
	}
	async function saveRemoteTemplateUrl(options, state, remoteTemplateUrl, status) {
		try {
			await saveChangedSettings(options, {
				...state.settings,
				remoteTemplateUrl: remoteTemplateUrl.trim()
			});
			state.settings.remoteTemplateUrl = remoteTemplateUrl.trim();
			setStatus(status, "已保存远程模板地址");
		} catch (error) {
			setStatus(status, getErrorMessage(error), true);
		}
	}
	async function syncRemoteTemplates$1(options, state, remoteTemplateUrl, list, searchInput, status, close) {
		const trimmedUrl = remoteTemplateUrl.trim();
		if (!trimmedUrl) {
			setStatus(status, "请先填写远程模板 URL。", true);
			return;
		}
		if (!options.onSyncRemoteTemplates) {
			setStatus(status, "当前环境不支持远程模板同步。", true);
			return;
		}
		try {
			setStatus(status, "正在同步远程模板...");
			await saveChangedSettings(options, {
				...state.settings,
				remoteTemplateUrl: trimmedUrl
			});
			const templates = await options.onSyncRemoteTemplates(trimmedUrl);
			state.settings.remoteTemplateUrl = trimmedUrl;
			state.templates = templates;
			state.query = "";
			searchInput.value = "";
			renderTemplateList(list, state.templates, state.query, options.onSelect, close);
			setStatus(status, `已同步并保存 ${templates.length} 个模板`);
		} catch (error) {
			setStatus(status, getErrorMessage(error), true);
		}
	}
	async function saveChangedTemplates(options, templates) {
		await options.onTemplatesChange?.(templates);
	}
	async function saveChangedSettings(options, settings) {
		await options.onSettingsChange?.(settings);
	}
	function exportTemplates(templates) {
		const blob = new Blob([`${JSON.stringify({
			templates,
			exportedAt: (/* @__PURE__ */ new Date()).toISOString()
		}, null, 2)}\n`], { type: "application/json;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "doubao-prompt-helper-templates.json";
		anchor.rel = "noopener";
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
	}
	function setStatus(status, message, isError = false) {
		status.textContent = message;
		status.classList.toggle("dbph-status-error", isError);
	}
	function getErrorMessage(error) {
		return error instanceof Error ? error.message : "操作失败，请重试。";
	}
	function renderTemplateList(list, templates, query, onSelect, close) {
		list.replaceChildren();
		const filteredTemplates = filterTemplates(templates, query);
		if (filteredTemplates.length === 0) {
			const empty = document.createElement("p");
			empty.className = "dbph-empty";
			empty.textContent = "没有找到匹配的模板";
			list.append(empty);
			return;
		}
		for (const [category, categoryTemplates] of groupTemplates(filteredTemplates)) {
			const group = document.createElement("section");
			group.className = "dbph-category";
			const heading = document.createElement("h3");
			heading.className = "dbph-category-title";
			heading.textContent = category;
			const items = document.createElement("div");
			items.className = "dbph-category-list";
			for (const template of categoryTemplates) items.append(createTemplateButton(template, onSelect, close));
			group.append(heading, items);
			list.append(group);
		}
	}
	function createTemplateButton(template, onSelect, close) {
		const button = document.createElement("button");
		button.className = "dbph-template";
		button.type = "button";
		button.setAttribute("role", "listitem");
		const main = document.createElement("span");
		main.className = "dbph-template-main";
		const name = document.createElement("span");
		name.className = "dbph-template-name";
		name.textContent = template.name;
		const description = document.createElement("span");
		description.className = "dbph-template-description";
		description.textContent = template.description ?? template.content;
		main.append(name, description);
		if (template.shortcut) {
			const shortcut = document.createElement("span");
			shortcut.className = "dbph-template-shortcut";
			shortcut.textContent = template.shortcut;
			button.append(main, shortcut);
		} else button.append(main);
		button.addEventListener("click", () => {
			onSelect(template);
			close();
		});
		return button;
	}
	function filterTemplates(templates, query) {
		const normalizedQuery = normalizeText(query);
		if (!normalizedQuery) return templates;
		return templates.filter((template) => [
			template.name,
			template.category,
			template.description,
			template.shortcut,
			template.content
		].filter(Boolean).some((value) => normalizeText(value).includes(normalizedQuery)));
	}
	function groupTemplates(templates) {
		const groups = /* @__PURE__ */ new Map();
		for (const template of templates) {
			const category = template.category || "未分类";
			const group = groups.get(category) ?? [];
			group.push(template);
			groups.set(category, group);
		}
		return [...groups.entries()];
	}
	function normalizeText(value) {
		return String(value ?? "").trim().toLowerCase();
	}
	function readRemoteTemplateUrl(settings) {
		return typeof settings.remoteTemplateUrl === "string" ? settings.remoteTemplateUrl : "";
	}
	//#endregion
	//#region src/index.ts
	var TOOLBAR_HOST_ID = "dbph-prompt-button-host";
	var toolbarState = null;
	var preservedSelection = "";
	var positionListenersInstalled = false;
	function bootstrap() {
		if (!isDoubaoPage()) return;
		onDocumentReady(() => {
			observeInputReady((inputElement) => {
				injectPromptButton(inputElement);
			});
		});
	}
	function injectPromptButton(inputElement) {
		if (toolbarState?.host.isConnected) {
			toolbarState.target = inputElement;
			toolbarState.updatePosition();
			return;
		}
		document.getElementById(TOOLBAR_HOST_ID)?.remove();
		const host = document.createElement("div");
		host.id = TOOLBAR_HOST_ID;
		host.className = "dbph-prompt-button-host";
		host.style.position = "fixed";
		host.style.zIndex = "2147483646";
		const shadowRoot = host.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = `
    :host {
      all: initial;
    }

    .dbph-prompt-button {
      height: 34px;
      padding: 0 12px;
      color: #ffffff;
      background: #2563eb;
      border: 1px solid #1d4ed8;
      border-radius: 6px;
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
      cursor: pointer;
      font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
    }

    .dbph-prompt-button:hover {
      background: #1d4ed8;
    }

    .dbph-prompt-button:focus-visible {
      outline: 2px solid #93c5fd;
      outline-offset: 2px;
    }
  `;
		const button = document.createElement("button");
		button.className = "dbph-prompt-button";
		button.type = "button";
		button.textContent = "Prompt";
		button.setAttribute("aria-label", "打开 Prompt 模板");
		button.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			preservedSelection = getCurrentSelection();
			openTemplatesPanel();
		});
		shadowRoot.append(style, button);
		document.body.append(host);
		const updatePosition = () => {
			positionButtonNearInput(host, toolbarState?.target ?? inputElement);
		};
		toolbarState = {
			host,
			button,
			target: inputElement,
			updatePosition
		};
		updatePosition();
		installPositionListeners();
	}
	async function openTemplatesPanel() {
		const [templates, settings] = await Promise.all([loadTemplates(), loadSettings()]);
		openPromptPanel({
			templates,
			settings,
			defaultTemplates: DEFAULT_TEMPLATES,
			onSelect: (template) => {
				handleTemplateSelect(template);
			},
			onTemplatesChange: async (changedTemplates) => {
				await saveTemplates(changedTemplates);
			},
			onSettingsChange: async (changedSettings) => {
				await saveSettings(normalizeSettings(changedSettings));
			},
			onSyncRemoteTemplates: async (remoteTemplateUrl) => {
				return syncRemoteTemplates(remoteTemplateUrl);
			}
		});
	}
	async function handleTemplateSelect(template) {
		const renderedContent = renderTemplate(template.content, createTemplateContext());
		if (insertText(renderedContent)) return;
		if (await copyToClipboard(renderedContent)) {
			window.alert("插入失败，内容已复制到剪贴板，请手动粘贴。");
			return;
		}
		window.alert("插入失败，且无法自动复制到剪贴板。");
	}
	function createTemplateContext() {
		return {
			selection: getCurrentSelection() || preservedSelection,
			input: getInputText(),
			pageTitle: document.title,
			pageUrl: window.location.href,
			date: formatLocalDate(/* @__PURE__ */ new Date())
		};
	}
	async function loadTemplates() {
		try {
			const templates = await getTemplates();
			return Array.isArray(templates) ? templates : DEFAULT_TEMPLATES;
		} catch {
			return DEFAULT_TEMPLATES;
		}
	}
	async function loadSettings() {
		try {
			return await getSettings();
		} catch {
			return { remoteTemplateUrl: "" };
		}
	}
	async function syncRemoteTemplates(remoteTemplateUrl) {
		const normalizedUrl = validateRemoteTemplateUrl(remoteTemplateUrl);
		const templates = parseTemplatesJson(await fetchRemoteTemplateJson(normalizedUrl));
		await saveTemplates(templates);
		await saveSettings({
			...await loadSettings(),
			remoteTemplateUrl: normalizedUrl
		});
		return templates;
	}
	function validateRemoteTemplateUrl(remoteTemplateUrl) {
		let url;
		try {
			url = new URL(remoteTemplateUrl.trim());
		} catch {
			throw new Error("远程模板 URL 格式不正确。");
		}
		if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("远程模板 URL 只支持 http 或 https。");
		return url.toString();
	}
	function normalizeSettings(settings) {
		const remoteTemplateUrl = typeof settings.remoteTemplateUrl === "string" ? settings.remoteTemplateUrl.trim() : "";
		return {
			...settings,
			remoteTemplateUrl: remoteTemplateUrl ? validateRemoteTemplateUrl(remoteTemplateUrl) : ""
		};
	}
	async function fetchRemoteTemplateJson(remoteTemplateUrl) {
		const gmXmlHttpRequest = getGMXmlHttpRequest();
		if (gmXmlHttpRequest) return fetchRemoteTemplateJsonWithGM(gmXmlHttpRequest, remoteTemplateUrl);
		return fetchRemoteTemplateJsonWithFetch(remoteTemplateUrl);
	}
	function fetchRemoteTemplateJsonWithGM(gmXmlHttpRequest, remoteTemplateUrl) {
		return new Promise((resolve, reject) => {
			gmXmlHttpRequest({
				method: "GET",
				url: remoteTemplateUrl,
				responseType: "text",
				headers: { Accept: "application/json, text/plain, */*" },
				timeout: 15e3,
				onload: (response) => {
					if (response.status < 200 || response.status >= 300) {
						reject(/* @__PURE__ */ new Error(`远程模板拉取失败：HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`));
						return;
					}
					resolve(response.responseText ?? "");
				},
				onerror: () => {
					reject(/* @__PURE__ */ new Error("远程模板拉取失败，请检查网络或 URL。"));
				},
				ontimeout: () => {
					reject(/* @__PURE__ */ new Error("远程模板拉取超时，请稍后重试。"));
				}
			});
		});
	}
	async function fetchRemoteTemplateJsonWithFetch(remoteTemplateUrl) {
		let response;
		try {
			response = await fetch(remoteTemplateUrl, {
				method: "GET",
				headers: { Accept: "application/json, text/plain, */*" },
				credentials: "omit",
				cache: "no-store"
			});
		} catch {
			throw new Error("远程模板拉取失败，请检查网络或 URL。");
		}
		if (!response.ok) throw new Error(`远程模板拉取失败：HTTP ${response.status}`);
		return response.text();
	}
	async function copyToClipboard(text) {
		const gmSetClipboard = getGMSetClipboard();
		if (gmSetClipboard) try {
			await gmSetClipboard(text, "text");
			return true;
		} catch {
			return false;
		}
		try {
			await navigator.clipboard?.writeText(text);
			return true;
		} catch {
			return false;
		}
	}
	function getGMSetClipboard() {
		const gm = globalThis;
		return typeof gm.GM_setClipboard === "function" ? gm.GM_setClipboard.bind(globalThis) : void 0;
	}
	function getGMXmlHttpRequest() {
		const gm = globalThis;
		return typeof gm.GM_xmlhttpRequest === "function" ? gm.GM_xmlhttpRequest.bind(globalThis) : void 0;
	}
	function positionButtonNearInput(host, inputElement) {
		const rect = inputElement.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) {
			host.hidden = true;
			return;
		}
		host.hidden = false;
		const buttonWidth = 88;
		const buttonHeight = 34;
		const spacing = 8;
		const left = clamp(rect.right - buttonWidth, spacing, window.innerWidth - buttonWidth - spacing);
		const preferredTop = rect.top - buttonHeight - spacing;
		const fallbackTop = rect.bottom + spacing;
		const top = preferredTop >= spacing ? preferredTop : clamp(fallbackTop, spacing, window.innerHeight - buttonHeight - spacing);
		host.style.left = `${left}px`;
		host.style.top = `${top}px`;
	}
	function installPositionListeners() {
		if (positionListenersInstalled) return;
		positionListenersInstalled = true;
		let scheduled = false;
		const scheduleUpdate = () => {
			if (scheduled) return;
			scheduled = true;
			window.requestAnimationFrame(() => {
				scheduled = false;
				toolbarState?.updatePosition();
			});
		};
		window.addEventListener("resize", scheduleUpdate, { passive: true });
		window.addEventListener("scroll", scheduleUpdate, {
			passive: true,
			capture: true
		});
	}
	function onDocumentReady(callback) {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", callback, { once: true });
			return;
		}
		callback();
	}
	function isDoubaoPage() {
		const hostname = window.location.hostname;
		return hostname === "doubao.com" || hostname === "www.doubao.com";
	}
	function formatLocalDate(date) {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	}
	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}
	bootstrap();
	//#endregion
	exports.bootstrap = bootstrap;
	return exports;
})({});
