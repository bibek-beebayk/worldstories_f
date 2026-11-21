const KEYS = {
  subscribedHint: "worldstories.newsletter.subscribedHint",
  promptDismissedAt: "worldstories.newsletter.promptDismissedAt",
  promptNever: "worldstories.newsletter.promptNever",
} as const;
const PREFS_EVENT = "worldstories-newsletter-prefs-change";

function read(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event(PREFS_EVENT));
  } catch {
    // Storage can be unavailable in private browsing or embedded contexts.
  }
}

export const newsletterPrefs = {
  getSubscribedHint: () => read(KEYS.subscribedHint) === "true",
  setSubscribedHint: (value = true) => write(KEYS.subscribedHint, value ? "true" : null),
  getPromptDismissedAt: () => read(KEYS.promptDismissedAt),
  setPromptDismissedAt: (date = new Date()) => write(KEYS.promptDismissedAt, date.toISOString()),
  getPromptNever: () => read(KEYS.promptNever) === "true",
  setPromptNever: (value = true) => write(KEYS.promptNever, value ? "true" : null),
  clear: () => Object.values(KEYS).forEach((key) => write(key, null)),
  subscribe: (listener: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener(PREFS_EVENT, listener);
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener(PREFS_EVENT, listener);
      window.removeEventListener("storage", listener);
    };
  },
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function shouldShowNewsletterPrompt(status: string | undefined, now = Date.now()) {
  if (status !== "none" || newsletterPrefs.getPromptNever()) return false;
  const dismissedAt = newsletterPrefs.getPromptDismissedAt();
  if (!dismissedAt) return true;
  const dismissedTime = Date.parse(dismissedAt);
  return !Number.isFinite(dismissedTime) || now - dismissedTime >= THIRTY_DAYS_MS;
}
