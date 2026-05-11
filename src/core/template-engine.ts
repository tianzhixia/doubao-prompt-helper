import type { TemplateContext } from "../types";

export function renderTemplate(
  template: string,
  context: Partial<TemplateContext> = {}
): string {
  return template.replace(
    /\{\{(selection|input|pageTitle|pageUrl|date)\}\}/g,
    (_match, key: keyof TemplateContext) => context[key] ?? ""
  );
}
