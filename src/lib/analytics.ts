import { API_BASE_URL, getAccessToken } from "@/api/client";

export type AnalyticsEventType =
  | "visit"
  | "ad_impression"
  | "reading_session"
  | "listening_session"
  | "completion"
  | "download";

interface AnalyticsEventInput {
  event_type: AnalyticsEventType;
  story_slug?: string;
  blog_slug?: string;
  duration_seconds?: number;
  value?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function storedId(storage: Storage, key: string) {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const created = makeId();
    storage.setItem(key, created);
    return created;
  } catch {
    return makeId();
  }
}

export function getAnalyticsVisitorId() {
  return storedId(window.localStorage, "worldstories_analytics_visitor");
}

export function getAnalyticsSessionId() {
  return storedId(window.sessionStorage, "worldstories_analytics_session");
}

export function trackAnalyticsEvent(input: AnalyticsEventInput): void {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const token = getAccessToken();
  const payload = {
    event_id: makeId(),
    visitor_id: getAnalyticsVisitorId(),
    session_id: getAnalyticsSessionId(),
    duration_seconds: 0,
    value: 0,
    metadata: {},
    ...input,
  };

  void fetch(`${API_BASE_URL}/analytics/events/`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export function trackCompletionOnce(
  storySlug: string,
  contentType: "chapter" | "audio" | "epub" | "pdf",
  itemSlug: string
) {
  const key = `worldstories_completion:${storySlug}:${contentType}:${itemSlug}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
  } catch {
    // Tracking remains best-effort when storage is unavailable.
  }
  trackAnalyticsEvent({
    event_type: "completion",
    story_slug: storySlug,
    value: 1,
    metadata: { content_type: contentType, item_slug: itemSlug },
  });
}
