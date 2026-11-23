import { useRef, type KeyboardEvent } from "react";
import type { HomeSectionChoiceOption, HomeSectionLayout } from "@/api/types";
import { NEW_LAYOUTS } from "@/lib/homeLayouts";

function LayoutWireframe({ layout }: { layout: HomeSectionLayout }) {
  switch (layout) {
    case "grid":
      return (
        <div className="grid h-10 grid-cols-3 gap-1" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[2px] bg-muted-foreground/25" />
          ))}
        </div>
      );
    case "rail":
      return (
        <div className="flex h-10 items-stretch gap-1 overflow-hidden" aria-hidden="true">
          <div className="w-1/3 shrink-0 rounded-[2px] bg-muted-foreground/25" />
          <div className="w-1/3 shrink-0 rounded-[2px] bg-muted-foreground/25" />
          <div className="w-1/3 shrink-0 rounded-[2px] bg-muted-foreground/25" />
          <div className="w-2 shrink-0 rounded-l-[2px] bg-muted-foreground/15" />
        </div>
      );
    case "trending":
      return (
        <div className="flex h-10 flex-col justify-between gap-1" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-primary/50" />
              <div className="h-2.5 flex-1 rounded-[2px] bg-muted-foreground/25" />
            </div>
          ))}
        </div>
      );
    case "featured":
      return (
        <div className="grid h-10 grid-cols-4 grid-rows-2 gap-1" aria-hidden="true">
          <div className="col-span-2 row-span-2 rounded-[2px] bg-primary/40" />
          <div className="rounded-[2px] bg-muted-foreground/25" />
          <div className="rounded-[2px] bg-muted-foreground/25" />
          <div className="rounded-[2px] bg-muted-foreground/25" />
          <div className="rounded-[2px] bg-muted-foreground/25" />
        </div>
      );
    case "bento":
      return (
        <div className="grid h-10 grid-cols-4 grid-rows-2 gap-1" aria-hidden="true">
          <div className="col-span-2 row-span-2 rounded-[2px] bg-primary/40" />
          <div className="rounded-[2px] bg-muted-foreground/25" />
          <div className="rounded-[2px] bg-muted-foreground/25" />
          <div className="col-span-2 rounded-[2px] bg-primary/25" />
        </div>
      );
    case "list":
      return (
        <div className="grid h-10 grid-cols-2 gap-1.5" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-full w-3 shrink-0 rounded-[2px] bg-muted-foreground/30" />
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="h-1.5 w-full rounded-[1px] bg-muted-foreground/25" />
                <div className="h-1 w-2/3 rounded-[1px] bg-muted-foreground/15" />
              </div>
            </div>
          ))}
        </div>
      );
    case "carousel":
      return (
        <div className="flex h-10 flex-col justify-between" aria-hidden="true">
          <div className="flex flex-1 items-center gap-1">
            <div className="h-3 w-1.5 rounded-sm bg-muted-foreground/40" />
            <div className="grid h-full flex-1 grid-cols-3 gap-1">
              <div className="rounded-[2px] bg-muted-foreground/25" />
              <div className="rounded-[2px] bg-muted-foreground/25" />
              <div className="rounded-[2px] bg-muted-foreground/25" />
            </div>
            <div className="h-3 w-1.5 rounded-sm bg-muted-foreground/40" />
          </div>
          <div className="mt-1 flex justify-center gap-1">
            <div className="h-1 w-2.5 rounded-full bg-primary" />
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          </div>
        </div>
      );
    case "tworow":
      return (
        <div className="grid h-10 grid-flow-col grid-rows-2 gap-1 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-5 rounded-[2px] bg-muted-foreground/25" />
          ))}
        </div>
      );
    case "covers":
      return (
        <div className="flex h-10 items-stretch gap-1 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-1/5 shrink-0 rounded-[2px] bg-primary/30" />
          ))}
        </div>
      );
  }
}

interface LayoutPickerProps {
  value: HomeSectionLayout;
  options: HomeSectionChoiceOption<HomeSectionLayout>[];
  onChange: (next: HomeSectionLayout) => void;
}

export function LayoutPicker({ value, options, onChange }: LayoutPickerProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (options.length === 0) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      onChange(options[nextIndex].value);
      refs.current[nextIndex]?.focus();
    }
  };

  return (
    <div role="radiogroup" aria-label="Section layout" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {options.map((option, index) => {
        const selected = option.value === value;
        const isNew = NEW_LAYOUTS.has(option.value);
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!options.some((o) => o.value === value) && index === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            title={option.description}
            className={`flex flex-col gap-2 rounded-lg p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
              selected
                ? "border-2 border-primary bg-primary/5"
                : "border border-border bg-card hover:border-primary/40 hover:bg-muted/30"
            }`}
          >
            <LayoutWireframe layout={option.value} />
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-semibold text-foreground">{option.label}</span>
              {isNew && (
                <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0 text-[10px] font-semibold text-primary">
                  New
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
