import { Keyboard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SHORTCUTS: ReadonlyArray<{ keys: string[]; label: string }> = [
  { keys: ["Space"], label: "Play or pause" },
  { keys: ["←", "→"], label: "Skip −15s / +15s" },
  { keys: ["[", "]"], label: "Previous / next chapter" },
  { keys: ["↑", "↓"], label: "Speed up / down" },
  { keys: ["M"], label: "Mute or unmute" },
  { keys: ["F"], label: "Toggle fullscreen" },
];

export function ShortcutsPopover({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Keyboard shortcuts"
          className={cn(
            "hidden min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-white/[0.28] bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1220] lg:inline-flex",
            className,
          )}
        >
          <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Shortcuts</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keyboard shortcuts</p>
        <dl className="mt-2.5 space-y-2 text-xs">
          {SHORTCUTS.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <dt className="text-foreground">{item.label}</dt>
              <dd className="flex shrink-0 items-center gap-1">
                {item.keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">Shortcuts work while this page is open</p>
      </PopoverContent>
    </Popover>
  );
}
