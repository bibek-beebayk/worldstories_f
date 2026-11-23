import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import type { HomeSectionSortOption } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type PickerOption<T extends string | number> = { value: T; label: string };

export function LabeledField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SettingGroup({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section
      className="space-y-4 rounded-lg border bg-card p-4"
      aria-labelledby={`setting-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={`setting-${title.replace(/\s+/g, "-").toLowerCase()}`} className="text-sm font-semibold">
          {title}
        </h3>
        {note && <p className="max-w-sm text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export function SortPicker({
  options,
  value,
  onChange,
}: {
  options: HomeSectionSortOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) || options.length === 0) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (current + delta + buttons.length) % buttons.length;
    onChange(options[next].value);
    buttons[next].focus();
  };

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Sort order" onKeyDown={handleKeyDown} className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const checked = option.value === selected?.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (!selected && index === 0) ? 0 : -1}
              onClick={() => onChange(option.value)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                checked ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted"
              }`}
            >
              {checked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {selected && <p className="text-xs text-muted-foreground">{selected.description}</p>}
    </div>
  );
}

export function ChipMultiSelect<T extends string | number>({
  label,
  options,
  selected,
  onChange,
  emptyText = "No options available.",
}: {
  label: string;
  options: PickerOption<T>[];
  selected: T[];
  onChange: (values: T[]) => void;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const labels = useMemo(() => new Map(options.map((option) => [option.value, option.label])), [options]);
  const available = options.filter(
    (option) => !selected.includes(option.value) && option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <LabeledField label={label}>
      <div className="flex flex-wrap items-center gap-2">
        {selected.map((value) => (
          <span
            key={String(value)}
            className="inline-flex min-h-9 items-center gap-1 rounded-full border bg-muted px-2.5 text-sm"
          >
            {labels.get(value) ?? `#${value}`}
            <button
              type="button"
              onClick={() => onChange(selected.filter((item) => item !== value))}
              aria-label={`Remove ${labels.get(value) ?? value}`}
              className="rounded-full p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="min-h-9">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}`}
              aria-label={`Search ${label}`}
              className="mb-2"
            />
            <div className="max-h-56 overflow-y-auto scrollbar-thin" role="listbox" aria-label={label}>
              {available.map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => {
                    onChange([...selected, option.value]);
                    setSearch("");
                  }}
                  className="flex min-h-10 w-full items-center rounded px-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {option.label}
                </button>
              ))}
              {available.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">{emptyText}</p>}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </LabeledField>
  );
}

export function RangeField({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  suffix,
  minimum = 0,
}: {
  label: string;
  minValue: number | null | undefined;
  maxValue: number | null | undefined;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
  suffix: string;
  minimum?: number;
}) {
  const numberValue = (raw: string) => (raw === "" ? null : Number(raw));
  return (
    <LabeledField label={label}>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Input
            type="number"
            min={minimum}
            value={minValue ?? ""}
            onChange={(event) => onMinChange(numberValue(event.target.value))}
            aria-label={`Minimum ${label}`}
            className="pr-12"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        </div>
        <div className="relative">
          <Input
            type="number"
            min={minimum}
            value={maxValue ?? ""}
            onChange={(event) => onMaxChange(numberValue(event.target.value))}
            aria-label={`Maximum ${label}`}
            className="pr-12"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        </div>
      </div>
    </LabeledField>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: PickerOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <LabeledField label={label}>
      <div className="inline-flex flex-wrap rounded-md border p-1" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-9 rounded px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              value === option.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </LabeledField>
  );
}

export function OrderedIdList({
  label,
  ids,
  labels,
  limit,
  onChange,
  onAdd,
  note,
}: {
  label: string;
  ids: number[];
  labels: Record<number, string>;
  limit: number;
  onChange: (ids: number[]) => void;
  onAdd: () => void;
  note?: string;
}) {
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {label} ({ids.length}/{limit})
          </p>
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={ids.length >= limit}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {ids.length === 0 && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">None selected.</p>
      )}
      {ids.map((id, index) => (
        <div key={id} className="flex min-h-10 items-center gap-2 rounded-md border px-2 text-sm">
          <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
          <span className="min-w-0 flex-1 truncate">{labels[id] ?? `#${id}`}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => move(index, -1)}
            disabled={index === 0}
            aria-label={`Move ${labels[id] ?? id} up`}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => move(index, 1)}
            disabled={index === ids.length - 1}
            aria-label={`Move ${labels[id] ?? id} down`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onChange(ids.filter((value) => value !== id))}
            aria-label={`Remove ${labels[id] ?? id}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
