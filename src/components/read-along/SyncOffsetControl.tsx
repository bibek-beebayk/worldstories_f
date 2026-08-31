import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSyncOffset } from "@/lib/readAlongSyncOffset";

interface SyncOffsetControlProps {
  offsetSeconds: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onReset: () => void;
  atMin: boolean;
  atMax: boolean;
  className?: string;
}

const SEGMENT =
  "flex h-8 touch-manipulation items-center justify-center px-2 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/20 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none";

/**
 * Segmented pill for the Read Along "highlight sync" offset: `[-] Sync ±Xs [+]`.
 * Positive values delay the highlight; the centre segment shows the current
 * value and doubles as a reset once it is non-zero.
 */
export function SyncOffsetControl({
  offsetSeconds,
  onDecrease,
  onIncrease,
  onReset,
  atMin,
  atMax,
  className,
}: SyncOffsetControlProps) {
  const centred = offsetSeconds === 0;

  return (
    <div
      role="group"
      aria-label="Highlight sync"
      className={cn(
        "inline-flex items-center overflow-hidden rounded-full border border-white/20 bg-white/10",
        className
      )}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={atMin}
        aria-label="Highlight sooner"
        className={cn(SEGMENT, "min-w-8 rounded-l-full")}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={centred}
        aria-label={centred ? "Highlight sync centred" : "Reset highlight sync"}
        className={cn(
          SEGMENT,
          "whitespace-nowrap border-x border-white/15 tabular-nums disabled:opacity-100"
        )}
      >
        {`Sync ${formatSyncOffset(offsetSeconds)}`}
      </button>
      <button
        type="button"
        onClick={onIncrease}
        disabled={atMax}
        aria-label="Highlight later"
        className={cn(SEGMENT, "min-w-8 rounded-r-full")}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
