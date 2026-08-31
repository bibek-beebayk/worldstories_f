import { cn } from "@/lib/utils";

interface AutoplayToggleProps {
  enabled: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
}

/** Pill switch controlling automatic advance to the next track. */
export function AutoplayToggle({ enabled, onToggle, className, label = "Autoplay" }: AutoplayToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label} ${enabled ? "on" : "off"}`}
      onClick={onToggle}
      className={cn(
        "flex min-h-11 min-w-11 touch-manipulation items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 motion-reduce:transition-none",
        className
      )}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors motion-reduce:transition-none",
          enabled ? "bg-cyan-400" : "bg-white/25"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-slate-900 transition-transform motion-reduce:transition-none",
            enabled ? "translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}
