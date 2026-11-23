import { useState } from "react";
import { Check, Gauge } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SPEED_OPTIONS } from "@/hooks/audio/useAudioPlayback";
import { cn } from "@/lib/utils";

interface SpeedPickerProps {
  rate: number;
  onSelect: (rate: number) => void;
  className?: string;
}

export function SpeedPicker({ rate, onSelect, className }: SpeedPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Playback speed ${rate}x`}
          className={cn(
            "inline-flex min-h-[44px] shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-white/[0.28] bg-white/10 px-3.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1220] sm:min-h-[36px] sm:px-3",
            rate !== 1 && "border-white bg-white text-[#7F1D2D] hover:bg-white/90",
            className,
          )}
        >
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="tabular-nums">{rate}×</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1.5">
        <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Playback speed
        </p>
        <div role="menu" aria-label="Playback speed options" className="space-y-0.5">
          {SPEED_OPTIONS.map((option) => {
            const active = option === rate;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-[44px] w-full items-center justify-between rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]",
                  active ? "bg-[#FDECEF] text-[#7F1D2D]" : "text-foreground hover:bg-muted",
                )}
              >
                <span className="tabular-nums">
                  {option}×{option === 1 ? " (Normal)" : ""}
                </span>
                {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
