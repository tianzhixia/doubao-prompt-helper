export type TemplateVariableName =
  | "selection"
  | "input"
  | "pageTitle"
  | "pageUrl"
  | "date";

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}

export type TemplateContext = Record<TemplateVariableName, string>;
