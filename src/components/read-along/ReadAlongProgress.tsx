import { cn } from "@/lib/utils";
import { formatTime } from "@/components/audio/formatTime";

interface ReadAlongProgressProps {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  className?: string;
}

/**
 * Thumbless Read Along scrubber: the track fills with colour to show
 * completion, with no drag handle. A transparent native range input overlays
 * the bar, so pointer, touch and keyboard seeking plus screen-reader semantics
 * all come for free. Elapsed / total labels are rendered by the caller.
 */
export function ReadAlongProgress({
  currentTime,
  duration,
  onSeek,
  className,
}: ReadAlongProgressProps) {
  const total = duration > 0 ? duration : 0;
  const clamped = Math.min(Math.max(currentTime, 0), total);
  const fillPercent = total > 0 ? (clamped / total) * 100 : 0;

  return (
    <div
      className={cn(
        "relative flex h-5 items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-300 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-slate-900",
        className
      )}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${fillPercent}%` }} />
      </div>
      <input
        type="range"
        aria-label="Playback position"
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(total)}`}
        min={0}
        max={total}
        step={0.1}
        value={clamped}
        onChange={(event) => onSeek(Number(event.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer touch-manipulation appearance-none bg-transparent opacity-0 focus-visible:outline-none"
      />
    </div>
  );
}
