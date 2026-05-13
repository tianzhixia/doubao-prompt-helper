import type { PromptTemplate } from "../types";

export interface TemplateManager {
  list(): PromptTemplate[];
}

export function createTemplateManager(
  templates: PromptTemplate[] = []
): TemplateManager {
  return {
    list: () => [...templates]
  };
}

export function parseTemplatesJson(content: string): PromptTemplate[] {
  let data: unknown;

  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("JSON 解析失败，请检查文件格式。");
  }

  return parseTemplatesData(data);
}

export function parseTemplatesData(data: unknown): PromptTemplate[] {
  const rawTemplates = Array.isArray(data)
    ? data
    : isTemplateContainer(data)
      ? data.templates
      : null;

  if (!rawTemplates) {
    throw new Error("JSON 必须是模板数组，或包含 templates 数组。");
  }

  return rawTemplates.map(normalizeTemplate);
}

function normalizeTemplate(value: unknown, index: number): PromptTemplate {
  if (!isRecord(value)) {
    throw new Error(`第 ${index + 1} 个模板必须是对象。`);
  }

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

function readRequiredString(
  value: Record<string, unknown>,
  key: string,
  index: number
): string {
  const fieldValue = value[key];

  if (typeof fieldValue !== "string" || fieldValue.trim() === "") {
    throw new Error(`第 ${index + 1} 个模板缺少必填字段 ${key}。`);
  }

  return fieldValue;
}

function readOptionalString(
  value: Record<string, unknown>,
  key: string
): string | undefined {
  const fieldValue = value[key];

  return typeof fieldValue === "string" ? fieldValue : undefined;
}

function isTemplateContainer(
  value: unknown
): value is { templates: unknown[] } {
  return isRecord(value) && Array.isArray(value.templates);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
