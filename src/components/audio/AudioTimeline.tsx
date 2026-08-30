import { cn } from "@/lib/utils";
import { formatTime } from "./formatTime";

interface AudioTimelineProps {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  className?: string;
  trackClassName?: string;
  labelClassName?: string;
}

/**
 * Scrubber + elapsed/total time labels. `onSeek` receives the raw slider
 * value with no clamping (the caller decides) — matching the audiobook
 * player's original inline scrubber.
 */
export function AudioTimeline({
  currentTime,
  duration,
  onSeek,
  className,
  trackClassName,
  labelClassName,
}: AudioTimelineProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => onSeek(Number(event.target.value))}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-cyan-300",
          trackClassName
        )}
      />
      <div className={cn("flex items-center justify-between text-xs text-slate-300", labelClassName)}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
