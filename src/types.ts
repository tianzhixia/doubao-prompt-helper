export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  shortcut?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptHelperSettings extends Record<string, unknown> {
  remoteTemplateUrl?: string;
}

export type TemplateContext = Record<string, string | null | undefined>;
