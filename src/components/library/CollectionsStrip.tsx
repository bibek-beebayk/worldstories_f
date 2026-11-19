import type { LibraryCollection } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
      <Carousel opts={{ align: "start", containScroll: "trimSnaps", slidesToScroll: "auto" }} className="-mx-3 sm:mx-0">
        <div className="fade-x">
          <CarouselContent className="-ml-3 pl-6 pb-2">
            {isLoading &&
              [0, 1, 2, 3, 4, 5].map((key) => (
                <CarouselItem key={key} className="basis-auto pl-3">
                  <div className="h-[140px] w-40 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
                </CarouselItem>
              ))}
            {collections?.map((collection, index) => (
              <CarouselItem key={collection.key} className={`basis-auto pl-3 ${index === collections.length - 1 ? "pr-6" : ""}`}>
                <button
                  type="button"
                  onClick={() => onSelect(collection)}
                  className="group w-40 rounded-lg border bg-card p-2 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <Collage covers={collection.covers} label={collection.label} />
                  <p className="mt-2 line-clamp-1 text-sm font-semibold group-hover:text-primary" title={collection.label}>
                    {collection.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {collection.count.toLocaleString()} {collection.count === 1 ? "story" : "stories"}
                  </p>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
        <CarouselPrevious aria-label="Scroll collections left" className="left-1 top-[42%] hidden disabled:invisible sm:flex" />
        <CarouselNext aria-label="Scroll collections right" className="right-1 top-[42%] hidden disabled:invisible sm:flex" />
      </Carousel>
    </section>
  );
};

export default CollectionsStrip;
