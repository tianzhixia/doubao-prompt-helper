export function createFloatingToolbar(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Prompts";
  return button;
}
