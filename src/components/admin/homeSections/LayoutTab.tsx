import { Minus, Plus } from "lucide-react";
import type {
  AdminHomeSectionPreviewPayload,
  HomeSectionDisplay,
  HomeSectionLayout,
  HomeSectionTypesMeta,
} from "@/api/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { normalizeDisplay } from "@/lib/homeDisplay";
import { CardStylePicker } from "./CardStylePicker";
import { LayoutPicker } from "./LayoutPicker";
import { SectionLivePreview } from "./SectionLivePreview";
import { SettingGroup } from "./controls";
import type { HomeSectionEditorDraft as Draft } from "./types";

const Stepper = ({
  id,
  label,
  value,
  min,
  max,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-xs font-medium text-foreground">
      {label}
    </label>
    <div className="inline-flex items-center gap-1 rounded-md border bg-background p-0.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isNaN(parsed)) onChange(Math.max(min, Math.min(max, parsed)));
        }}
        className="w-10 bg-transparent text-center text-sm font-medium tabular-nums focus:outline-none disabled:opacity-50"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  </div>
);

function columnsDisabledReason(layout: HomeSectionLayout): string | null {
  if (layout === "covers") return "Columns are disabled: Cover-only shelf uses fixed cover widths.";
  if (layout === "list") return "Columns are disabled: List always uses 1 column on phones and 2 on desktop.";
  if (layout === "trending") return "Columns are disabled: Ranked list always renders as a single numbered list.";
  return null;
}

interface CardToggleRowProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CardToggleRow = ({ id, label, hint, checked, onChange }: CardToggleRowProps) => (
  <div className="flex items-start justify-between gap-4 py-1">
    <div className="space-y-0.5">
      <label htmlFor={id} className="cursor-pointer text-sm font-medium text-foreground">
        {label}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>
);

interface LayoutTabProps {
  draft: Draft;
  meta: HomeSectionTypesMeta;
  previewPayload: AdminHomeSectionPreviewPayload | null;
  validationError: string | null;
  fieldErrors: Record<string, string>;
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onDisplayChange: (patch: Partial<HomeSectionDisplay>) => void;
}

export function LayoutTab({
  draft,
  meta,
  previewPayload,
  validationError,
  fieldErrors,
  onChange,
  onDisplayChange,
}: LayoutTabProps) {
  const typeMeta = meta.types.find((t) => t.value === draft.section_type);
  const layoutOptions = typeMeta?.layouts ?? [];
  const cardStyleOptions = typeMeta?.card_styles ?? [];
  const display = normalizeDisplay(draft.display);
  const columnsReason = columnsDisabledReason(draft.layout);
  const columnsDisabled = columnsReason !== null;

  const isStorySection = draft.section_type === "stories_query" || draft.section_type === "stories_manual";
  const isVideoSection = draft.section_type === "videos";
  const isBlogSection = draft.section_type === "blogs";

  if (!typeMeta?.content) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        This section type uses a fixed layout and has no card style settings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <SectionLivePreview
        draft={draft}
        meta={meta}
        previewPayload={previewPayload}
        validationError={validationError}
        title="Live layout preview"
        note="Updates immediately when you change layout, card style, card details, columns, or item limit."
      />

      <SettingGroup title="Layout">
        <LayoutPicker value={draft.layout} options={layoutOptions} onChange={(next) => onChange("layout", next)} />
        {fieldErrors.layout && <p className="text-xs text-destructive">{fieldErrors.layout}</p>}
      </SettingGroup>

      <SettingGroup title="Card style">
        <CardStylePicker
          value={draft.card_style}
          layout={draft.layout}
          options={cardStyleOptions}
          onChange={(next) => onChange("card_style", next)}
        />
        {fieldErrors.card_style && <p className="text-xs text-destructive">{fieldErrors.card_style}</p>}
      </SettingGroup>

      <SettingGroup title="Show on each card">
        <div className="divide-y">
          {(isStorySection || isVideoSection) && (
            <CardToggleRow
              id="card-show-author"
              label="Author"
              checked={display.show_author}
              onChange={(checked) => onDisplayChange({ show_author: checked })}
            />
          )}
          {isStorySection && (
            <CardToggleRow
              id="card-show-rating"
              label="Rating"
              checked={display.show_rating}
              onChange={(checked) => onDisplayChange({ show_rating: checked })}
            />
          )}
          {(isStorySection || isBlogSection) && (
            <CardToggleRow
              id="card-show-reading-time"
              label="Reading time"
              checked={display.show_reading_time}
              onChange={(checked) => onDisplayChange({ show_reading_time: checked })}
            />
          )}
          {isStorySection && (
            <CardToggleRow
              id="card-show-badges"
              label="New and Original badges"
              checked={display.show_badges}
              onChange={(checked) => onDisplayChange({ show_badges: checked })}
            />
          )}
          {isStorySection && (
            <CardToggleRow
              id="card-show-summary"
              label="Summary line"
              hint="Shown in List, Horizontal, Featured and Bento layouts."
              checked={display.show_summary}
              onChange={(checked) => onDisplayChange({ show_summary: checked })}
            />
          )}
        </div>
      </SettingGroup>

      <SettingGroup title="Size and spacing" note={columnsReason ?? undefined}>
        <div className="flex flex-wrap gap-6">
          <Stepper
            id="section-cols-mobile"
            label="Columns on phone"
            value={draft.columns_mobile}
            min={1}
            max={3}
            disabled={columnsDisabled}
            onChange={(next) => onChange("columns_mobile", next)}
          />
          <Stepper
            id="section-cols-desktop"
            label="Columns on desktop"
            value={draft.columns_desktop}
            min={2}
            max={6}
            disabled={columnsDisabled}
            onChange={(next) => onChange("columns_desktop", next)}
          />
          <Stepper
            id="section-item-limit"
            label="Items to show"
            value={draft.item_limit}
            min={1}
            max={24}
            onChange={(next) => onChange("item_limit", next)}
          />
        </div>
        {(fieldErrors.columns_mobile || fieldErrors.columns_desktop || fieldErrors.item_limit) && (
          <p className="text-xs text-destructive">
            {fieldErrors.columns_mobile || fieldErrors.columns_desktop || fieldErrors.item_limit}
          </p>
        )}
      </SettingGroup>
    </div>
  );
}
