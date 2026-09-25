import { ContinueReadingItem } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpenText, Clock3, Headphones, Timer } from "lucide-react";
import { Link } from "react-router";
import CoverImage from "@/components/CoverImage";
import { formatRemainingMinutes } from "@/lib/readingTime";

interface ContinueReadingSectionProps {
  items: ContinueReadingItem[];
  isLoading: boolean;
  isError: boolean;
  /** How many rows to show before deferring to "See all". The homepage keeps
   *  this small on purpose: the rail competes with every other section above
   *  the fold, and a reader who wants the rest has the full queue one click
   *  away. */
  limit?: number;
}

const HOMEPAGE_LIMIT = 1;

const getCompletionPercentage = (progress: number) =>
  Math.round(Math.max(0, Math.min(1, progress)) * 100);

const formatLastRead = (updatedAt: string) =>
  new Date(updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const ContinueReadingSection = ({
  items,
  isLoading,
  isError,
  limit = HOMEPAGE_LIMIT,
}: ContinueReadingSectionProps) => {
  const visibleItems = items.slice(0, limit);

  return (
    <section className="rounded-sm border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <BookOpenText className="h-5 w-5 shrink-0 text-primary" />
          Continue Reading
        </h2>
        <Link
          to="/profile/reader?view=reading"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm"
        >
          See all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 1 }).map((_, index) => (
            <div key={index} className="flex animate-pulse items-center gap-4">
              <div className="aspect-[3/4] w-28 shrink-0 rounded-sm bg-muted sm:w-32" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="h-1.5 w-full rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-sm border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            We could not load your reading progress right now.
          </p>
        </div>
      )}

      {!isLoading && !isError && visibleItems.length === 0 && (
        <div className="rounded-sm border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            You do not have any in-progress stories yet.
          </p>
          <Button asChild className="mt-4">
            <Link to="/library">Start Reading</Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && visibleItems.length > 0 && (
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const progress = getCompletionPercentage(item.overall_progress);
            const remaining = formatRemainingMinutes(item.remaining_minutes);
            const continueHref = item.chapter_slug
              ? `/read/${item.story.slug}/${item.chapter_slug}`
              : `/story/${item.story.slug}`;

            return (
              <Link
                key={`${item.story.id}-${item.updated_at}`}
                to={continueHref}
                className="group flex items-center gap-4 rounded-sm p-2 transition-colors hover:bg-muted/50"
              >
                {/* Left column: title card */}
                <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-sm shadow-sm sm:w-32">
                  <CoverImage
                    src={item.story.cover_image}
                    alt={item.story.title}
                    author={item.story.author}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {item.story.story_type && (
                    <Badge className="absolute left-1 top-1 border-0 bg-black/70 px-1.5 py-0 text-[10px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      {item.story.story_type}
                    </Badge>
                  )}
                  {item.story.has_audio && (
                    <div className="absolute right-1 top-1 rounded-full bg-red-600 p-[3px] opacity-80">
                      <Headphones className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Right column: everything else */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary">
                      {item.story.title}
                    </h3>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      {progress}%
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {item.chapter_title || "Current chapter"}
                  </p>

                  {item.excerpt && (
                    <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground">
                      {item.excerpt}
                    </p>
                  )}

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {remaining && (
                      <span className="flex items-center gap-1 font-medium text-foreground/80">
                        <Timer className="h-3 w-3" />
                        {remaining}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      Last read {formatLastRead(item.updated_at)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ContinueReadingSection;
