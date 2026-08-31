export type ReadAlongShortcut =
  | "toggle-playback"
  | "seek-backward"
  | "seek-forward"
  | "dismiss"
  | null;

export interface ReadAlongShortcutInput {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  targetIsInteractive?: boolean;
}

/**
 * Resolves a reader-level shortcut without stealing keystrokes from controls.
 * Escape remains available inside panels so it can dismiss the active layer.
 */
export function resolveReadAlongShortcut({
  key,
  altKey = false,
  ctrlKey = false,
  metaKey = false,
  targetIsInteractive = false,
}: ReadAlongShortcutInput): ReadAlongShortcut {
  if (key === "Escape") return "dismiss";
  if (altKey || ctrlKey || metaKey || targetIsInteractive) return null;
  if (key === " " || key === "Spacebar") return "toggle-playback";
  if (key === "ArrowLeft") return "seek-backward";
  if (key === "ArrowRight") return "seek-forward";
  return null;
}

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='slider']",
  "[role='switch']",
  "[role='tab']",
  "[role='textbox']",
].join(",");

export function isInteractiveShortcutTarget(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}
