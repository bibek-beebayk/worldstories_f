import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { milestonesCrossed } from "@/lib/readingMilestones";

/** Which surface the story is being read on, recorded on every event so the
 *  metrics can be read per format as well as overall. */
export type ReadingFormat = "chapter" | "audio" | "read_along" | "epub" | "pdf" | "video";

interface Options {
  storySlug: string | undefined;
  format: ReadingFormat;
  /** How far through the story the reader is, 0–1. */
  progress: number;
  /**
   * False while the saved position is still loading. Without this the hook
   * would see a momentary 0 and call every resumed session a fresh start,
   * which quietly inflates the start count and depresses the completion rate
   * derived from it (§12.2).
   */
  ready: boolean;
}

/**
 * Raises `story_started` / `story_resumed` once per visit, and
 * `story_progressed` as the reader crosses each quarter.
 *
 * `story_completed` is not here: the server raises that one when it records
 * the completion, so it is exactly-once per reader per story rather than
 * once per device with unclear browser storage. See apps/stats/completion.py.
 *
 * Started versus resumed is decided by the position the reader arrives at, not
 * by whether a progress row exists — that is the distinction §12.2's start
 * rate actually wants, and it is the same for signed-in and signed-out readers.
 */
export function useStoryReadingEvents({ storySlug, format, progress, ready }: Options) {
  const openedSlugRef = useRef<string | null>(null);
  const milestoneRef = useRef(0);

  useEffect(() => {
    // Reset when the reader moves to a different story, so the next one gets
    // its own open event and its own milestones.
    if (openedSlugRef.current !== storySlug) {
      openedSlugRef.current = null;
      milestoneRef.current = 0;
    }
  }, [storySlug]);

  useEffect(() => {
    if (!storySlug || !ready || openedSlugRef.current === storySlug) return;
    openedSlugRef.current = storySlug;

    const startedAt = Math.min(1, Math.max(0, progress || 0));
    // A position at the very beginning is a start, not a resume: someone who
    // opened a story yesterday and read one sentence is starting it today.
    const resuming = startedAt > 0.01;
    milestoneRef.current = startedAt;

    trackAnalyticsEvent({
      event_type: resuming ? "story_resumed" : "story_started",
      story_slug: storySlug,
      value: startedAt,
      metadata: { format },
    });
  }, [storySlug, ready, progress, format]);

  useEffect(() => {
    if (!storySlug || !ready || openedSlugRef.current !== storySlug) return;

    const crossed = milestonesCrossed(milestoneRef.current, progress);
    if (crossed.length === 0) return;
    milestoneRef.current = Math.max(milestoneRef.current, progress);

    for (const milestone of crossed) {
      trackAnalyticsEvent({
        event_type: "story_progressed",
        story_slug: storySlug,
        value: milestone,
        metadata: { format, milestone },
      });
    }
  }, [storySlug, ready, progress, format]);
}
