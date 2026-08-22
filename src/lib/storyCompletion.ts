import { hasTrackedCompletion, trackCompletionOnce } from "./analytics";

const JUST_FINISHED_SESSION_KEY = "worldstories_just_finished_story";

/** Call whenever a progress save indicates every item in a story (all
 * chapters / the one file / all audio tracks) is now done. Idempotent via
 * the same localStorage mechanism as trackCompletionOnce; returns whether
 * this is the first time — the signal callers use to show the rail now. */
export function markStoryFinishedIfComplete(storySlug: string, allItemsFinished: boolean): boolean {
  if (!allItemsFinished) return false;
  const alreadyFinished = hasTrackedCompletion(storySlug, "story", storySlug);
  trackCompletionOnce(storySlug, "story", storySlug);
  if (alreadyFinished) return false;

  try {
    window.sessionStorage.setItem(JUST_FINISHED_SESSION_KEY, storySlug);
  } catch {
    // Best-effort — StoryDetail just won't auto-show the rail on next visit.
  }
  return true;
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
