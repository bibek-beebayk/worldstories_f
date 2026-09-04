import { useMemo, useState } from "react";
import { Story } from "@/api/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ArrowRight, Clock3, Headphones, Zap } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import AuthGatedLink from "@/components/AuthGatedLink";
import { availableTimeBuckets, filterByTimeBucket } from "@/lib/quickReadTime";

interface QuickReadSectionProps {
  stories: Story[];
}

// Homepage entry point into Quick Read — same carousel-of-cards shape as
// ContinueReadingSection, but not personalized: any published story with a
// summary is eligible, so (unlike Continue Reading) this renders nothing at
// all rather than an empty-state message when there's nothing to show yet.
const QuickReadSection = ({ stories }: QuickReadSectionProps) => {
  const [timeBucket, setTimeBucket] = useState<string | null>(null);
  const buckets = useMemo(() => availableTimeBuckets(stories), [stories]);
  const visibleStories = useMemo(
    () => filterByTimeBucket(stories, timeBucket),
    [stories, timeBucket]
  );

  if (stories.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            <span>Quick Read</span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Short summaries for when you're short on time.
          </p>
        </div>
      </div>

      {/* Time-intent navigation (§3.4), filtering the rail already on the page
          rather than fetching again — every card carries its own
          summary_reading_minutes. Buckets with nothing behind them are not
          offered at all. */}
      {buckets.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            How much time do you have?
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by reading time">
            {buckets.map((bucket) => {
              const isActive = timeBucket === bucket.key;
              return (
                <button
                  key={bucket.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setTimeBucket(isActive ? null : bucket.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {bucket.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Carousel opts={{ align: "start" }} className="px-1">
        <CarouselContent>
          {visibleStories.map((story) => (
            <CarouselItem key={story.id} className="basis-[170px] sm:basis-[185px]">
              <article className="h-full rounded-lg border border-border/70 bg-background/70 p-3">
                <AuthGatedLink to={`/quick-read/${story.slug}`} className="group block w-full text-left">
                  <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-muted shadow-sm">
                    <CoverImage
                      src={story.cover_image}
                      alt={story.title}
                      author={story.author}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {story.has_audio && (
                      <div className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-[3px] opacity-80">
                        <Headphones className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                </AuthGatedLink>

                <div className="space-y-2">
                  <AuthGatedLink to={`/quick-read/${story.slug}`} className="group/title block w-full text-left">
                    <h3 className="line-clamp-2 text-xs font-semibold transition-colors group-hover/title:text-primary">
                      {story.title}
                    </h3>
                  </AuthGatedLink>
                  {story.author && (
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">by {story.author}</p>
                  )}
                  {story.summary_reading_minutes != null && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      <span>{story.summary_reading_minutes} min read</span>
                    </div>
                  )}

                  <AuthGatedLink
                    to={`/quick-read/${story.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    <Zap className="h-3 w-3" />
                    Quick Read
                  </AuthGatedLink>
                </div>
              </article>
            </CarouselItem>
          ))}

          <CarouselItem className="basis-[170px] sm:basis-[185px]">
            <AuthGatedLink
              to="/quick-reads"
              className="flex h-full min-h-[220px] w-full flex-col justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
            >
              <div>
                <div className="mb-3 inline-flex rounded-full border border-primary/20 bg-background/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                  Show All
                </div>
                <h3 className="text-sm font-semibold text-foreground">Browse all Quick Reads</h3>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  See every story with a summary available on WorldStories.
                </p>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">
                <span>Open Quick Reads</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </AuthGatedLink>
          </CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
};

export default QuickReadSection;
