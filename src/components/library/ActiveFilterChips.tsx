import { X } from "lucide-react";
import type { LibraryFacets } from "@/api/types";
import { getLanguageLabel } from "@/lib/languages";
import type { LibraryFilters } from "@/lib/libraryParams";

interface NamedTaxon {
  id: number;
  slug: string;
  name: string;
}

export interface FilterChip {
  key: string;
  label: string;
  remove: Partial<LibraryFilters>;
}

const LENGTH_LABELS: Record<string, string> = {
  under_10: "Under 10 min",
  "10_60": "10–60 min",
  "1_5h": "1–5 hours",
  "5h_plus": "5+ hours",
};

/** One chip per active filter value, labelled from the facet lists (a slug or an old numeric id both resolve). */
export function buildFilterChips(
  filters: LibraryFilters,
  facets: LibraryFacets | undefined,
  authorName?: string,
  /** Full taxonomy lists, so a chip is still named when the current filters leave its facet at zero. */
  names: { genres?: NamedTaxon[]; categories?: NamedTaxon[] } = {}
): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const token of filters.genre) {
    const match =
      facets?.genres.find((genre) => genre.slug === token || String(genre.id) === token) ??
      names.genres?.find((genre) => genre.slug === token || String(genre.id) === token);
    chips.push({ key: `genre:${token}`, label: match?.name ?? token, remove: { genre: filters.genre.filter((value) => value !== token) } });
  }
  for (const token of filters.category) {
    const match =
      facets?.categories.find((category) => category.slug === token || String(category.id) === token) ??
      names.categories?.find((category) => category.slug === token || String(category.id) === token);
    chips.push({ key: `category:${token}`, label: match?.name ?? token, remove: { category: filters.category.filter((value) => value !== token) } });
  }
  if (filters.language) chips.push({ key: "language", label: getLanguageLabel(filters.language), remove: { language: "" } });
  if (filters.length) chips.push({ key: "length", label: LENGTH_LABELS[filters.length] ?? filters.length, remove: { length: "" } });
  if (filters.country) {
    chips.push({
      key: "country",
      label: facets?.countries.find((country) => country.value === filters.country)?.label ?? filters.country,
      remove: { country: "" },
    });
  }
  if (filters.type) {
    chips.push({
      key: "type",
      label: facets?.types.find((type) => String(type.id) === filters.type)?.name ?? "Story type",
      remove: { type: "" },
    });
  }
  if (filters.status) chips.push({ key: "status", label: filters.status === "completed" ? "Completed" : "Ongoing", remove: { status: "" } });
  if (filters.original) chips.push({ key: "original", label: "Originals", remove: { original: false } });
  for (const slug of filters.mood) {
    chips.push({
      key: `mood:${slug}`,
      label: facets?.moods.find((mood) => mood.slug === slug)?.name ?? slug,
      remove: { mood: filters.mood.filter((value) => value !== slug) },
    });
  }
  if (filters.author) chips.push({ key: "author", label: authorName ? `By ${authorName}` : "Author", remove: { author: "" } });
  return chips;
}

/** Removable chips for every active filter, with "Clear all". */
const ActiveFilterChips = ({
  chips,
  onRemove,
  onClearAll,
}: {
  chips: FilterChip[];
  onRemove: (chip: FilterChip) => void;
  onClearAll: () => void;
}) => {
  if (chips.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 py-1 pl-3 pr-1.5 text-xs font-medium">
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip)}
            aria-label={`Remove ${chip.label} filter`}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClearAll} className="text-xs font-medium text-primary hover:underline">
        Clear all
      </button>
    </div>
  );
};

export default ActiveFilterChips;
