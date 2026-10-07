import ContinueReadingSection from "@/components/ContinueReadingSection";
import ContinueListeningSection from "@/components/ContinueListeningSection";
import RecommendedForYouSection from "@/components/RecommendedForYouSection";
import QuickReadSection from "@/components/QuickReadSection";
import RecentBlogsSection from "@/components/RecentBlogsSection";
import ReadingJourneyCard from "@/components/ReadingJourneyCard";
import StoryJourneysBanner from "@/components/StoryJourneysBanner";
import NewEntriesSection from "@/components/NewEntriesSection";
import AdSpace from "@/components/AdSpace";
import StoryCard from "@/components/StoryCard";
import { OriginalsRail } from "@/components/OriginalsRail";
import HomeHero from "@/components/home/HomeHero";
import { buildDefaultHero, heroFontsUrl } from "@/components/home/heroPresets";
import { Link } from "react-router";
import { storyApi } from "@/api/story";
import { useHomeData } from "@/hooks/useHomeData";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useContinueReading } from "@/hooks/useContinueReading";
import { useContinueListening } from "@/hooks/useContinueListening";
import { useRecommendations } from "@/hooks/useRecommendations";
import { ArrowRight, Globe2, MapPin, Sparkles } from "lucide-react";
import { ComponentType } from "react";
import { createRailDeduplicator } from "@/lib/railDeduplication";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/Index";

// The homepage is the single highest-traffic, most SEO-critical page on the
// site — this is real first-paint content, not just meta-only like the
// dynamic per-item pages. Swallows failures rather than throwing: unlike the
// per-item pages, there's no "not found" case here, and letting this throw
// would replace the page's own isError UI with the top-level error
// boundary. Falling back to undefined just means useHomeData() fetches
// client-side as it always did.
export async function loader() {
  try {
    return await storyApi.getHomeData();
  } catch {
    return undefined;
  }
}

export function meta({ data }: Route.MetaArgs) {
  const tags = buildMeta({
    title: "WorldStories - Home of Stories",
    description:
      "WorldStories is the home for stories from around the world. Discover new tales, connect with authors, and immerse yourself in diverse narratives across genres.",
    path: "/",
  });
  // The hero template's fonts, in <head> so the title renders in them on first paint.
  const fontsUrl = data?.hero ? heroFontsUrl(data.hero) : null;
  return fontsUrl ? [...tags, { tagName: "link", rel: "stylesheet", href: fontsUrl }] : tags;
}

