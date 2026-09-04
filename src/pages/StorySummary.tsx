import FullScreenLoader from "@/components/FullScreenLoader";
import CoverImage from "@/components/CoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { storyApi } from "@/api/story";
import { useStory } from "@/hooks/useStory";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useQuickReadRecommendations } from "@/hooks/useQuickReadRecommendations";
import { useQuickReadFunnel } from "@/hooks/useQuickReadFunnel";
import { useContentScrollProgress } from "@/hooks/useContentScrollProgress";
import { ReadingProgressBar } from "@/components/reader/ReadingProgressBar";
import RecommendedQuickReadsSection from "@/components/RecommendedQuickReadsSection";
import { useAuthModal } from "@/context/AuthModalContext";
import { estimateSummaryReadingMinutes } from "@/lib/summaryReadingTime";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { buildMeta } from "@/lib/buildMeta";
import { ArrowLeft, ArrowRight, Clock, Headphones, Heart, Info, Zap } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { data, Link, useParams } from "react-router";
import type { Route } from "./+types/StorySummary";

// Fetched here purely to supply meta() with real data server-side — the
// component below still fetches independently via useStory() for now.
export async function loader({ params }: Route.LoaderArgs) {
  try {
    return await storyApi.getStory(params.slug!);
  } catch {
    return data(null, { status: 404 });
  }
}

// Always noIndex regardless of the story: the same summary text already
// lives (and is indexed) on the story's own page — see the Summary tab on
// StoryDetail. Quick Read exists as a fast reading surface, not a second
// indexable copy of that text. It's also login-gated, so an anonymous
// crawler never sees the real content below anyway.
export function meta({ data: story }: Route.MetaArgs) {
  if (!story) {
    return buildMeta({
      title: "Quick Read | WorldStories",
      description: "Log in to use Quick Read.",
      noIndex: true,
    });
  }

  const quickReadMinutes = estimateSummaryReadingMinutes(story.summary);
  const description =
    quickReadMinutes === null
      ? `No quick summary is available for "${story.title}" yet.`
      : `A ${quickReadMinutes}-minute summary of ${story.title}${
          story.author ? ` by ${story.author.name}` : ""
        }.`;
  return buildMeta({
    title: `${story.title} — Quick Read | WorldStories`,
    description,
    path: `/quick-read/${story.slug}`,
    image: story.cover_image,
    type: "article",
    noIndex: true,
  });
}

