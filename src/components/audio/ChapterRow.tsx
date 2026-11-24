import { forwardRef } from "react";
import { Link } from "react-router";
import { Check } from "lucide-react";
import type { Audio } from "@/api/types";
import { formatClock } from "@/lib/formatDuration";
import { audiobookUrl } from "@/lib/urls";
import { cn } from "@/lib/utils";

export interface ChapterRowProps {
  storySlug: string;
  audio: Audio;
  isActive: boolean;
  isPlaying: boolean;
  /** 0..1 progress for signed-in users, or null for guests (hides all progress UI). */
  progress: number | null;
  linkState?: unknown;
  onSelect?: () => void;
}

export const ChapterRow = forwardRef<HTMLAnchorElement, ChapterRowProps>(
  ({ storySlug, audio, isActive, isPlaying, progress, linkState, onSelect }, ref) => {
    const isFinished = progress !== null && progress >= 0.95;
    const isInProgress = progress !== null && progress > 0 && progress < 0.95;
    const progressPct = isInProgress ? Math.max(1, Math.min(99, Math.round(progress * 100))) : 0;
    const durationText = formatClock(audio.duration_seconds);

    return (
      <Link
        ref={ref}
        to={audiobookUrl(storySlug, audio.slug)}
        state={linkState}
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "block border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D92F4C]",
          isActive ? "bg-[#FDECEF] dark:bg-rose-950/40" : "hover:bg-muted/50",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-[22px] shrink-0 items-center justify-center text-xs font-semibold tabular-nums">
            {isActive ? (
              <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
                <span
                  className={cn(
                    "w-[3px] rounded-full bg-[#B8213E] dark:bg-rose-400",
                    isPlaying ? "h-3 motion-safe:animate-pulse" : "h-1.5",
                  )}
                />
                <span
                  className={cn(
                    "w-[3px] rounded-full bg-[#B8213E] dark:bg-rose-400",
                    isPlaying ? "h-2 motion-safe:animate-pulse [animation-delay:150ms]" : "h-2.5",
                  )}
                />
                <span
                  className={cn(
                    "w-[3px] rounded-full bg-[#B8213E] dark:bg-rose-400",
                    isPlaying ? "h-3.5 motion-safe:animate-pulse [animation-delay:300ms]" : "h-2",
                  )}
                />
              </span>
            ) : isFinished ? (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Finished" />
            ) : (
              <span className="text-muted-foreground">{audio.order}</span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p
                className={cn(
                  "line-clamp-2 text-sm font-semibold leading-snug",
                  isActive
                    ? "text-[#7F1D2D] dark:text-rose-200"
                    : isFinished
                      ? "text-muted-foreground"
                      : "text-foreground",
                )}
              >
                {audio.title}
              </p>
              {durationText && (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{durationText}</span>
              )}
            </div>

            {isActive && (
              <p className="mt-0.5 text-[11px] font-semibold text-[#B8213E] dark:text-rose-300">Now playing</p>
            )}

            {isInProgress && (
              <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[#D92F4C]" style={{ width: `${progressPct}%` }} />
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  },
);
ChapterRow.displayName = "ChapterRow";
