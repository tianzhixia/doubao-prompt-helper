export type DoubaoInputElement =
  | HTMLTextAreaElement
  | HTMLInputElement
  | HTMLElement;

export const doubaoSelectors = {
  textarea: "textarea",
  contentEditable:
    '[contenteditable]:not([contenteditable="false"])',
  roleTextbox: '[role="textbox"]',
  get inputCandidates() {
    return [
      this.textarea,
      this.contentEditable,
      this.roleTextbox
    ].join(",");
  }
} as const;

export function findInputElement(
  root: ParentNode | null = getDefaultRoot()
): DoubaoInputElement | null {
  if (!root) {
    return null;
  }

  try {
    const candidates = collectInputCandidates(root)
      .filter(isUsableInputCandidate)
      .map((element) => ({
        element,
        score: scoreInputCandidate(element)
      }))
      .sort((left, right) => right.score - left.score);

    return candidates[0]?.element ?? null;
  } catch {
    return null;
  }
}

export function getInputText(): string {
  const element = findInputElement();

  if (!element) {
    return "";
  }

  try {
    return readElementText(element);
  } catch {
    return "";
  }
}

export function setInputText(text: string): boolean {
  try {
    const element = findInputElement();

    if (!element) {
      return false;
    }

    const updated = writeElementText(element, text);

    if (updated) {
      dispatchInputEvents(element, "insertReplacementText", text);
    }

    return updated;
  } catch {
    return false;
  }
}

export function insertText(text: string): boolean {
  try {
    const element = findInputElement();

    if (!element) {
      return false;
    }

    const inserted = insertElementText(element, text);

    if (inserted) {
      dispatchInputEvents(element, "insertText", text);
    }

    return inserted;
  } catch {
    return false;
  }
}

export function observeInputReady(
  callback: (element: DoubaoInputElement) => void
): () => void {
  const root = getDefaultRoot();

  if (!root) {
    return () => undefined;
  }

  const notifiedElements = new WeakSet<DoubaoInputElement>();
  const notifyIfReady = (): void => {
    const element = findInputElement();

    if (!element || notifiedElements.has(element)) {
      return;
    }

    notifiedElements.add(element);
    callback(element);
  };

  try {
    notifyIfReady();

    if (typeof MutationObserver === "undefined") {
      return () => undefined;
    }

    const observer = new MutationObserver(() => notifyIfReady());
    observer.observe(root.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "contenteditable",
        "role",
        "disabled",
        "readonly",
        "aria-disabled",
        "hidden",
        "style",
        "class"
      ]
    });

    return () => observer.disconnect();
  } catch {
    return () => undefined;
  }
}

export function findDoubaoInput(
  root: ParentNode | null = getDefaultRoot()
): DoubaoInputElement | null {
  return findInputElement(root);
}

function collectInputCandidates(root: ParentNode): DoubaoInputElement[] {
  const candidates: DoubaoInputElement[] = [];

  if (isElement(root) && root.matches(doubaoSelectors.inputCandidates)) {
    candidates.push(root as DoubaoInputElement);
  }

  root
    .querySelectorAll<DoubaoInputElement>(doubaoSelectors.inputCandidates)
    .forEach((element) => candidates.push(element));

  return [...new Set(candidates)];
}

function isUsableInputCandidate(
  element: DoubaoInputElement
): element is DoubaoInputElement {
  if (!isEditableCandidate(element) || !isVisible(element)) {
    return false;
  }

  if (isValueInputElement(element)) {
    return !element.disabled && !element.readOnly && element.type !== "hidden";
  }

  return (
    element.getAttribute("aria-disabled") !== "true" &&
    !element.hasAttribute("disabled")
  );
}

function isEditableCandidate(element: DoubaoInputElement): boolean {
  return (
    isTextareaElement(element) ||
    isRoleTextbox(element) ||
    isContentEditableElement(element)
  );
}

function scoreInputCandidate(element: DoubaoInputElement): number {
  const rect = element.getBoundingClientRect();
  let score = 0;

  if (isActiveElement(element)) {
    score += 1000;
  }

  if (isTextareaElement(element)) {
    score += 300;
  }

  if (isContentEditableElement(element)) {
    score += 250;
  }

  if (isRoleTextbox(element)) {
    score += 200;
  }

  score += Math.min(rect.width, 800) / 10;
  score += Math.min(rect.height, 240) / 8;

  if (typeof window !== "undefined" && rect.top > window.innerHeight * 0.35) {
    score += 120;
  }

  if (readElementText(element).trim().length > 0) {
    score += 30;
  }

  return score;
}

