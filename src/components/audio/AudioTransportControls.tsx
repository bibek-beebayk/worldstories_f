import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioTransportControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: () => void;
  onSkip: (deltaSeconds: number) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  skipSeconds?: number;
  prevLabel?: string;
  nextLabel?: string;
  className?: string;
  buttonClassName?: string;
  playButtonClassName?: string;
}

/** Previous / rewind / play-pause / forward / next cluster. */
export function AudioTransportControls({
  isPlaying,
  isLoading,
  onTogglePlay,
  onSkip,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  skipSeconds = 15,
  prevLabel = "Previous",
  nextLabel = "Next",
  className,
  buttonClassName,
  playButtonClassName,
}: AudioTransportControlsProps) {
  const secondaryClass = cn(
    "h-11 w-11 touch-manipulation rounded-full bg-white/15 hover:bg-white/25 motion-reduce:transition-none",
    buttonClassName
  );

  return (
    <div className={cn("flex items-center justify-center gap-2 sm:justify-start sm:gap-3", className)}>
      <Button
        variant="secondary"
        size="icon"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label={prevLabel}
        className={secondaryClass}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="secondary"
        size="icon"
        onClick={() => onSkip(-skipSeconds)}
        aria-label={`Rewind ${skipSeconds} seconds`}
        className={cn("relative", secondaryClass)}
      >
        <RotateCcw className="h-4 w-4" />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
          {skipSeconds}
        </span>
      </Button>

      <Button
        onClick={onTogglePlay}
        size="icon"
        aria-label={isLoading ? "Loading audio — tap to play" : isPlaying ? "Pause" : "Play"}
        aria-busy={isLoading}
        className={cn("h-14 w-14 touch-manipulation rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300 motion-reduce:transition-none", playButtonClassName)}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />
        ) : isPlaying ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6" />
        )}
      </Button>

      <Button
        variant="secondary"
        size="icon"
        onClick={() => onSkip(skipSeconds)}
        aria-label={`Forward ${skipSeconds} seconds`}
        className={cn("relative", secondaryClass)}
      >
        <RotateCw className="h-4 w-4" />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
          {skipSeconds}
        </span>
      </Button>

      <Button
        variant="secondary"
        size="icon"
        onClick={onNext}
        disabled={!hasNext}
        aria-label={nextLabel}
        className={secondaryClass}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
