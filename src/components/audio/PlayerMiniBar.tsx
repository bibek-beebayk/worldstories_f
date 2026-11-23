import { ChevronRight, ChevronUp, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import { formatLeft } from "@/lib/formatDuration";

interface PlayerMiniBarProps {
  visible: boolean;
  coverImage?: string | null;
  storyTitle: string;
  storyAuthor?: string;
  chapterTitle: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  hasNext: boolean;
  onTogglePlay: () => void;
  onSkipBack: () => void;
  onNext: () => void;
  onExpand: () => void;
}

export function PlayerMiniBar({
  visible,
  coverImage,
  storyTitle,
  storyAuthor,
  chapterTitle,
  currentTime,
  duration,
  isPlaying,
  isLoading,
  hasNext,
  onTogglePlay,
  onSkipBack,
  onNext,
  onExpand,
}: PlayerMiniBarProps) {
  if (!visible) return null;

  const pct = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;
  const remaining = duration > 0 ? formatLeft(Math.max(0, duration - currentTime)) : "";

  return (
    <div
      role="region"
      aria-label="Mini audio player"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-[#1B1220] text-white shadow-2xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="h-[3px] w-full bg-white/15">
        <div
          className="h-full bg-[#FF5C7A] transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="container mx-auto flex items-center gap-2.5 px-3 py-2 sm:gap-3 sm:px-4">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-white/10">
          <CoverImage
            src={coverImage}
            alt=""
            title={storyTitle}
            author={storyAuthor}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{chapterTitle}</p>
          <p className="truncate text-xs text-[#D9C9D1]">
            {storyTitle}
            {remaining ? ` · ${remaining}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onSkipBack}
            aria-label="Rewind 15 seconds"
            className="relative flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">15</span>
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause" : "Play"}
            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-[#D92F4C] text-white shadow transition-colors hover:bg-[#b8213e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next chapter"
            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3] disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onExpand}
            aria-label="Scroll to main player"
            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-[#D9C9D1] transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3]"
          >
            <ChevronUp className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
