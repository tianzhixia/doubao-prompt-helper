export function getCurrentSelection(): string {
  return window.getSelection()?.toString() ?? "";
}
