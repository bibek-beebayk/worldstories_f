import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowRight, Dices, Loader2 } from "lucide-react";
import { storyApi } from "@/api/story";
import type { Story } from "@/api/types";
import { Button } from "@/components/ui/button";
import CoverImage from "@/components/CoverImage";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { formatReadingMinutes } from "@/lib/readingTime";

const TIME_OPTIONS: Array<{ label: string; maxMinutes?: number }> = [
  { label: "Under 5 min", maxMinutes: 5 },
  { label: "Under 10 min", maxMinutes: 10 },
  { label: "Any length" },
];

/**
 * "Surprise me" — one story, picked rather than browsed.
 *
 * The whole point is a single answer, so this deliberately does not render a
 * shortlist: a grid of options is the thing the reader was trying to escape.
 * Pressing it again gives a different story, which is why the shortlist lives
 * on the server rather than being fetched once and shuffled here.
 */
const SurpriseMeCard = ({ excludeSlug }: { excludeSlug?: string }) => {
  const [maxMinutes, setMaxMinutes] = useState<number | undefined>(undefined);
  const [noneFound, setNoneFound] = useState(false);
  const [story, setStory] = useState<Story | null>(null);

  const surprise = useMutation({
    mutationFn: () => storyApi.getSurpriseStory({ exclude: excludeSlug, maxMinutes }),
    onSuccess: (response) => {
      setStory(response.story);
      setNoneFound(response.story === null);
    },
  });

  const roll = () => {
    trackAnalyticsEvent({
      event_type: "surprise_me_clicked",
      metadata: { max_minutes: maxMinutes ?? null },
    });
    surprise.mutate();
  };

  const readingTime = formatReadingMinutes(story?.reading_time_minutes);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
        <Dices className="h-3.5 w-3.5" />
        <span>Surprise Me</span>
      </div>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Not sure what to read? Let us pick one.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Reading time">
        {TIME_OPTIONS.map((option) => {
          const isActive = maxMinutes === option.maxMinutes;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => setMaxMinutes(option.maxMinutes)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <Button onClick={roll} disabled={surprise.isPending} className="mt-4">
        {surprise.isPending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Dices className="mr-1.5 h-4 w-4" />
        )}
        {story ? "Try another" : "Surprise me"}
      </Button>

      {surprise.isError && (
        <p className="mt-3 text-sm text-muted-foreground">
          We could not pick a story just now. Try again?
        </p>
      )}

      {/* An unmeetable time budget is answered honestly. Handing back something
          twice as long would break the only promise this control makes. */}
      {noneFound && !surprise.isPending && (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing that short yet — try a longer reading time.
        </p>
      )}

      {story && !noneFound && (
        <article className="mt-4 flex gap-4 rounded-lg border border-border/70 bg-background/70 p-3">
          <Link to={`/story/${story.slug}`} className="w-20 shrink-0" aria-hidden="true" tabIndex={-1}>
            <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
              <CoverImage
                src={story.cover_image}
                alt=""
                author={story.author}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">
              <Link to={`/story/${story.slug}`} className="hover:text-primary">
                {story.title}
              </Link>
            </h3>
            {story.author && (
              <p className="mt-0.5 text-xs text-muted-foreground">{story.author}</p>
            )}
            {readingTime && (
              <p className="mt-1 text-xs text-muted-foreground">{readingTime}</p>
            )}
            <Link
              to={`/story/${story.slug}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open story
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </article>
      )}
    </section>
  );
};

export default SurpriseMeCard;
