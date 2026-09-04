import { useCallback, useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

/**
 * The Quick Read → Full Story funnel: opened → completed → clicked through.
 *
 * Each step fires **at most once per visit to a summary**, which is what makes
 * the three counts a funnel rather than a tally of interactions. Conversion
 * (§12.2) is read as full-story clicks over completions, and that ratio is
 * meaningless if a reader who scrolls up and back down registers two
 * completions.
 *
 * Per *visit*, deliberately, not per reader-ever: re-reading a summary a month
 * later and then opening the full story is a real conversion and should count
 * again. That is the opposite of `trackCompletionOnce`, which is
 * once-per-reader-forever because a story can only be finished once.
 *
 * Returns a ref to attach to a sentinel element at the end of the summary, and
 * the handler for the "Read the Full Story" action.
 */
export function useQuickReadFunnel(storySlug: string | undefined) {
  const openedRef = useRef<string | null>(null);
  const completedRef = useRef<string | null>(null);
  const clickedRef = useRef<string | null>(null);
  const endOfSummaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!storySlug || openedRef.current === storySlug) return;
    openedRef.current = storySlug;
    trackAnalyticsEvent({ event_type: "quick_read_opened", story_slug: storySlug });
  }, [storySlug]);

  useEffect(() => {
    const sentinel = endOfSummaryRef.current;
    if (!storySlug || !sentinel) return;
    // Guarded rather than assumed: IntersectionObserver is absent in some
    // older/embedded browsers, and analytics must never be the reason a
    // reader's page breaks.
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      const reachedEnd = entries.some((entry) => entry.isIntersecting);
      if (!reachedEnd || completedRef.current === storySlug) return;
      completedRef.current = storySlug;
      trackAnalyticsEvent({ event_type: "quick_read_completed", story_slug: storySlug });
      observer.disconnect();
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
    // A summary short enough to fit on screen without scrolling fires
    // immediately, which is correct: the reader can see all of it.
  }, [storySlug]);

  const trackFullStoryClick = useCallback(() => {
    if (!storySlug || clickedRef.current === storySlug) return;
    clickedRef.current = storySlug;
    trackAnalyticsEvent({
      event_type: "quick_read_full_story_clicked",
      story_slug: storySlug,
      // Whether they read to the end before converting — the difference
      // between "the summary sold it" and "the summary was not enough".
      metadata: { completed_summary: completedRef.current === storySlug },
    });
  }, [storySlug]);

  return { endOfSummaryRef, trackFullStoryClick };
}
