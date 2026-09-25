import { ContinueListeningItem } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock3, Headphones } from "lucide-react";
import { Link } from "react-router";
import CoverImage from "@/components/CoverImage";

interface ContinueListeningSectionProps {
  items: ContinueListeningItem[];
  isLoading: boolean;
  isError: boolean;
}

const getCompletionPercentage = (progress: number) =>
  Math.round(Math.max(0, Math.min(1, progress)) * 100);

const formatLastListened = (updatedAt: string) =>
  new Date(updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const ContinueListeningSection = ({
  items,
  isLoading,
  isError,
}: ContinueListeningSectionProps) => {
  const visibleItems = items.slice(0, 1);

  return (
    <section className="rounded-sm border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Headphones className="h-5 w-5 shrink-0 text-primary" />
          Continue Listening
        </h2>
        <Link
          to="/profile/reader?view=listening"
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
            We could not load your listening progress right now.
          </p>
        </div>
      )}

      {!isLoading && !isError && visibleItems.length === 0 && (
        <div className="rounded-sm border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            You do not have any in-progress audiobooks yet.
          </p>
          <Button asChild className="mt-4">
            <Link to="/library">Start Listening</Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && visibleItems.length > 0 && (
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const progress = getCompletionPercentage(item.overall_progress);
            const continueHref = item.audio_slug
              ? `/listen/${item.story.slug}/${item.audio_slug}`
              : `/read/${item.story.slug}`;

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
                  <div className="absolute right-1 top-1 rounded-full bg-red-600 p-[3px] opacity-80">
                    <Headphones className="h-2.5 w-2.5 text-white" />
                  </div>
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
                    {item.audio_title || "Current audio"}
                  </p>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Last listened {formatLastListened(item.updated_at)}
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

export default ContinueListeningSection;
