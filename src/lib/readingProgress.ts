// How far through a piece of content the reader has scrolled.
//
// The same arithmetic was already written twice, against two different scroll
// models — StoryReader measures inside its own scroll container, BlogDetail
// against window scroll — and Quick Read had no measurement at all. This is the
// shared core: both models reduce to "where is the bottom of the viewport,
// relative to the content", so callers supply that one number and this decides
// what fraction it represents.

export interface ScrollProgressInput {
  /** Distance from the top of the scrollable area to the top of the content. */
  contentTop: number;
  /** The content's own rendered height. */
  contentHeight: number;
  /** Where the bottom of the viewport currently sits, in the same coordinates. */
  viewportBottom: number;
}

/**
 * The fraction of the content that has been scrolled past, clamped to 0–1.
 *
 * Measured to the *bottom* of the viewport rather than the top: a reader who
 * can see the last line has read to the end, even though the content's top has
 * barely moved. Measuring to the top would cap a short article at well under
 * 100% and never let it complete.
 *
 * Content with no height reports 0 rather than dividing by zero — an empty or
 * not-yet-laid-out article is at the beginning, not the end.
 */
export function contentScrollFraction({
  contentTop,
  contentHeight,
  viewportBottom,
}: ScrollProgressInput): number {
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return 0;
  const scrolled = viewportBottom - contentTop;
  return clampFraction(scrolled / contentHeight);
}

/** Clamp to the 0–1 range, treating anything non-numeric as the start. */
export function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** `0.6789 → 68`. Whole numbers only: a reading position is an approximation,
 *  and a decimal implies a precision the estimate does not have. */
export function progressPercent(fraction: number): number {
  return Math.round(clampFraction(fraction) * 100);
}
