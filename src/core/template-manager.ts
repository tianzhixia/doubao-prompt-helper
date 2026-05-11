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
