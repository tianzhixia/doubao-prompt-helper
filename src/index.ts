import { getInputText, insertText, observeInputReady } from "./core/doubao-adapter";
import { getCurrentSelection } from "./core/selection";
import { getSettings, getTemplates, saveSettings, saveTemplates } from "./core/storage";
import { parseTemplatesJson } from "./core/template-manager";
import { renderTemplate } from "./core/template-engine";
import type { PromptHelperSettings, PromptTemplate, TemplateContext } from "./types";
import { openPromptPanel } from "./ui/panel";
import { DEFAULT_TEMPLATES } from "./templates/default-templates";

type GMSetClipboard = (text: string, type?: string) => void | Promise<void>;
type GMXmlHttpRequest = (details: GMXmlHttpRequestDetails) => void;

interface GMXmlHttpRequestDetails {
  method: "GET";
  url: string;
  responseType: "text";
  headers?: Record<string, string>;
  timeout?: number;
  onload: (response: GMXmlHttpRequestResponse) => void;
  onerror: () => void;
  ontimeout: () => void;
}

interface GMXmlHttpRequestResponse {
  status: number;
  statusText?: string;
  responseText?: string;
}

const TOOLBAR_HOST_ID = "dbph-prompt-button-host";

interface ToolbarState {
  host: HTMLElement;
  button: HTMLButtonElement;
  target: HTMLElement;
  updatePosition: () => void;
}

let toolbarState: ToolbarState | null = null;
let preservedSelection = "";
let positionListenersInstalled = false;

export function bootstrap(): void {
  if (!isDoubaoPage()) {
    return;
  }

  onDocumentReady(() => {
    observeInputReady((inputElement) => {
      injectPromptButton(inputElement);
    });
  });
}

function injectPromptButton(inputElement: HTMLElement): void {
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
    void openTemplatesPanel();
  });

  shadowRoot.append(style, button);
  document.body.append(host);

  const updatePosition = (): void => {
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

async function openTemplatesPanel(): Promise<void> {
  const [templates, settings] = await Promise.all([
    loadTemplates(),
    loadSettings()
  ]);

  openPromptPanel({
    templates,
    settings,
    defaultTemplates: DEFAULT_TEMPLATES,
    onSelect: (template) => {
      void handleTemplateSelect(template);
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

async function handleTemplateSelect(template: PromptTemplate): Promise<void> {
  const renderedContent = renderTemplate(template.content, createTemplateContext());

  if (insertText(renderedContent)) {
    return;
  }

  const copied = await copyToClipboard(renderedContent);

  if (copied) {
    window.alert("插入失败，内容已复制到剪贴板，请手动粘贴。");
    return;
  }

  window.alert("插入失败，且无法自动复制到剪贴板。");
}

function createTemplateContext(): Partial<TemplateContext> {
  const selection = getCurrentSelection() || preservedSelection;

  return {
    selection,
    input: getInputText(),
    pageTitle: document.title,
    pageUrl: window.location.href,
    date: formatLocalDate(new Date())
  };
}

async function loadTemplates(): Promise<PromptTemplate[]> {
  try {
    const templates = await getTemplates();

    return Array.isArray(templates) ? templates : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

async function loadSettings(): Promise<PromptHelperSettings> {
  try {
    return await getSettings();
  } catch {
    return { remoteTemplateUrl: "" };
  }
}

async function syncRemoteTemplates(
  remoteTemplateUrl: string
): Promise<PromptTemplate[]> {
  const normalizedUrl = validateRemoteTemplateUrl(remoteTemplateUrl);
  const jsonText = await fetchRemoteTemplateJson(normalizedUrl);
  const templates = parseTemplatesJson(jsonText);

  await saveTemplates(templates);
  await saveSettings({
    ...(await loadSettings()),
    remoteTemplateUrl: normalizedUrl
  });

  return templates;
}

function validateRemoteTemplateUrl(remoteTemplateUrl: string): string {
  let url: URL;

  try {
    url = new URL(remoteTemplateUrl.trim());
  } catch {
    throw new Error("远程模板 URL 格式不正确。");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("远程模板 URL 只支持 http 或 https。");
  }

  return url.toString();
}

function normalizeSettings(settings: PromptHelperSettings): PromptHelperSettings {
  const remoteTemplateUrl =
    typeof settings.remoteTemplateUrl === "string"
      ? settings.remoteTemplateUrl.trim()
      : "";

  return {
    ...settings,
    remoteTemplateUrl: remoteTemplateUrl
      ? validateRemoteTemplateUrl(remoteTemplateUrl)
      : ""
  };
}

async function fetchRemoteTemplateJson(remoteTemplateUrl: string): Promise<string> {
  const gmXmlHttpRequest = getGMXmlHttpRequest();

  if (gmXmlHttpRequest) {
    return fetchRemoteTemplateJsonWithGM(gmXmlHttpRequest, remoteTemplateUrl);
  }

  return fetchRemoteTemplateJsonWithFetch(remoteTemplateUrl);
}

function fetchRemoteTemplateJsonWithGM(
  gmXmlHttpRequest: GMXmlHttpRequest,
  remoteTemplateUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    gmXmlHttpRequest({
      method: "GET",
      url: remoteTemplateUrl,
      responseType: "text",
      headers: {
        Accept: "application/json, text/plain, */*"
      },
      timeout: 15000,
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          reject(
            new Error(
              `远程模板拉取失败：HTTP ${response.status}${
                response.statusText ? ` ${response.statusText}` : ""
              }`
            )
          );
          return;
        }

        resolve(response.responseText ?? "");
      },
      onerror: () => {
        reject(new Error("远程模板拉取失败，请检查网络或 URL。"));
      },
      ontimeout: () => {
        reject(new Error("远程模板拉取超时，请稍后重试。"));
      }
    });
  });
}

async function fetchRemoteTemplateJsonWithFetch(
  remoteTemplateUrl: string
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(remoteTemplateUrl, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*"
      },
      credentials: "omit",
      cache: "no-store"
    });
  } catch {
    throw new Error("远程模板拉取失败，请检查网络或 URL。");
  }

  if (!response.ok) {
    throw new Error(`远程模板拉取失败：HTTP ${response.status}`);
  }

  return response.text();
}

