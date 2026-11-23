import { useEffect, useRef } from "react";

export type PlayerShortcutAction =
  | "togglePlay"
  | "seekBack"
  | "seekForward"
  | "prev"
  | "next"
  | "speedUp"
  | "speedDown"
  | "toggleMute"
  | "toggleFullscreen";

export interface ShortcutEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: {
    tagName?: string;
    isContentEditable?: boolean;
    getAttribute?: (name: string) => string | null;
  } | null;
}

const INTERACTIVE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const SPACE_NATIVE_ROLES = new Set(["button", "switch", "checkbox", "radio", "menuitem", "option", "tab", "slider"]);

export function mapPlayerShortcutKey(event: ShortcutEventLike, hasOpenOverlay = false): PlayerShortcutAction | null {
  if (hasOpenOverlay) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  const target = event.target;
  if (target) {
    const tag = (target.tagName ?? "").toUpperCase();
    if (INTERACTIVE_TAGS.has(tag) || target.isContentEditable) return null;
    const role = (target.getAttribute?.("role") ?? "").toLowerCase();
    if (event.key === " " && (tag === "BUTTON" || tag === "A" || SPACE_NATIVE_ROLES.has(role))) {
      return null;
    }
  }

  switch (event.key) {
    case " ":
      return "togglePlay";
    case "ArrowLeft":
      return "seekBack";
    case "ArrowRight":
      return "seekForward";
    case "[":
      return "prev";
    case "]":
      return "next";
    case "ArrowUp":
      return "speedUp";
    case "ArrowDown":
      return "speedDown";
    case "m":
    case "M":
      return "toggleMute";
    case "f":
    case "F":
      return "toggleFullscreen";
    default:
      return null;
  }
}

export interface PlayerShortcutHandlers {
  togglePlay: () => void;
  seekBack: () => void;
  seekForward: () => void;
  prev: () => void;
  next: () => void;
  speedUp: () => void;
  speedDown: () => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
}

export function usePlayerShortcuts(handlers: PlayerShortcutHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasOpenOverlay = Boolean(
        document.querySelector(
          '[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper] [data-state="open"]',
        ),
      );
      const target = event.target as HTMLElement | null;
      const action = mapPlayerShortcutKey(
        {
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          target: target
            ? {
                tagName: target.tagName,
                isContentEditable: target.isContentEditable,
                getAttribute: (name) => target.getAttribute(name),
              }
            : null,
        },
        hasOpenOverlay,
      );
      if (!action) return;
      if (action === "togglePlay" || action === "speedUp" || action === "speedDown") {
        event.preventDefault();
      }
      handlersRef.current[action]();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
