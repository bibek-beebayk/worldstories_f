import { Minus, Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSyncOffset } from "@/lib/readAlongSyncOffset";

interface SyncOffsetControlProps {
  offsetSeconds: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onReset: () => void;
  /** Whether the centre segment acts as a "reset to default" button. */
  resettable: boolean;
  atMin: boolean;
  atMax: boolean;
  /** Superuser only: persist the current offset as the track default for all readers. */
  onSaveDefault?: () => void;
  canSaveDefault?: boolean;
  className?: string;
}

const SEGMENT =
  "flex h-8 touch-manipulation items-center justify-center px-2 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/20 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none";

/**
 * Segmented pill for the Read Along "highlight sync" offset: `[-] Sync ±Xs [+]`.
 * Positive values delay the highlight; the centre segment shows the current
 * value and resets to the track default when the reader has nudged it. A
 * superuser also gets a trailing save segment that writes the value as the
 * default for everyone.
 */
export function SyncOffsetControl({
  offsetSeconds,
  onDecrease,
  onIncrease,
  onReset,
  resettable,
  atMin,
  atMax,
  onSaveDefault,
  canSaveDefault = false,
  className,
}: SyncOffsetControlProps) {
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
        disabled={!resettable}
        aria-label={resettable ? "Reset to default sync" : "Highlight sync"}
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
        className={cn(SEGMENT, "min-w-8", !onSaveDefault && "rounded-r-full")}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      {onSaveDefault && (
        <button
          type="button"
          onClick={onSaveDefault}
          disabled={!canSaveDefault}
          aria-label="Save as the default sync for all readers"
          title="Save as the default for all readers"
          className={cn(SEGMENT, "min-w-8 border-l border-white/15 rounded-r-full")}
        >
          <Save className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
