import { cn } from "@/lib/utils";

interface PlaybackSpeedControlProps {
  rate: number;
  onCycle: () => void;
  className?: string;
}

/** Pill button that shows the current rate (e.g. `1.5×`) and cycles on click. */
export function PlaybackSpeedControl({ rate, onCycle, className }: PlaybackSpeedControlProps) {
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`Playback speed ${rate} times. Activate to change speed`}
      className={cn(
        "min-h-11 min-w-11 touch-manipulation rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 motion-reduce:transition-none",
        className
      )}
    >
      {rate}×
    </button>
  );
}
