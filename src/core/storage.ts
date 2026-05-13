import type { PromptHelperSettings, PromptTemplate } from "../types";
import { DEFAULT_TEMPLATES } from "../templates/default-templates";

type GMGetValue = <T>(key: string, defaultValue?: T) => T | Promise<T>;
type GMSetValue = (key: string, value: unknown) => void | Promise<void>;
type GMDeleteValue = (key: string) => void | Promise<void>;

const STORAGE_KEYS = {
  templates: "doubao-prompt-helper:templates",
  settings: "doubao-prompt-helper:settings"
} as const;

const DEFAULT_SETTINGS: PromptHelperSettings = {
  remoteTemplateUrl: ""
};

export async function getTemplates(): Promise<PromptTemplate[]> {
  return getValue(STORAGE_KEYS.templates, DEFAULT_TEMPLATES);
}

export async function saveTemplates(
  templates: PromptTemplate[]
): Promise<void> {
  await setValue(STORAGE_KEYS.templates, templates);
}

export async function getSettings(): Promise<PromptHelperSettings> {
  return getValue(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
}

export async function saveSettings(
  settings: PromptHelperSettings
): Promise<void> {
  await setValue(STORAGE_KEYS.settings, settings);
}

export async function resetAll(): Promise<void> {
  await deleteValue(STORAGE_KEYS.templates);
  await deleteValue(STORAGE_KEYS.settings);
}

async function getValue<T>(key: string, defaultValue: T): Promise<T> {
  const gmGetValue = getGMGetValue();

  if (gmGetValue) {
    return gmGetValue(key, defaultValue);
  }

  return getLocalStorageValue(key, defaultValue);
}

async function setValue(key: string, value: unknown): Promise<void> {
  const gmSetValue = getGMSetValue();

  if (gmSetValue) {
    await gmSetValue(key, value);
    return;
  }

  setLocalStorageValue(key, value);
}

async function deleteValue(key: string): Promise<void> {
  const gmDeleteValue = getGMDeleteValue();

  if (gmDeleteValue) {
    await gmDeleteValue(key);
    return;
  }

  getLocalStorage()?.removeItem(key);
}

function getLocalStorageValue<T>(key: string, defaultValue: T): T {
  const storedValue = getLocalStorage()?.getItem(key);

  if (storedValue === null || storedValue === undefined) {
    return defaultValue;
  }

  try {
    return JSON.parse(storedValue) as T;
  } catch {
    return defaultValue;
  }
}

function setLocalStorageValue(key: string, value: unknown): void {
  getLocalStorage()?.setItem(key, JSON.stringify(value));
}

function getGMGetValue(): GMGetValue | undefined {
  const gm = globalThis as typeof globalThis & {
    GM_getValue?: GMGetValue;
  };

  return typeof gm.GM_getValue === "function"
    ? gm.GM_getValue.bind(globalThis)
    : undefined;
}

function getGMSetValue(): GMSetValue | undefined {
  const gm = globalThis as typeof globalThis & {
    GM_setValue?: GMSetValue;
  };

  return typeof gm.GM_setValue === "function"
    ? gm.GM_setValue.bind(globalThis)
    : undefined;
}

function getGMDeleteValue(): GMDeleteValue | undefined {
  const gm = globalThis as typeof globalThis & {
    GM_deleteValue?: GMDeleteValue;
  };

  return typeof gm.GM_deleteValue === "function"
    ? gm.GM_deleteValue.bind(globalThis)
    : undefined;
}

function getLocalStorage(): Storage | undefined {
  return typeof globalThis.localStorage === "undefined"
    ? undefined
    : globalThis.localStorage;
}
