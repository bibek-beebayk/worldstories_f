// Which progress milestones a reading session has newly crossed.
//
// `story_progressed` exists to show where readers drop off, which needs a
// handful of points per session — not one event per debounced save. A reader
// scrolling through a long chapter would otherwise generate hundreds of
// identical rows, drowning the signal and the events table alike.

export const PROGRESS_MILESTONES = [0.25, 0.5, 0.75] as const;

/**
 * The milestones between `previous` and `current`, in order.
 *
 * 100% is deliberately not a milestone: finishing is `story_completed`, and
 * emitting both for the same moment would double-count the end of every story.
 *
 * Only ever moves forward. Scrolling back up and down again re-crosses the
 * same thresholds, and each crossing is not a new fact about the reader —
 * hence the caller tracking the high-water mark and passing it as `previous`.
 */
export function milestonesCrossed(previous: number, current: number): number[] {
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return [];
  if (current <= previous) return [];
  return PROGRESS_MILESTONES.filter(
    (milestone) => previous < milestone && current >= milestone
  );
}