const SectionTitle = ({
  icon: Icon,
  title,
  seeAllHref,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  seeAllHref?: string;
}) => (
  <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
    <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
      <Icon className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
      {title}
    </h2>
    {seeAllHref && (
      <Link
        to={seeAllHref}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm"
      >
        See all
        <ArrowRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

const Index = ({ loaderData }: Route.ComponentProps) => {
  const isLoggedIn = useIsLoggedIn();
  const { data, isLoading, isError } = useHomeData(loaderData);
  const {
    data: continueReadingData,
    isLoading: isContinueReadingLoading,
    isError: isContinueReadingError,
  } = useContinueReading(isLoggedIn);
  const {
    data: continueListeningData,
    isLoading: isContinueListeningLoading,
    isError: isContinueListeningError,
  } = useContinueListening(isLoggedIn);
  const {
    data: recommendationsData,
    isLoading: isRecommendationsLoading,
    isError: isRecommendationsError,
  } = useRecommendations(isLoggedIn);

  // Claimed top-down in the page's own order, so the highest-priority rail
  // keeps a story and the ones below substitute something else (§3.5). Built
  // fresh each render; the rails it feeds are all derived from the same data.
  const rails = createRailDeduplicator();
  // The reader's own queue is claimed first and in full, including the part
  // the homepage does not show — a story sitting sixth in Continue Reading is
  // still theirs, not a fresh suggestion for Trending to make.
  rails.reserve(continueReadingData?.results.map((item) => item.story));
  rails.reserve(continueListeningData?.results.map((item) => item.story));
  // Featured Stories is exempt from the dedup system entirely — it always
  // shows every story the team marked as featured, never silently dropping
  // one because it also happens to qualify for a rail further down the page.
  // It still reserves them, so those lower rails don't turn around and show
  // the exact same story a second time right below.
  const configuredDaily = data?.daily_story?.configured ? data.daily_story : null;
  const featuredStories = configuredDaily ? [configuredDaily.story] : data?.featured_stories ?? [];
  rails.reserve(featuredStories);
  const recommendedStories = rails.claim(recommendationsData);
  const quickReadStories = rails.claim(data?.quick_reads);
  const moreToExplore = rails.claim(data?.more_to_explore);
  const originalStories = rails.claim(data?.originals);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_50%),linear-gradient(to_bottom,var(--theme-page-wash,#f8fafc),transparent_320px)]">
      <HomeHero hero={data?.hero ?? buildDefaultHero(data?.sidebar.stats)} />

      <div className="container px-3 py-8 sm:px-4 sm:py-10 md:py-12">
        <main className="space-y-8 md:space-y-10">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-sm text-muted-foreground">Loading today's stories…</p>
            </div>
          )}

          {!isLoading && (isError || !data) && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                We couldn't load today's stories. Please refresh the page.
              </p>
            </div>
          )}

          {!isLoading && data && (
            <>
          {featuredStories.length > 0 && (
            <section>
              <SectionTitle
                icon={Sparkles}
                title={configuredDaily ? "Daily Story" : "Featured Stories"}
              />
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
                {featuredStories.map((story) => (
                  <StoryCard key={story.id} {...story} featured />
                ))}
              </div>
            </section>
          )}

          {/* Reader intent first *within the page body*: a signed-in reader
              picks up where they left off before anything else here. The
              featured hero deliberately stays above it — §3.1 lists Continue
              Reading first, but the hero is the page's identity and the
              project owner's call is that it leads. `useIsLoggedIn` starts
              false to match the server, so this block appears just after
              hydration rather than during it. */}
          {isLoggedIn && (
            <div className="space-y-6">
              {((continueReadingData?.results.length || 0) > 0 ||
                (continueListeningData?.results.length || 0) > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {!isContinueReadingLoading &&
                    !isContinueReadingError &&
                    (continueReadingData?.results.length || 0) > 0 && (
                    <ContinueReadingSection
                      items={continueReadingData!.results}
                      isLoading={false}
                      isError={false}
                    />
                  )}

                  {!isContinueListeningLoading &&
                    !isContinueListeningError &&
                    (continueListeningData?.results.length || 0) > 0 && (
                    <ContinueListeningSection
                      items={continueListeningData!.results}
                      isLoading={false}
                      isError={false}
                    />
                  )}
                </div>
              )}

              <ReadingJourneyCard enabled />
            </div>
          )}

          <NewEntriesSection />

          {/* Renders only once recommendations actually come back — a user
              who skipped the genre picker (or hasn't logged in) has none, and
              the section just doesn't appear rather than showing an empty
              state or nagging them to set preferences. */}
          {isLoggedIn &&
            !isRecommendationsLoading &&
            !isRecommendationsError &&
            recommendedStories.length > 0 && (
            <RecommendedForYouSection
              stories={recommendedStories}
              isLoading={false}
              isError={false}
            />
          )}

          <StoryJourneysBanner enabled />

          <QuickReadSection stories={quickReadStories} />

          {/* The Story Map already existed as its own page but had no entry
              point on the homepage at all — the one place the brief asks for
              it. Country is the site's most distinctive way in. */}
          <section className="relative overflow-hidden rounded-sm themed-banner [--banner-from:#0891b2] [--banner-via:#2563eb] [--banner-to:#0d9488] p-5 shadow-lg sm:p-6">
            <Globe2 className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 text-white/10 [animation:spin_30s_linear_infinite]" />
            <MapPin className="pointer-events-none absolute bottom-4 left-[20%] h-8 w-8 animate-float text-white/20" style={{ animationDuration: "5s" }} />
            <MapPin className="pointer-events-none absolute right-[15%] top-6 h-6 w-6 animate-float text-white/15" style={{ animationDelay: "1s", animationDuration: "6.5s" }} />

            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Globe2 className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold sm:text-xl">Explore by Country</h2>
                  <p className="mt-1 text-xs opacity-80 sm:text-sm">
                    Follow a story back to where it comes from — pick a country and start reading.
                  </p>
                </div>
              </div>

              <div className="relative shrink-0">
                <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-white/20" />
                <Link
                  to="/story-map"
                  className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:scale-110 hover:bg-white/25 sm:text-sm"
                >
                  Open the Story Map
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          <AdSpace size="banner" contentType="home" />

          <RecentBlogsSection />

          <section>
            <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Continue Discovering</h2>
              <Link
                to="/library"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm"
              >
                See all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
              {moreToExplore.map((story) => (
                <StoryCard key={story.id} {...story} compact />
              ))}
            </div>
          </section>

          <OriginalsRail stories={originalStories} />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
