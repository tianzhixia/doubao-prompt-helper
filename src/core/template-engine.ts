import type { TemplateContext } from "../types";

export function renderTemplate(
  content: string,
  context: Partial<TemplateContext> = {}
): string {
  return content.replace(
    /\{\{\s*([^{}\s]+)\s*\}\}/g,
    (_match, key: string) => context[key] ?? ""
  );
}

export function runTemplateEngineSelfCheck(): void {
  const cases: Array<{
    name: string;
    content: string;
    context: Partial<TemplateContext>;
    expected: string;
  }> = [
    {
      name: "replaces variables",
      content: "Hello {{name}}",
      context: { name: "Doubao" },
      expected: "Hello Doubao"
    },
    {
      name: "trims spaces around keys",
      content: "{{ selection }}",
      context: { selection: "selected text" },
      expected: "selected text"
    },
    {
      name: "uses empty string for missing variables",
      content: "Before {{missing}} After",
      context: {},
      expected: "Before  After"
    },
    {
      name: "keeps html as text",
      content: "{{value}}",
      context: { value: "<strong>text</strong>" },
      expected: "<strong>text</strong>"
    }
  ];

  for (const testCase of cases) {
    const actual = renderTemplate(testCase.content, testCase.context);

    if (actual !== testCase.expected) {
      throw new Error(
        `Template engine self-check failed: ${testCase.name}. Expected "${testCase.expected}", got "${actual}".`
      );
    }
  }
}
