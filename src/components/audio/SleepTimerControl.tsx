import { useState } from "react";
import { Check, Moon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SleepTimerMode } from "@/hooks/audio/useSleepTimer";
import { formatClock } from "@/lib/formatDuration";
import { cn } from "@/lib/utils";

const MINUTE_OPTIONS = [10, 20, 30, 45] as const;

interface SleepTimerControlProps {
  mode: SleepTimerMode;
  remainingSeconds: number | null;
  onStartMinutes: (minutes: number) => void;
  onStartEndOfChapter: () => void;
  onCancel: () => void;
  className?: string;
}

export function SleepTimerControl({
  mode,
  remainingSeconds,
  onStartMinutes,
  onStartEndOfChapter,
  onCancel,
  className,
}: SleepTimerControlProps) {
  const [open, setOpen] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const isActive = mode !== "off";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            mode === "minutes" && remainingSeconds !== null
              ? `Sleep timer, sleeping in ${formatClock(remainingSeconds)}`
              : mode === "chapter"
                ? "Sleep timer, sleeping at chapter end"
                : "Sleep timer"
          }
          className={cn(
            "inline-flex min-h-[44px] shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-white/[0.28] bg-white/10 px-3.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1220] sm:min-h-[36px] sm:px-3",
            isActive && "border-white bg-white text-[#7F1D2D] hover:bg-white/90",
            className,
          )}
        >
          <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {mode === "minutes" && remainingSeconds !== null ? (
            <span>
              Sleeping in <span className="font-mono tabular-nums">{formatClock(remainingSeconds)}</span>
            </span>
          ) : mode === "chapter" ? (
            <span>Sleeping at chapter end</span>
          ) : (
            <span>Sleep timer</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1.5">
        <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Sleep timer
        </p>
        <div role="menu" aria-label="Sleep timer options" className="space-y-0.5">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={mode === "off"}
            onClick={() => {
              setSelectedMinutes(null);
              onCancel();
              setOpen(false);
            }}
            className={cn(
              "flex min-h-[44px] w-full items-center justify-between rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]",
              mode === "off" ? "bg-[#FDECEF] text-[#7F1D2D]" : "text-foreground hover:bg-muted",
            )}
          >
            <span>Off</span>
            {mode === "off" && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
          </button>

          {MINUTE_OPTIONS.map((mins) => {
            const active = mode === "minutes" && selectedMinutes === mins;
            return (
              <button
                key={mins}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setSelectedMinutes(mins);
                  onStartMinutes(mins);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-[44px] w-full items-center justify-between rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]",
                  active ? "bg-[#FDECEF] text-[#7F1D2D]" : "text-foreground hover:bg-muted",
                )}
              >
                <span>{mins} min</span>
                {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}

          <button
            type="button"
            role="menuitemradio"
            aria-checked={mode === "chapter"}
            onClick={() => {
              setSelectedMinutes(null);
              onStartEndOfChapter();
              setOpen(false);
            }}
            className={cn(
              "flex min-h-[44px] w-full items-center justify-between rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]",
              mode === "chapter" ? "bg-[#FDECEF] text-[#7F1D2D]" : "text-foreground hover:bg-muted",
            )}
          >
            <span>End of chapter</span>
            {mode === "chapter" && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
