import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Story } from "@/api/types";
import { ArrowRight, Clock3, Headphones, Zap } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import AuthGatedLink from "@/components/AuthGatedLink";
import { availableTimeBuckets, filterByTimeBucket } from "@/lib/quickReadTime";

interface QuickReadSectionProps {
  stories: Story[];
}

// Homepage entry point into Quick Read — not personalized: any published
// story with a summary is eligible, so (unlike Continue Reading) this
// renders nothing at all rather than an empty-state message when there's
// nothing to show yet.
const QuickReadSection = ({ stories }: QuickReadSectionProps) => {
  const [timeBucket, setTimeBucket] = useState<string | null>(null);
  const buckets = useMemo(() => availableTimeBuckets(stories), [stories]);
  const visibleStories = useMemo(
    () => filterByTimeBucket(stories, timeBucket).slice(0, 6),
    [stories, timeBucket]
  );

  if (stories.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
          <Zap className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
          Quick Reads
        </h2>
        <Link
          to="/quick-reads"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm"
        >
          See all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Time-intent navigation (§3.4), filtering the rail already on the page
          rather than fetching again — every card carries its own
          summary_reading_minutes. Buckets with nothing behind them are not
          offered at all. */}
      {buckets.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-sm border border-primary/20 bg-primary/5 px-3 py-2.5">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary">
            <Clock3 className="h-4 w-4" />
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
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-primary/30 bg-background text-foreground hover:border-primary hover:bg-primary/10"
                  }`}
                >
                  {bucket.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {visibleStories.map((story) => (
          <AuthGatedLink
            key={story.id}
            to={`/quick-read/${story.slug}`}
            className="group relative z-0 block cursor-pointer transition-transform duration-300 ease-out hover:z-20 hover:scale-105"
          >
            <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-sm shadow-md group-hover:shadow-2xl">
              <CoverImage
                src={story.cover_image}
                alt={story.title}
                author={story.author}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              {story.has_audio && (
                <div className="absolute right-2 top-2 rounded-full bg-red-600 p-1 opacity-0 transition-opacity duration-200 group-hover:opacity-90">
                  <Headphones className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            <h3 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary">
              {story.title}
            </h3>
          </AuthGatedLink>
        ))}
      </div>
    </section>
  );
};

export default QuickReadSection;
