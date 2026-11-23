import { useRef, type KeyboardEvent } from "react";
import type { HomeSectionCardStyle, HomeSectionChoiceOption, HomeSectionLayout } from "@/api/types";

function CardStyleWireframe({ style }: { style: HomeSectionCardStyle }) {
  switch (style) {
    case "default":
      return (
        <div className="flex h-10 flex-col gap-1" aria-hidden="true">
          <div className="flex-1 rounded-[2px] bg-muted-foreground/25" />
          <div className="h-1.5 w-3/4 rounded-[1px] bg-muted-foreground/35" />
          <div className="h-1 w-1/2 rounded-[1px] bg-muted-foreground/20" />
        </div>
      );
    case "compact":
      return (
        <div className="flex h-10 flex-col gap-0.5" aria-hidden="true">
          <div className="flex-1 rounded-[2px] bg-muted-foreground/25" />
          <div className="h-1.5 w-2/3 rounded-[1px] bg-muted-foreground/30" />
        </div>
      );
    case "overlay":
      return (
        <div className="relative h-10 overflow-hidden rounded-[2px] bg-muted-foreground/30" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-foreground/60 to-transparent" />
          <div className="absolute inset-x-1.5 bottom-1.5 space-y-0.5">
            <div className="h-1.5 w-3/4 rounded-[1px] bg-background/90" />
            <div className="h-1 w-1/2 rounded-[1px] bg-background/60" />
          </div>
        </div>
      );
    case "wide":
      return (
        <div className="flex h-10 items-center gap-1.5" aria-hidden="true">
          <div className="h-full w-6 shrink-0 rounded-[2px] bg-muted-foreground/30" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="h-1.5 w-full rounded-[1px] bg-muted-foreground/35" />
            <div className="h-1 w-2/3 rounded-[1px] bg-muted-foreground/20" />
            <div className="h-1 w-1/2 rounded-[1px] bg-muted-foreground/15" />
          </div>
        </div>
      );
    case "text":
      return (
        <div className="flex h-10 flex-col justify-center gap-1 border-b border-muted-foreground/30" aria-hidden="true">
          <div className="h-1.5 w-4/5 rounded-[1px] bg-muted-foreground/40" />
          <div className="h-1 w-1/2 rounded-[1px] bg-muted-foreground/20" />
        </div>
      );
  }
}

export function cardStyleLayoutNote(layout: HomeSectionLayout): string | null {
  if (layout === "list") return "List layout always uses Horizontal cards.";
  if (layout === "covers") return "Cover-only shelf shows covers only without card text.";
  if (layout === "trending") return "Ranked list uses its own numbered row layout.";
  if (layout === "featured")
    return "Featured + grid always uses Overlay for the large lead item; your choice applies to the rest.";
  if (layout === "bento") return "Bento always uses Overlay for its large items; your choice applies to the 1×1 items.";
  return null;
}

function isStyleDisabledForLayout(style: HomeSectionCardStyle, layout: HomeSectionLayout): boolean {
  if (layout === "covers" || layout === "trending") return true;
  if (layout === "list" && style !== "wide") return true;
  return false;
}

interface CardStylePickerProps {
  value: HomeSectionCardStyle;
  layout: HomeSectionLayout;
  options: HomeSectionChoiceOption<HomeSectionCardStyle>[];
  onChange: (next: HomeSectionCardStyle) => void;
}

export function CardStylePicker({ value, layout, options, onChange }: CardStylePickerProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const note = cardStyleLayoutNote(layout);
  const enabledIndexes = options
    .map((option, idx) => (!isStyleDisabledForLayout(option.value, layout) ? idx : -1))
    .filter((idx) => idx >= 0);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (enabledIndexes.length === 0) return;
    const pos = enabledIndexes.indexOf(index);
    let nextPos: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextPos = pos < 0 ? 0 : (pos + 1) % enabledIndexes.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextPos = pos < 0 ? enabledIndexes.length - 1 : (pos - 1 + enabledIndexes.length) % enabledIndexes.length;
    }
    if (nextPos !== null) {
      event.preventDefault();
      const targetIndex = enabledIndexes[nextPos];
      onChange(options[targetIndex].value);
      refs.current[targetIndex]?.focus();
    }
  };

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Card style" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {options.map((option, index) => {
          const disabled = isStyleDisabledForLayout(option.value, layout);
          const selected = layout === "list" ? option.value === "wide" : option.value === value && !disabled;
          const focusable =
            !disabled &&
            (selected || (!enabledIndexes.some((i) => options[i].value === value) && index === enabledIndexes[0]));
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={disabled}
              disabled={disabled}
              tabIndex={focusable ? 0 : -1}
              onClick={() => !disabled && onChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              title={disabled && note ? note : option.description}
              className={`flex flex-col gap-2 rounded-lg p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                disabled
                  ? "cursor-not-allowed border border-border bg-muted/40 opacity-50"
                  : selected
                    ? "border-2 border-primary bg-primary/5"
                    : "border border-border bg-card hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <CardStyleWireframe style={option.value} />
              <span className="truncate text-xs font-semibold text-foreground">{option.label}</span>
            </button>
          );
        })}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
