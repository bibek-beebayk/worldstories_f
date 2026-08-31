import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioLoadingOverlayProps {
  label?: string;
  className?: string;
}

/** Centered "preparing audio" status pill. The caller decides when to render it. */
export function AudioLoadingOverlay({ label = "Preparing audio…", className }: AudioLoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-white/20 bg-slate-950/85 px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md",
        className
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin text-cyan-300 motion-reduce:animate-none" />
      <span>{label}</span>
    </div>
  );
}
