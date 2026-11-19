import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { LibraryFacets } from "@/api/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getLanguageLabel } from "@/lib/languages";
import type { LibraryFilters } from "@/lib/libraryParams";

const VISIBLE_OPTIONS = 8;

const FacetGroup = ({
  title,
  activeCount = 0,
  defaultOpen = true,
  children,
}: {
  title: string;
  activeCount?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) => (
  <Collapsible defaultOpen={defaultOpen || activeCount > 0} className="border-b py-3 last:border-b-0">
    <CollapsibleTrigger className="group flex w-full items-center justify-between text-left text-sm font-semibold">
      <span>
        {title}
        {activeCount > 0 && (
          <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">{activeCount}</span>
        )}
      </span>
      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-2 space-y-1">{children}</CollapsibleContent>
  </Collapsible>
);

interface Option {
  key: string;
  label: string;
  count: number;
  checked: boolean;
}

/** A list of checkbox-style options; shows the first few and a "Show all". */
const OptionList = ({ options, onToggle, kind = "checkbox" }: { options: Option[]; onToggle: (key: string) => void; kind?: "checkbox" | "radio" }) => {
  const [expanded, setExpanded] = useState(false);
  // An option nobody can reach adds noise; keep zero-count ones only while selected.
  const usable = options.filter((option) => option.count > 0 || option.checked);
  if (usable.length === 0) return <p className="text-xs text-muted-foreground">Nothing matches the other filters.</p>;
  const shown = expanded ? usable : usable.slice(0, VISIBLE_OPTIONS);
  return (
    <>
      {shown.map((option) => (
        <label key={option.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/60">
          {kind === "checkbox" ? (
            <Checkbox checked={option.checked} onCheckedChange={() => onToggle(option.key)} />
          ) : (
            <input
              type="radio"
              name={`facet-${options[0]?.key}`}
              checked={option.checked}
              onChange={() => undefined}
              onClick={() => onToggle(option.key)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
          )}
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
          <span className="text-xs text-muted-foreground">{option.count.toLocaleString()}</span>
        </label>
      ))}
      {usable.length > VISIBLE_OPTIONS && (
        <button type="button" onClick={() => setExpanded((open) => !open)} className="px-1 text-xs font-medium text-primary hover:underline">
          {expanded ? "Show fewer" : `Show all ${usable.length}`}
        </button>
      )}
    </>
  );
};

const toggleIn = (list: string[], matches: string[], add: string) =>
  list.some((token) => matches.includes(token)) ? list.filter((token) => !matches.includes(token)) : [...list, add];

/**
 * The Library's facets — genre, category, language, length, country, story type,
 * status, originals and mood — each with a count that already reflects every
 * other active filter. The same panel is the desktop sidebar and the body of the
 * mobile bottom sheet; the parent decides when changes take effect.
 */
const FilterPanel = ({
  filters,
  facets,
  onChange,
}: {
  filters: LibraryFilters;
  facets: LibraryFacets | undefined;
  onChange: (patch: Partial<LibraryFilters>) => void;
}) => {
  if (!facets) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading filters">
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  const single = (current: string, value: string) => (current === value ? "" : value);

  return (
    <div>
      <FacetGroup title="Genre" activeCount={filters.genre.length}>
        <OptionList
          options={facets.genres.map((genre) => ({
            key: genre.slug,
            label: genre.name,
            count: genre.count,
            checked: filters.genre.some((token) => token === genre.slug || token === String(genre.id)),
          }))}
          onToggle={(slug) => {
            const genre = facets.genres.find((row) => row.slug === slug);
            onChange({ genre: toggleIn(filters.genre, [slug, String(genre?.id ?? "")], slug) });
          }}
        />
      </FacetGroup>

      <FacetGroup title="Category" activeCount={filters.category.length} defaultOpen={false}>
        <OptionList
          options={facets.categories.map((category) => ({
            key: category.slug,
            label: category.name,
            count: category.count,
            checked: filters.category.some((token) => token === category.slug || token === String(category.id)),
          }))}
          onToggle={(slug) => {
            const category = facets.categories.find((row) => row.slug === slug);
            onChange({ category: toggleIn(filters.category, [slug, String(category?.id ?? "")], slug) });
          }}
        />
      </FacetGroup>

      <FacetGroup title="Language" activeCount={filters.language ? 1 : 0}>
        <OptionList
          kind="radio"
          options={facets.languages.map((language) => ({
            key: language.value,
            label: getLanguageLabel(language.value),
            count: language.count,
            checked: filters.language === language.value,
          }))}
          onToggle={(code) => onChange({ language: single(filters.language, code) })}
        />
      </FacetGroup>

      <FacetGroup title="Length" activeCount={filters.length ? 1 : 0}>
        <OptionList
          kind="radio"
          options={facets.lengths.map((length) => ({
            key: length.value,
            label: length.label,
            count: length.count,
            checked: filters.length === length.value,
          }))}
          onToggle={(value) => onChange({ length: single(filters.length, value) as LibraryFilters["length"] })}
        />
      </FacetGroup>

      <FacetGroup title="Country of origin" activeCount={filters.country ? 1 : 0} defaultOpen={false}>
        <OptionList
          kind="radio"
          options={facets.countries.map((country) => ({
            key: country.value,
            label: country.label,
            count: country.count,
            checked: filters.country === country.value,
          }))}
          onToggle={(code) => onChange({ country: single(filters.country, code) })}
        />
      </FacetGroup>

      <FacetGroup title="Story type" activeCount={filters.type ? 1 : 0} defaultOpen={false}>
        <OptionList
          kind="radio"
          options={facets.types.map((type) => ({
            key: String(type.id),
            label: type.name,
            count: type.count,
            checked: filters.type === String(type.id),
          }))}
          onToggle={(id) => onChange({ type: single(filters.type, id) })}
        />
      </FacetGroup>

      <FacetGroup title="Completed / Ongoing" activeCount={filters.status ? 1 : 0} defaultOpen={false}>
        <OptionList
          kind="radio"
          options={facets.statuses.map((status) => ({
            key: status.value,
            label: status.label,
            count: status.count,
            checked: filters.status === status.value,
          }))}
          onToggle={(value) => onChange({ status: single(filters.status, value) as LibraryFilters["status"] })}
        />
      </FacetGroup>

      {facets.moods.length > 0 && (
        <FacetGroup title="Mood" activeCount={filters.mood.length} defaultOpen={filters.mood.length > 0}>
          <OptionList
            options={facets.moods.map((mood) => ({
              key: mood.slug,
              label: mood.name,
              count: mood.count,
              checked: filters.mood.includes(mood.slug),
            }))}
            onToggle={(slug) => onChange({ mood: toggleIn(filters.mood, [slug], slug) })}
          />
        </FacetGroup>
      )}

      <div className="py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Checkbox checked={filters.original} onCheckedChange={(checked) => onChange({ original: checked === true })} />
          <span className="flex-1">WorldStories Originals only</span>
          <span className="text-xs font-normal text-muted-foreground">{facets.originals.count.toLocaleString()}</span>
        </label>
      </div>
    </div>
  );
};

export default FilterPanel;