function readElementText(element: DoubaoInputElement): string {
  if (isValueInputElement(element)) {
    return element.value;
  }

  return element.innerText ?? element.textContent ?? "";
}

function writeElementText(
  element: DoubaoInputElement,
  text: string
): boolean {
  element.focus();

  if (isValueInputElement(element)) {
    setNativeValue(element, text);
    moveValueCursorToEnd(element);
    return true;
  }

  if (isContentEditableElement(element) && insertTextByCommand(element, text)) {
    return true;
  }

  element.textContent = text;
  moveContentCursorToEnd(element);
  return true;
}

function insertElementText(
  element: DoubaoInputElement,
  text: string
): boolean {
  element.focus();

  if (isValueInputElement(element)) {
    const value = element.value;
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;

    setNativeValue(element, nextValue);
    element.setSelectionRange(start + text.length, start + text.length);
    return true;
  }

  if (insertTextAtContentSelection(element, text)) {
    return true;
  }

  element.append(document.createTextNode(text));
  moveContentCursorToEnd(element);
  return true;
}

function insertTextByCommand(
  element: HTMLElement,
  text: string
): boolean {
  try {
    selectElementContents(element);

    return document.execCommand("insertText", false, text);
  } catch {
    return false;
  }
}

function insertTextAtContentSelection(
  element: HTMLElement,
  text: string
): boolean {
  const selection = document.getSelection();

  if (!selection || selection.rangeCount === 0 || !isSelectionInside(element)) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const textNode = document.createTextNode(text);

  range.deleteContents();
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);

  return true;
}

function selectElementContents(element: HTMLElement): void {
  const selection = document.getSelection();
  const range = document.createRange();

  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function moveContentCursorToEnd(element: HTMLElement): void {
  const selection = document.getSelection();
  const range = document.createRange();

  range.selectNodeContents(element);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function moveValueCursorToEnd(
  element: HTMLTextAreaElement | HTMLInputElement
): void {
  const position = element.value.length;

  try {
    element.setSelectionRange(position, position);
  } catch {
    return;
  }
}

function dispatchInputEvents(
  element: DoubaoInputElement,
  inputType: string,
  data: string
): void {
  const inputEvent = createInputEvent(inputType, data);

  element.dispatchEvent(inputEvent);
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function createInputEvent(inputType: string, data: string): Event {
  try {
    return new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      data,
      inputType
    });
  } catch {
    return new Event("input", { bubbles: true, cancelable: true });
  }
}

function setNativeValue(
  element: HTMLTextAreaElement | HTMLInputElement,
  value: string
): void {
  const prototype = isTextareaElement(element)
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (valueSetter) {
    valueSetter.call(element, value);
    return;
  }

  element.value = value;
}

function isSelectionInside(element: HTMLElement): boolean {
  const selection = document.getSelection();

  if (!selection?.anchorNode || !selection.focusNode) {
    return false;
  }

  return (
    element.contains(selection.anchorNode) &&
    element.contains(selection.focusNode)
  );
}

function isVisible(element: HTMLElement): boolean {
  if (element.hidden) {
    return false;
  }

  const view = element.ownerDocument.defaultView;

  if (!view) {
    return false;
  }

  const style = view.getComputedStyle(element);

  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = element.getBoundingClientRect();

  return rect.width > 0 && rect.height > 0;
}

function isActiveElement(element: HTMLElement): boolean {
  const activeElement = document.activeElement;

  return activeElement === element || element.contains(activeElement);
}

function isRoleTextbox(element: HTMLElement): boolean {
  return element.getAttribute("role") === "textbox";
}

function isContentEditableElement(element: HTMLElement): boolean {
  return element.isContentEditable;
}

function isTextareaElement(
  element: DoubaoInputElement
): element is HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement;
}

function isValueInputElement(
  element: DoubaoInputElement
): element is HTMLTextAreaElement | HTMLInputElement {
  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLInputElement
  );
}

function isElement(value: unknown): value is Element {
  return value instanceof Element;
}

function getDefaultRoot(): Document | null {
  return typeof document === "undefined" ? null : document;
}