async function copyToClipboard(text: string): Promise<boolean> {
  const gmSetClipboard = getGMSetClipboard();

  if (gmSetClipboard) {
    try {
      await gmSetClipboard(text, "text");
      return true;
    } catch {
      return false;
    }
  }

  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function getGMSetClipboard(): GMSetClipboard | undefined {
  const gm = globalThis as typeof globalThis & {
    GM_setClipboard?: GMSetClipboard;
  };

  return typeof gm.GM_setClipboard === "function"
    ? gm.GM_setClipboard.bind(globalThis)
    : undefined;
}

function getGMXmlHttpRequest(): GMXmlHttpRequest | undefined {
  const gm = globalThis as typeof globalThis & {
    GM_xmlhttpRequest?: GMXmlHttpRequest;
  };

  return typeof gm.GM_xmlhttpRequest === "function"
    ? gm.GM_xmlhttpRequest.bind(globalThis)
    : undefined;
}

function positionButtonNearInput(host: HTMLElement, inputElement: HTMLElement): void {
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
  const top =
    preferredTop >= spacing
      ? preferredTop
      : clamp(fallbackTop, spacing, window.innerHeight - buttonHeight - spacing);

  host.style.left = `${left}px`;
  host.style.top = `${top}px`;
}

function installPositionListeners(): void {
  if (positionListenersInstalled) {
    return;
  }

  positionListenersInstalled = true;
  let scheduled = false;
  const scheduleUpdate = (): void => {
    if (scheduled) {
      return;
    }

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

function onDocumentReady(callback: () => void): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
    return;
  }

  callback();
}

function isDoubaoPage(): boolean {
  const hostname = window.location.hostname;

  return hostname === "doubao.com" || hostname === "www.doubao.com";
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

bootstrap();
