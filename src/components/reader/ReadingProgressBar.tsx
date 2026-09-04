import { progressPercent } from "@/lib/readingProgress";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ReadingProgressBarProps {
  /** How far through the content the reader is, 0–1. */
  fraction: number;
  /** Names what is being measured, for screen readers: "Story", "Summary". */
  label: string;
  className?: string;
}

/**
 * A hairline bar pinned to the top of a reading surface.
 *
 * Two pixels, no chrome, no number: the brief is a *subtle* signal, and the
 * point of a reader is the text. The numeric readouts the chapter reader
 * already has in its bottom bar and its floating pill are the precise answer;
 * this is the at-a-glance one, which is what a reader actually wants while
 * reading rather than while navigating.
 *
 * Announced as a progress bar so the position is available to a screen reader,
 * which no purely visual indicator provides — but `aria-hidden` on the fill
 * itself, so the decorative element is not announced twice.
 */
export function ReadingProgressBar({ fraction, label, className = "" }: ReadingProgressBarProps) {
  const percent = progressPercent(fraction);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}% of this ${label.toLowerCase()} read`}
      aria-label={`${label} reading progress`}
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent ${className}`}
    >
      <div
        aria-hidden="true"
        className={`h-full bg-primary/70 ${prefersReducedMotion ? "" : "transition-[width] duration-150 ease-out"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default ReadingProgressBar;