// A fast, distraction-free "article" reading experience for a story's
// summary — deliberately separate from StoryReader (chapters, EPUB/PDF,
// immersive chrome, per-account progress). Quick Read is stateless: it
// always opens the summary from the top and always sends "Read Full Story"
// to the first chapter, not wherever the reader last left off.
const StorySummary = ({ loaderData }: Route.ComponentProps) => {
  const { slug } = useParams();
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  // Fetched unconditionally (not gated on isAuthenticated) so that if someone
  // logs in from the prompt below without leaving this page, the summary is
  // already in cache and appears instantly instead of behind a fresh spinner.
  const { data: story, isLoading, isError } = useStory(slug, loaderData || undefined);
  const { isFavorite, favoriteLoading, toggleFavorite } = useFavoriteToggle(slug, story);
  useContentSessionAnalytics(
    "reading_session",
    story?.slug ? { storySlug: story.slug } : undefined,
    true,
    { format: "quick_read" }
  );

  const { endOfSummaryRef, trackFullStoryClick } = useQuickReadFunnel(story?.slug);
  // Measurement only, so it runs for every reader — this is the one reading
  // surface that gave no sense of position at all.
  const { contentRef: summaryRef, fraction: summaryProgress } =
    useContentScrollProgress<HTMLElement>(Boolean(story?.summary));
  const progressSaveTimerRef = useRef<number | null>(null);

  // Quick Read is its own reading surface, so its depth is saved separately
  // from chapter/EPUB/PDF progress. This mirrors blog scroll-depth tracking
  // and only runs for authenticated readers (Quick Read is login-gated).
  useEffect(() => {
    if (!isAuthenticated || !story?.slug || !story.summary) return;
    if (progressSaveTimerRef.current) window.clearTimeout(progressSaveTimerRef.current);
    progressSaveTimerRef.current = window.setTimeout(() => {
      storyApi.saveQuickReadProgress(story.slug, summaryProgress).catch(() => undefined);
    }, 800);
  }, [isAuthenticated, story?.slug, story?.summary, summaryProgress]);

  const quickReadMinutes = useMemo(() => estimateSummaryReadingMinutes(story?.summary), [story?.summary]);
  const { data: recommendedQuickReads } = useQuickReadRecommendations(isAuthenticated && Boolean(story), story?.slug);

  const firstChapterSlug = story?.chapters[0]?.slug;
  const primaryReadHref = !story
    ? null
    : story.chapters.length > 0
    ? `/read/${story.slug}/${firstChapterSlug}`
    : story.epub_file
    ? `/story/${story.slug}/epub`
    : story.pdf_file
    ? `/story/${story.slug}/pdf`
    : null;
  const firstAudioSlug = story?.audios[0]?.slug;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Zap className="h-3.5 w-3.5" />
              Quick Read
            </div>
            <p className="text-sm text-muted-foreground">
              <button type="button" onClick={openLoginModal} className="text-primary hover:underline">
                Login
              </button>{" "}
              to read Quick Read summaries.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isError || !story) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground">We couldn't find that story.</p>
            <Link to="/library">
              <Button variant="outline" className="mt-4">
                Back to Library
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quickReadMinutes === null) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground">
              No quick summary is available for "{story.title}" yet.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {primaryReadHref && (
                <Link to={primaryReadHref}>
                  <Button className="w-full">Read Full Story</Button>
                </Link>
              )}
              <Link to={`/story/${story.slug}`}>
                <Button variant="outline" className="w-full">
                  Back to Story
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ReadingProgressBar fraction={summaryProgress} label="Summary" />

      <main className="mx-auto max-w-[760px] px-4 py-6 sm:py-10">
        <Link
          to={`/story/${story.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Story
        </Link>

        <div className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Zap className="h-3.5 w-3.5" />
            Quick Read
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{story.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            {story.author && (
              <Link
                to={`/authors/${story.author.id}`}
                className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
              >
                by {story.author.name}
              </Link>
            )}
            {story.categories.slice(0, 2).map((category) => (
              <Badge key={category.id} variant="outline">
                {category.name}
              </Badge>
            ))}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {quickReadMinutes} min read
            </span>
          </div>
        </div>

        <div className="mx-auto mt-6 w-36 overflow-hidden rounded-lg shadow-md sm:w-44">
          <CoverImage
            src={story.cover_image}
            alt={story.title}
            author={story.author?.name}
            className="aspect-[3/4] w-full object-cover"
          />
        </div>

        <p className="mt-8 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This quick summary may include spoilers for the story.
        </p>

        <article
          ref={summaryRef}
          className="prose prose-lg mt-6 max-w-none leading-relaxed dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(story.summary) }}
        />

        {/* Marks the end of the summary. Seeing this is what counts as having
            read it — see useQuickReadFunnel. */}
        <div ref={endOfSummaryRef} aria-hidden="true" />

        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 p-4 text-center sm:flex-row sm:justify-between sm:p-5 sm:text-left">
          <div>
            {/* "the summary", not "the story" — that is what they just read,
                and the whole point of this panel is to offer them the story. */}
            <p className="text-sm font-semibold">Enjoyed the summary?</p>
            {primaryReadHref ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Read it in full, the way it was written.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">The full story isn't available yet.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            {primaryReadHref && (
              <Link to={primaryReadHref} onClick={trackFullStoryClick}>
                <Button size="sm">
                  Read the Full Story
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            {firstAudioSlug && (
              <Link to={`/listen/${story.slug}/${firstAudioSlug}`}>
                <Button variant="outline" size="sm">
                  <Headphones className="mr-1.5 h-3.5 w-3.5" />
                  Listen
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={toggleFavorite} disabled={favoriteLoading}>
              <Heart className={`mr-1.5 h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              {isFavorite ? "Saved" : "Save"}
            </Button>
          </div>
        </div>

        <RecommendedQuickReadsSection stories={recommendedQuickReads || []} />
      </main>
    </div>
  );
};

export default StorySummary;
