export const OPEN_ANNOTATION_SHORTCUT_EVENT = "serene:open-annotation";

export function isEditableShortcutTarget(target: EventTarget | null) {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "select" || tagName === "textarea";
}
