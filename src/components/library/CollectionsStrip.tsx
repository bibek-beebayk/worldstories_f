import type { LibraryCollection } from "@/api/types";
import CoverImage from "@/components/CoverImage";

const Collage = ({ covers, label }: { covers: string[]; label: string }) => {
  // Three overlapping covers; a missing one falls back to the generated
  // placeholder CoverImage draws, so a tile never has a hole.
  const slots = [0, 1, 2];
  return (
    <div className="relative h-24 w-full overflow-hidden rounded-md bg-muted" aria-hidden="true">
      {slots.map((slot) => (
        <div
          key={slot}
          className="absolute top-2 h-20 w-14 overflow-hidden rounded-sm shadow-md ring-2 ring-background"
          style={{ left: `${8 + slot * 26}%`, zIndex: slots.length - slot, transform: `rotate(${(slot - 1) * 5}deg)` }}
        >
          <CoverImage src={covers[slot]} alt="" title={label} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
};

/**
 * A scrolling row of curated starting points. A tile applies its filter in
 * place (the parent updates the URL); nothing navigates away.
 */
const CollectionsStrip = ({
  collections,
  isLoading,
  onSelect,
}: {
  collections: LibraryCollection[] | undefined;
  isLoading: boolean;
  onSelect: (collection: LibraryCollection) => void;
}) => {
  if (!isLoading && (collections?.length ?? 0) === 0) return null;
  return (
    <section aria-label="Collections" className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Collections</h2>
      <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
        {isLoading &&
          [0, 1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="h-[140px] w-40 shrink-0 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
          ))}
        {collections?.map((collection) => (
          <button
            key={collection.key}
            type="button"
            onClick={() => onSelect(collection)}
            className="group w-40 shrink-0 snap-start rounded-lg border bg-card p-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <Collage covers={collection.covers} label={collection.label} />
            <p className="mt-2 line-clamp-1 text-sm font-semibold group-hover:text-primary">{collection.label}</p>
            <p className="text-xs text-muted-foreground">
              {collection.count.toLocaleString()} {collection.count === 1 ? "story" : "stories"}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CollectionsStrip;
