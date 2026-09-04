import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock3, Flame } from "lucide-react";
import { Link } from "react-router";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import CoverImage from "@/components/CoverImage";
import StoryCard from "@/components/StoryCard";
import { formatReadingMinutes } from "@/lib/readingTime";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { authApi } from "@/api/auth";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

/**
 * What a reader sees at the end of a story.
 *
 * The point is that finishing should not be a dead end: one clear next story,
 * then themed ways to keep going. Everything here comes from one API call
 * whose ranking is the same "Because you finished" path the rail already used
 * — not a second recommendation system that could disagree with it.
 *
 * Renders for signed-out readers too. They get the generic similarity ranking
 * instead of a personalized one, which is the honest answer rather than an
 * empty panel or a prompt to sign in.
 */
const StoryCompletionScreen = ({
  storySlug,
  storyTitle,
}: {
  storySlug: string;
  storyTitle: string;
}) => {
  const isLoggedIn = useIsLoggedIn();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["story-completion", storySlug],
    queryFn: () => storyApi.getStoryCompletion(storySlug),
    enabled: Boolean(storySlug),
  });
  const { data: streak } = useQuery({
    queryKey: ["reading-streak"],
    queryFn: authApi.getReadingStreak,
    enabled: isLoggedIn,
  });

  const primary = data?.primary ?? null;
  const primaryReadingTime = formatReadingMinutes(primary?.reading_time_minutes);

  // The story just finished is the subject: "after finishing X, they went on
  // to Y". Recording it the other way round would make the funnel unreadable.
  const trackNextStoryClick = (nextSlug: string, placement: string) => {
    trackAnalyticsEvent({
      event_type: "next_story_clicked",
      story_slug: storySlug,
      metadata: { next_story_slug: nextSlug, placement },
    });
  };

  return (
    <section
      className="rounded-2xl border bg-primary/5 p-5 sm:p-6"
      aria-labelledby="story-completed-heading"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
        <h2 id="story-completed-heading" className="text-lg font-bold sm:text-xl">
          Story Completed
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        You finished <span className="font-medium text-foreground">{storyTitle}</span>.
      </p>
      {streak && streak.current_streak > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
          <Flame className="h-4 w-4" aria-hidden="true" />
          {streak.current_streak}-day reading streak
        </p>
      )}

      {isLoading && (
        <div className="mt-5 animate-pulse rounded-xl border border-border/60 bg-background/70 p-4">
          <div className="flex gap-4">
            <div className="h-32 w-24 shrink-0 rounded-lg bg-muted" />
            <div className="min-w-0 flex-1 space-y-2 py-1">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/3 rounded bg-muted" />
            </div>
          </div>
        </div>
      )}

      {!isLoading && isError && (
        <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          We could not load what to read next right now.
        </p>
      )}

      {/* No primary pick is a real state, not a failure: a small catalogue, or
          a reader who has already engaged with everything similar. */}
      {!isLoading && !isError && !primary && (
        <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            That is everything we have like this one for now.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/library">Browse all stories</Link>
          </Button>
        </div>
      )}

      {primary && (
        <article className="mt-5 rounded-xl border border-border/70 bg-background/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Read next</p>
          <div className="mt-3 flex gap-4">
            <Link
              to={`/story/${primary.slug}`}
              className="group block w-24 shrink-0 sm:w-28"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => trackNextStoryClick(primary.slug, "cover")}
            >
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted shadow-sm">
                <CoverImage
                  src={primary.cover_image}
                  alt=""
                  author={primary.author}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="text-base font-semibold sm:text-lg">
                <Link
                  to={`/story/${primary.slug}`}
                  className="hover:text-primary"
                  onClick={() => trackNextStoryClick(primary.slug, "title")}
                >
                  {primary.title}
                </Link>
              </h3>
              {primary.author && (
                <p className="mt-0.5 text-sm text-muted-foreground">{primary.author}</p>
              )}
              {primaryReadingTime && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3 w-3" />
                  {primaryReadingTime}
                </p>
              )}
              <Button asChild className="mt-auto w-full self-start pt-0 sm:w-auto">
                <Link
                  to={`/story/${primary.slug}`}
                  onClick={() => trackNextStoryClick(primary.slug, "read_next")}
                >
                  Read Next
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </article>
      )}

      {data?.sections.map((section) => (
        <div key={section.key} className="mt-6">
          <h3 className="mb-3 text-sm font-semibold sm:text-base">{section.title}</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {section.stories.map((story) => (
              <StoryCard key={story.id} {...story} compact />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
};

export default StoryCompletionScreen;
