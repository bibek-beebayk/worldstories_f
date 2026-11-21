import { Check } from "lucide-react";
import type { PassportCountry } from "@/api/types";
import { getCountryFlag } from "@/lib/countries";
import { formatStampDate } from "@/lib/passport";
import { cn } from "@/lib/utils";

export default function CountryTile({
  country,
  isSelected,
  onSelect,
  className,
}: {
  country: PassportCountry;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
}) {
  const allRead = country.explored && country.stories_completed === country.stories_available;
  const progress = country.stories_available > 0 ? (country.stories_completed / country.stories_available) * 100 : 0;
  const stampDate = formatStampDate(country.unlocked_at);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "relative min-h-32 rounded-xl border-2 p-4 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        country.explored
          ? "border-primary bg-card hover:shadow-md"
          : "border-dashed border-border bg-muted/30 hover:border-primary/60",
        isSelected && "ring-2 ring-primary ring-offset-2",
        className,
      )}
    >
      {country.explored && (
        <span className="absolute -right-1 top-2 inline-flex -rotate-[7deg] items-center gap-1 rounded-md border border-primary bg-card px-2 py-1 text-xs font-semibold text-primary shadow-sm">
          <Check className="h-3 w-3" aria-hidden="true" />
          {allRead ? "All read" : "Stamped"}
        </span>
      )}
      <div className="flex items-center gap-2 pr-16">
        <span
          aria-hidden="true"
          className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-muted px-1 text-lg leading-none"
        >
          {getCountryFlag(country.code)}
        </span>
        <span className="line-clamp-2 text-sm font-semibold">{country.name}</span>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        {country.stories_completed} of {country.stories_available} read
        {country.explored && stampDate ? <span className="hidden sm:inline"> · {stampDate}</span> : null}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} />
      </div>
    </button>
  );
}
