import { API_BASE_URL, getAccessToken } from "@/api/client";

export type AnalyticsEventType =
  | "visit"
  | "ad_impression"
  | "reading_session"
  | "listening_session"
  | "watching_session"
  | "completion"
  | "download"
  | "read_along_cue_seek"
  | "read_along_follow_toggle"
  // The Quick Read funnel. Each fires at most once per visit to a summary, so
  // the three counts form a real funnel rather than a count of interactions.
  | "quick_read_opened"
  | "quick_read_completed"
  | "quick_read_full_story_clicked"
  // The reading lifecycle. `story_completed` is absent on purpose: the server
  // raises it inside the same transaction that records the completion, so it
  // inherits that uniqueness constraint instead of a localStorage key.
  // See apps/stats/completion.py.
  | "story_started"
  | "story_resumed"
  | "story_progressed"
  | "next_story_clicked"
  // Story Passport. `country_unlocked` is absent on purpose: the server raises
  // it beside the completion that caused it, so it is exactly-once per reader
  // per country. See apps/stats/completion.py.
  | "passport_viewed"
  | "daily_story_viewed"
  | "daily_story_started"
  | "daily_story_completed";

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

const DAILY_STORY_SESSION_KEY = "worldstories_daily_story";

/** Preserve Daily Story attribution across navigation into any reader. */
export function markDailyStoryStarted(storySlug: string, date: string, action: "read_story" | "quick_read") {
  try {
    window.sessionStorage.setItem(DAILY_STORY_SESSION_KEY, JSON.stringify({ storySlug, date }));
  } catch {
    // Analytics attribution is best-effort when browser storage is blocked.
  }
  trackAnalyticsEvent({
    event_type: "daily_story_started",
    story_slug: storySlug,
    metadata: { date, action },
  });
}

/**
 * The server owns authenticated Daily Story completions. Guests have no
 * durable completion row, so their browser emits the equivalent event once
 * when the whole story completion helper runs.
 */
export function trackGuestDailyStoryCompletion(storySlug: string) {
  if (getAccessToken()) return;
  try {
    const raw = window.sessionStorage.getItem(DAILY_STORY_SESSION_KEY);
    if (!raw) return;
    const started = JSON.parse(raw) as { storySlug?: string; date?: string };
    if (started.storySlug !== storySlug || !started.date) return;
    const completedKey = `worldstories_daily_story_completed:${started.date}:${storySlug}`;
    if (window.localStorage.getItem(completedKey)) return;
    window.localStorage.setItem(completedKey, "1");
    trackAnalyticsEvent({
      event_type: "daily_story_completed",
      story_slug: storySlug,
      metadata: { date: started.date },
    });
  } catch {
    // Malformed/blocked storage must never interfere with finishing a story.
  }
}

export type CompletionContentType =
  | "chapter"
  | "audio"
  | "read_along"
  | "video"
  | "epub"
  | "pdf"
  | "story";

function completionKey(storySlug: string, contentType: CompletionContentType, itemSlug: string) {
  return `worldstories_completion:${storySlug}:${contentType}:${itemSlug}`;
}

export function hasTrackedCompletion(
  storySlug: string,
  contentType: CompletionContentType,
  itemSlug: string
): boolean {
  try {
    return Boolean(window.localStorage.getItem(completionKey(storySlug, contentType, itemSlug)));
  } catch {
    return false;
  }
}

export function trackCompletionOnce(
  storySlug: string,
  contentType: CompletionContentType,
  itemSlug: string
) {
  const key = completionKey(storySlug, contentType, itemSlug);
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
