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
      className={cn(
        "rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/20",
        className
      )}
    >
      {rate}×
    </button>
  );
}
