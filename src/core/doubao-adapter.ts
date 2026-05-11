export const doubaoSelectors = {
  input: '[contenteditable="true"]'
} as const;

export function findDoubaoInput(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(doubaoSelectors.input);
}
