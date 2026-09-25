import FullScreenLoader from "@/components/FullScreenLoader";
import CoverImage from "@/components/CoverImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { formatViews } from "@/lib/utils";
import { buildMeta } from "@/lib/buildMeta";
import {
  ArrowRight,
  BookMarked,
  Clock,
  Eye,
  Headphones,
  Heart,
  Info,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
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

      <main className="container mx-auto px-4 pb-8 pt-0 sm:pt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Same info-card treatment as the story details page — cover
                beside title/stats, with the image stretching to match
                however tall that content ends up being (from md up). */}
            <div className="relative -mx-4 mb-8 overflow-hidden border-y border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-card p-4 shadow-sm sm:mx-0 sm:rounded-sm sm:border-x sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-primary/10 blur-3xl sm:block" />

              <div className="relative grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm shadow-lg md:aspect-auto md:h-full md:min-h-[360px]">
                  <CoverImage
                    src={story.cover_image}
                    alt={story.title}
                    author={story.author?.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex h-full flex-col justify-center space-y-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                        <Zap className="mr-1 h-3 w-3" />
                        Quick Read
                      </Badge>
                      {story.categories.slice(0, 2).map((category) => (
                        <Badge key={category.id} variant="secondary">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                    <h1 className="mb-2 text-4xl font-bold">{story.title}</h1>
                    {story.author && (
                      <div className="mb-4 flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={story.author.image || ""} />
                          <AvatarFallback>SC</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          by{" "}
                          <Link
                            to={`/authors/${story.author.id}`}
                            className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
                          >
                            {story.author.name}
                          </Link>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-foreground sm:gap-x-6 sm:text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 sm:h-4 sm:w-4" />
                      <span className="font-semibold text-amber-600">{story.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-sky-500 sm:h-4 sm:w-4" />
                      <span className="font-semibold text-sky-600">{story.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-500 sm:h-4 sm:w-4" />
                      <span className="font-semibold text-amber-600">{quickReadMinutes} min read</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart
                        className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isFavorite ? "fill-pink-500 text-pink-500" : "text-pink-400"}`}
                      />
                      <span className="font-semibold text-pink-600">{story.favorites_count}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" onClick={toggleFavorite} disabled={favoriteLoading} variant="outline">
                      <Heart className={`mr-1.5 h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                      {isFavorite ? "Saved" : "Save"}
                    </Button>
                  </div>

                  {(primaryReadHref || firstAudioSlug) && (
                    <div className="rounded-sm border border-dashed border-primary/30 bg-primary/5 p-3">
                      <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Also Available
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {primaryReadHref && (
                          <Link
                            to={primaryReadHref}
                            onClick={trackFullStoryClick}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm transition-all hover:scale-105"
                          >
                            <BookMarked className="h-3.5 w-3.5" />
                            Read Full Story
                          </Link>
                        )}
                        {firstAudioSlug && (
                          <Link
                            to={`/listen/${story.slug}/${firstAudioSlug}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 shadow-sm transition-all hover:scale-105"
                          >
                            <Headphones className="h-3.5 w-3.5" />
                            Listen
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content card — same treatment as the chapter/audio list cards
                on the story details page, with a heading row of its own.
                Plain (no border/shadow/rounding) on mobile; restored from
                sm up. */}
            <Card className="rounded-none border-x-0 border-b-0 shadow-none sm:rounded-lg sm:border sm:shadow-sm">
              <CardContent className="p-0">
                <h3 className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  Summary
                </h3>
                <div className="p-4 sm:p-6">
                  <p className="flex items-start gap-2 rounded-sm border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-700">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    This quick summary may include spoilers for the story.
                  </p>

                  <article
                    ref={summaryRef}
                    className="prose prose-lg mt-6 max-w-none text-justify leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(story.summary) }}
                  />

                  {/* Marks the end of the summary. Seeing this is what counts
                      as having read it — see useQuickReadFunnel. */}
                  <div ref={endOfSummaryRef} aria-hidden="true" />
                </div>
              </CardContent>
            </Card>

            <div className="relative mt-6 flex flex-col items-center gap-4 overflow-hidden rounded-sm bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-center text-white shadow-lg sm:flex-row sm:justify-between sm:p-6 sm:text-left">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 left-1/4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <BookMarked className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 animate-flicker text-white/10" style={{ animationDuration: "3s" }} />

              <div className="relative flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <BookMarked className="h-6 w-6" />
                </span>
                <div>
                  {/* "the summary", not "the story" — that is what they just read,
                      and the whole point of this panel is to offer them the story. */}
                  <p className="font-display text-lg font-bold sm:text-xl">Enjoyed the summary?</p>
                  {primaryReadHref ? (
                    <p className="mt-0.5 text-sm text-white/85">
                      Read it in full, the way it was written.
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-white/85">The full story isn't available yet.</p>
                  )}
                </div>
              </div>

              {primaryReadHref && (
                <div className="relative shrink-0">
                  <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-white/20" />
                  <Link
                    to={primaryReadHref}
                    onClick={trackFullStoryClick}
                    className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:scale-110 hover:bg-white/25"
                  >
                    Read the Full Story
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {story.author && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">About the Author</h3>
                  <Link to={`/authors/${story.author.id}`} className="group mb-3 flex w-fit items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={story.author.image || ""} />
                      <AvatarFallback>SC</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium transition-colors group-hover:text-primary group-hover:underline">
                        {story.author.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatViews(story.author.stories_count)} stories
                      </p>
                    </div>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {story.author.bio || "No author bio available."}
                  </p>
                  <Separator className="my-4" />
                  <p className="text-sm text-muted-foreground">{story.about}</p>
                </CardContent>
              </Card>
            )}

            <RecommendedQuickReadsSection stories={recommendedQuickReads || []} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default StorySummary;
