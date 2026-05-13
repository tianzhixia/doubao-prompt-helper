import { parseTemplatesJson } from "../core/template-manager";
import type { PromptHelperSettings, PromptTemplate } from "../types";
import { styles } from "./styles";

export interface PromptPanelOptions {
  templates: PromptTemplate[];
  onSelect: (template: PromptTemplate) => void;
  onTemplatesChange?: (templates: PromptTemplate[]) => void | Promise<void>;
  onSettingsChange?: (settings: PromptHelperSettings) => void | Promise<void>;
  onSyncRemoteTemplates?: (
    remoteTemplateUrl: string
  ) => Promise<PromptTemplate[]>;
  settings?: PromptHelperSettings;
  defaultTemplates?: PromptTemplate[];
  initialQuery?: string;
  title?: string;
}

export interface PromptPanelHandle {
  element: HTMLElement;
  close: () => void;
  updateTemplates: (templates: PromptTemplate[]) => void;
}

interface PromptPanelState {
  templates: PromptTemplate[];
  settings: PromptHelperSettings;
  query: string;
}

let activePanel: PromptPanelHandle | null = null;

export function openPromptPanel(
  options: PromptPanelOptions
): PromptPanelHandle {
  activePanel?.close();

  const host = document.createElement("div");
  host.className = "dbph-host";
  const shadowRoot = host.attachShadow({ mode: "open" });
  const state: PromptPanelState = {
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

  const close = (): void => {
    document.removeEventListener("keydown", handleKeydown, true);
    host.remove();

    if (activePanel === handle) {
      activePanel = null;
    }
  };

  const handle: PromptPanelHandle = {
    element: host,
    close,
    updateTemplates: (templates) => {
      state.templates = [...templates];
      renderTemplateList(
        list,
        state.templates,
        state.query,
        options.onSelect,
        close
      );
    }
  };

  const handleKeydown = (event: KeyboardEvent): void => {
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

    if (!file) {
      return;
    }

    void importTemplatesFromFile(file, options, state, list, searchInput, status, close);
  });
  resetButton.addEventListener("click", () => {
    void resetTemplates(options, state, list, searchInput, status, close);
  });
  remoteInput.addEventListener("change", () => {
    void saveRemoteTemplateUrl(options, state, remoteInput.value, status);
  });
  syncRemoteButton.addEventListener("click", () => {
    void syncRemoteTemplates(
      options,
      state,
      remoteInput.value,
      list,
      searchInput,
      status,
      close
    );
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

  if (options.defaultTemplates?.length) {
    actions.append(resetButton);
  }

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

async function importTemplatesFromFile(
  file: File,
  options: PromptPanelOptions,
  state: PromptPanelState,
  list: HTMLElement,
  searchInput: HTMLInputElement,
  status: HTMLElement,
  close: () => void
): Promise<void> {
  try {
    const content = await file.text();
    const templates = parseTemplatesJson(content);

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

async function resetTemplates(
  options: PromptPanelOptions,
  state: PromptPanelState,
  list: HTMLElement,
  searchInput: HTMLInputElement,
  status: HTMLElement,
  close: () => void
): Promise<void> {
  const defaultTemplates = options.defaultTemplates;

  if (!defaultTemplates?.length) {
    return;
  }

  if (!window.confirm("恢复默认模板会覆盖当前模板，是否继续？")) {
    return;
  }

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

async function saveRemoteTemplateUrl(
  options: PromptPanelOptions,
  state: PromptPanelState,
  remoteTemplateUrl: string,
  status: HTMLElement
): Promise<void> {
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

async function syncRemoteTemplates(
  options: PromptPanelOptions,
  state: PromptPanelState,
  remoteTemplateUrl: string,
  list: HTMLElement,
  searchInput: HTMLInputElement,
  status: HTMLElement,
  close: () => void
): Promise<void> {
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

async function saveChangedTemplates(
  options: PromptPanelOptions,
  templates: PromptTemplate[]
): Promise<void> {
  await options.onTemplatesChange?.(templates);
}

async function saveChangedSettings(
  options: PromptPanelOptions,
  settings: PromptHelperSettings
): Promise<void> {
  await options.onSettingsChange?.(settings);
}

function exportTemplates(templates: PromptTemplate[]): void {
  const blob = new Blob(
    [
      `${JSON.stringify(
        {
          templates,
          exportedAt: new Date().toISOString()
        },
        null,
        2
      )}\n`
    ],
    { type: "application/json;charset=utf-8" }
  );
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

function setStatus(
  status: HTMLElement,
  message: string,
  isError = false
): void {
  status.textContent = message;
  status.classList.toggle("dbph-status-error", isError);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "操作失败，请重试。";
}

export function createPanel(): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "dbph-panel";
  panel.hidden = true;
  return panel;
}

function renderTemplateList(
  list: HTMLElement,
  templates: PromptTemplate[],
  query: string,
  onSelect: (template: PromptTemplate) => void,
  close: () => void
): void {
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

    for (const template of categoryTemplates) {
      items.append(createTemplateButton(template, onSelect, close));
    }

    group.append(heading, items);
    list.append(group);
  }
}

function createTemplateButton(
  template: PromptTemplate,
  onSelect: (template: PromptTemplate) => void,
  close: () => void
): HTMLButtonElement {
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
  } else {
    button.append(main);
  }

  button.addEventListener("click", () => {
    onSelect(template);
    close();
  });

  return button;
}

function filterTemplates(
  templates: PromptTemplate[],
  query: string
): PromptTemplate[] {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return templates;
  }

  return templates.filter((template) =>
    [
      template.name,
      template.category,
      template.description,
      template.shortcut,
      template.content
    ]
      .filter(Boolean)
      .some((value) => normalizeText(value).includes(normalizedQuery))
  );
}

function groupTemplates(
  templates: PromptTemplate[]
): Array<[string, PromptTemplate[]]> {
  const groups = new Map<string, PromptTemplate[]>();

  for (const template of templates) {
    const category = template.category || "未分类";
    const group = groups.get(category) ?? [];
    group.push(template);
    groups.set(category, group);
  }

  return [...groups.entries()];
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function readRemoteTemplateUrl(settings: PromptHelperSettings): string {
  return typeof settings.remoteTemplateUrl === "string"
    ? settings.remoteTemplateUrl
    : "";
}
