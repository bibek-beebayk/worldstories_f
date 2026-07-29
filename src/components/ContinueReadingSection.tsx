import { ContinueReadingItem } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpenText, Clock3, Headphones } from "lucide-react";
import { Link } from "react-router-dom";

interface ContinueReadingSectionProps {
  items: ContinueReadingItem[];
  isLoading: boolean;
  isError: boolean;
}

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
}: ContinueReadingSectionProps) => {
  const visibleItems = items.slice(0, 10);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <BookOpenText className="h-3.5 w-3.5" />
            <span>Continue Reading</span>
          </div>
          {/* <p className="text-xs text-muted-foreground sm:text-sm">
            Pick up where you left off. Stories are ordered by your latest reading activity.
          </p> */}
        </div>
      </div>

      {isLoading && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="w-[180px] shrink-0 animate-pulse rounded-xl border border-border/60 bg-background/70 p-4"
            >
              <div className="mb-4 aspect-[3/4] rounded-lg bg-muted" />
              <div className="mb-2 h-4 rounded bg-muted" />
              <div className="mb-4 h-3 w-2/3 rounded bg-muted" />
              <div className="h-2 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            We could not load your reading progress right now.
          </p>
        </div>
      )}

      {!isLoading && !isError && visibleItems.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            You do not have any in-progress stories yet.
          </p>
          <Button asChild className="mt-4">
            <Link to="/library">Start Reading</Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && visibleItems.length > 0 && (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 sm:gap-4">
          {visibleItems.map((item) => {
            const progress = getCompletionPercentage(item.overall_progress);
            const continueHref = item.chapter_slug
              ? `/read/${item.story.slug}/${item.chapter_slug}`
              : `/story/${item.story.slug}`;

            return (
              <article
                key={`${item.story.id}-${item.updated_at}`}
                className="w-[170px] shrink-0 rounded-lg border border-border/70 bg-background/70 p-3 sm:w-[185px]"
              >
                <Link to={continueHref} className="group block">
                  <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-muted shadow-sm">
                    <img
                      src={item.story.cover_image}
                      alt={item.story.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {item.story.story_type && (
                      <Badge className="absolute left-2 top-2 border-0 bg-black/70 px-1.5 py-0 text-[10px] text-white">
                        {item.story.story_type}
                      </Badge>
                    )}
                    {item.story.has_audio && (
                      <div className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-[3px] opacity-80">
                        <Headphones className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                </Link>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={continueHref} className="group/title">
                        <h3 className="line-clamp-2 text-xs font-semibold transition-colors group-hover/title:text-primary">
                          {item.story.title}
                        </h3>
                      </Link>
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                        {item.chapter_title || "Current chapter"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      {progress}%
                    </span>
                  </div>

                  <div>
                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      <span>Last read {formatLastRead(item.updated_at)}</span>
                    </div>
                  </div>

                  <Link
                    to={continueHref}
                    className="inline-flex text-xs font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Continue reading
                  </Link>
                </div>
              </article>
            );
          })}

          <Link
            to="/profile?section=reader&view=reading"
            className="flex w-[170px] shrink-0 flex-col justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/50 hover:bg-primary/10 sm:w-[185px]"
          >
            <div>
              <div className="mb-3 inline-flex rounded-full border border-primary/20 bg-background/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                Show All
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                View your full reading queue
              </h3>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                Open the reader section to see all in-progress stories and continue where you left off.
              </p>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">
              <span>Open reader section</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>
      )}
    </section>
  );
};

export default ContinueReadingSection;
