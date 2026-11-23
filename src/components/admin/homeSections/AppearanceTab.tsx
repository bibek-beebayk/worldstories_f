import type { KeyboardEvent } from "react";
import { Check } from "lucide-react";
import type {
  AdminHomeSectionPreviewPayload,
  HomeSectionDisplay,
  HomeSectionDisplayBackground,
  HomeSectionHeadingAlign,
  HomeSectionSpacing,
  HomeSectionTypesMeta,
  HomeSectionWidth,
} from "@/api/types";
import { Switch } from "@/components/ui/switch";
import { normalizeDisplay } from "@/lib/homeDisplay";
import { SectionLivePreview } from "./SectionLivePreview";
import { SettingGroup } from "./controls";
import type { HomeSectionEditorDraft as Draft } from "./types";

const BACKGROUND_SWATCHES: Array<{
  value: HomeSectionDisplayBackground;
  label: string;
  swatchClass: string;
  checkClass: string;
}> = [
  { value: "none", label: "None", swatchClass: "bg-background border-dashed", checkClass: "text-primary" },
  { value: "tint", label: "Tint", swatchClass: "bg-muted/70", checkClass: "text-foreground" },
  { value: "dark", label: "Dark", swatchClass: "bg-[hsl(var(--hero-dark))]", checkClass: "text-white" },
  {
    value: "brand",
    label: "Brand",
    swatchClass: "bg-[color-mix(in_srgb,hsl(var(--primary))_72%,black)]",
    checkClass: "text-white",
  },
];

const ALIGN_OPTIONS: Array<{ value: HomeSectionHeadingAlign; label: string }> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
];

const SPACING_OPTIONS: Array<{ value: HomeSectionSpacing; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "roomy", label: "Roomy" },
];

const WIDTH_OPTIONS: Array<{ value: HomeSectionWidth; label: string }> = [
  { value: "contained", label: "Contained" },
  { value: "full", label: "Full width" },
];

function RadioRow<T extends string>({
  label,
  value,
  options,
  disabled = false,
  note,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  disabled?: boolean;
  note?: string;
  onChange: (next: T) => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (current + delta + buttons.length) % buttons.length;
    onChange(options[next].value);
    buttons[next].focus();
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
        className={`inline-flex flex-wrap rounded-md border p-1 ${disabled ? "opacity-50" : ""}`}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={disabled}
              tabIndex={checked && !disabled ? 0 : -1}
              onClick={() => !disabled && onChange(option.value)}
              className={`min-h-9 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                checked ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

interface AppearanceTabProps {
  draft: Draft;
  meta: HomeSectionTypesMeta;
  previewPayload: AdminHomeSectionPreviewPayload | null;
  validationError: string | null;
  fieldError?: string;
  onDisplayChange: (patch: Partial<HomeSectionDisplay>) => void;
}

export function AppearanceTab({
  draft,
  meta,
  previewPayload,
  validationError,
  fieldError,
  onDisplayChange,
}: AppearanceTabProps) {
  const display = normalizeDisplay(draft.display);
  const widthDisabled = display.background === "none";

  const handleBackgroundKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (current + delta + buttons.length) % buttons.length;
    onDisplayChange({ background: BACKGROUND_SWATCHES[next].value });
    buttons[next].focus();
  };

  return (
    <div className="space-y-4">
      <SectionLivePreview
        draft={draft}
        meta={meta}
        previewPayload={previewPayload}
        validationError={validationError}
        title="Live appearance preview"
        note="Shows background surface, alignment, spacing, and title visibility."
      />

      <SettingGroup title="Background">
        <div
          role="radiogroup"
          aria-label="Section background"
          onKeyDown={handleBackgroundKeyDown}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {BACKGROUND_SWATCHES.map((swatch) => {
            const checked = display.background === swatch.value;
            return (
              <button
                key={swatch.value}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => onDisplayChange({ background: swatch.value })}
                className={`flex flex-col items-center gap-2 rounded-lg border p-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  checked ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                }`}
              >
                <span
                  className={`flex h-10 w-full items-center justify-center rounded-md border ${swatch.swatchClass}`}
                  aria-hidden="true"
                >
                  {checked && <Check className={`h-4 w-4 ${swatch.checkClass}`} />}
                </span>
                <span className="text-xs font-medium text-foreground">{swatch.label}</span>
              </button>
            );
          })}
        </div>
        {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      </SettingGroup>

      <SettingGroup title="Heading and framing">
        <div className="flex flex-wrap gap-6">
          <RadioRow
            label="Heading alignment"
            value={display.heading_align}
            options={ALIGN_OPTIONS}
            onChange={(heading_align) => onDisplayChange({ heading_align })}
          />
          <RadioRow
            label="Spacing"
            value={display.spacing}
            options={SPACING_OPTIONS}
            onChange={(spacing) => onDisplayChange({ spacing })}
          />
          <RadioRow
            label="Width"
            value={display.width}
            options={WIDTH_OPTIONS}
            disabled={widthDisabled}
            note={widthDisabled ? "Only visible with a background." : undefined}
            onChange={(width) => onDisplayChange({ width })}
          />
        </div>

        <div className="flex items-start justify-between gap-4 border-t pt-4">
          <div className="space-y-0.5">
            <label htmlFor="section-hide-title" className="cursor-pointer text-sm font-medium text-foreground">
              Hide the title
            </label>
            <p className="text-xs text-muted-foreground">
              Useful for banners and shelves. The title stays available to screen readers.
            </p>
          </div>
          <Switch
            id="section-hide-title"
            checked={display.hide_title}
            onCheckedChange={(hide_title) => onDisplayChange({ hide_title })}
          />
        </div>
      </SettingGroup>
    </div>
  );
}
