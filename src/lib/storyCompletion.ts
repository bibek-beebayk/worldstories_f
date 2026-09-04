import { hasTrackedCompletion, trackCompletionOnce, trackGuestDailyStoryCompletion } from "./analytics";

const JUST_FINISHED_SESSION_KEY = "worldstories_just_finished_story";

/** Records the finish on this device without emitting anything. */
function markLocallyFinished(storySlug: string) {
  try {
    window.localStorage.setItem(`worldstories_completion:${storySlug}:story:${storySlug}`, "1");
  } catch {
    // Best-effort; the server record is the one that matters.
  }
}

/** Call whenever a progress save indicates every item in a story (all
 * chapters / the one file / all audio tracks) is now done. Idempotent via
 * the same localStorage mechanism as trackCompletionOnce; returns whether
 * this is the first time — the signal callers use to show the rail now. */
export function markStoryFinishedIfComplete(storySlug: string, allItemsFinished: boolean): boolean {
  if (!allItemsFinished) return false;
  const alreadyFinished = hasTrackedCompletion(storySlug, "story", storySlug);
  trackCompletionOnce(storySlug, "story", storySlug);
  if (alreadyFinished) return false;

  trackGuestDailyStoryCompletion(storySlug);

  flagJustFinished(storySlug);
  return true;
}

function flagJustFinished(storySlug: string) {
  try {
    window.sessionStorage.setItem(JUST_FINISHED_SESSION_KEY, storySlug);
  } catch {
    // Best-effort — StoryDetail just won't auto-show the screen on next visit.
  }
}

/**
 * The server has confirmed that *this* progress write is the one that finished
 * the story (`story_completed` on the response — see apps/stats/completion.py).
 *
 * Preferred over the local check above for signed-in readers, because it is
 * the only one that is right on a second device or after the browser store is
 * cleared: the local check keys on a localStorage entry that a fresh device
 * does not have, so it would announce a completion the reader already had, and
 * a store cleared mid-story would announce it twice.
 *
 * Still fires the analytics event, which stays locally deduplicated — one
 * spurious analytics row is harmless where a spurious completion screen is not.
 */
export function noteServerConfirmedCompletion(storySlug: string) {
  // No analytics event from here. The server raises `story_completed` inside
  // the same transaction that records the completion, so it is exactly-once
  // per reader per story — see apps/stats/completion.py. Emitting one from the
  // browser as well would double-count every finish by a signed-in reader.
  // The localStorage key is still written, purely so this device knows not to
  // announce the same finish twice.
  markLocallyFinished(storySlug);
  flagJustFinished(storySlug);
}

/** Read-and-clear, called once by StoryDetail on mount. Consuming the flag
 * is what makes the rail show only on the visit right after finishing, not
 * on every later revisit. */
export function consumeJustFinishedFlag(storySlug: string): boolean {
  try {
    const value = window.sessionStorage.getItem(JUST_FINISHED_SESSION_KEY);
    if (value !== storySlug) return false;
    window.sessionStorage.removeItem(JUST_FINISHED_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
