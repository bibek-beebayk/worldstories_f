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
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { storyApi } from "@/api/story";
import { useHomeData } from "@/hooks/useHomeData";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useContinueReading } from "@/hooks/useContinueReading";
import { useContinueListening } from "@/hooks/useContinueListening";
import { useRecommendations } from "@/hooks/useRecommendations";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Feather,
  Globe2,
  Headphones,
  Languages,
  MapPin,
  Mic2,
  Sparkles,
  Star,
} from "lucide-react";
import { ComponentType } from "react";
import { formatViews } from "@/lib/utils";
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

export function meta() {
  return buildMeta({
    title: "WorldStories - Home of Stories",
    description:
      "WorldStories is the home for stories from around the world. Discover new tales, connect with authors, and immerse yourself in diverse narratives across genres.",
    path: "/",
  });
}

// Purely decorative — each icon nods at a facet of what the platform is for
// (reading, writing, world/language reach, listening) and drifts slowly so
// the hero never feels static, without competing with the foreground text.
const HERO_BACKGROUND_ICONS: {
  icon: ComponentType<{ className?: string }>;
  className: string;
  animationClass: string;
  style?: { animationDelay?: string; animationDuration?: string };
}[] = [
  { icon: BookOpen, className: "left-[6%] top-[15%] h-10 w-10 sm:h-14 sm:w-14", animationClass: "animate-float", style: { animationDuration: "7s" } },
  { icon: Globe2, className: "left-[20%] top-[70%] h-8 w-8 sm:h-12 sm:w-12", animationClass: "animate-drift-slow", style: { animationDuration: "14s" } },
  { icon: Feather, className: "left-[38%] top-[12%] h-7 w-7 sm:h-10 sm:w-10", animationClass: "animate-float", style: { animationDelay: "1.5s", animationDuration: "8s" } },
  { icon: Headphones, className: "right-[32%] top-[68%] h-8 w-8 sm:h-11 sm:w-11", animationClass: "animate-float", style: { animationDelay: "0.7s", animationDuration: "6.5s" } },
  { icon: Languages, className: "right-[16%] top-[20%] h-8 w-8 sm:h-11 sm:w-11", animationClass: "animate-drift-slow", style: { animationDelay: "2s", animationDuration: "16s" } },
  { icon: Mic2, className: "right-[6%] top-[55%] h-7 w-7 sm:h-10 sm:w-10", animationClass: "animate-float", style: { animationDelay: "1s", animationDuration: "7.5s" } },
  { icon: Star, className: "left-[50%] top-[82%] h-5 w-5 sm:h-7 sm:w-7", animationClass: "animate-float", style: { animationDelay: "2.5s", animationDuration: "5.5s" } },
];

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_50%),linear-gradient(to_bottom,#f8fafc,transparent_320px)]">
      <section className="relative overflow-hidden bg-hero-dark">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-drift-slow rounded-full bg-primary/30 blur-3xl" style={{ animationDuration: "18s" }} />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 animate-drift-slow rounded-full bg-primary/20 blur-3xl" style={{ animationDuration: "22s", animationDelay: "3s" }} />

        {/* Decorative only — icons don't convey information, so the whole
            layer is hidden from assistive tech and never intercepts input. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {HERO_BACKGROUND_ICONS.map(({ icon: Icon, className, animationClass, style }, index) => (
            <Icon
              key={index}
              style={style}
              className={`absolute text-white/20 ${animationClass} ${className}`}
            />
          ))}
        </div>

        <div className="container relative px-3 py-10 sm:px-4 sm:py-14 md:py-16">
          <div className="flex flex-wrap items-center justify-between gap-8">
            <div className="min-w-0 max-w-2xl">
              <h1 className="animate-in fade-in-0 slide-in-from-bottom-4 text-4xl font-bold tracking-tight duration-700 sm:text-5xl md:text-6xl">
                <span className="text-white">World</span>
                <span className="animate-gradient-x bg-[length:200%_auto] bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
                  Stories
                </span>
              </h1>
              <p className="mt-3 text-sm text-white/75 sm:text-base">
                The home for stories from around the world. Read novels, poetry, and short fiction for free,
                and discover audiobooks and read-along narrations from authors across every genre and country.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70 sm:text-sm">
                <span className="inline-flex items-center gap-1.5"><BookOpenText className="h-3.5 w-3.5" /> Full novels, quick reads &amp; poetry</span>
                <span className="inline-flex items-center gap-1.5"><Headphones className="h-3.5 w-3.5" /> Audiobooks &amp; read-along narration</span>
              </div>

              {data && (
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70 sm:text-sm">
                  <span><strong className="text-white">{formatViews(data.sidebar.stats.stories)}</strong> stories</span>
                  <span><strong className="text-white">{formatViews(data.sidebar.stats.creators)}</strong> creators</span>
                  <span><strong className="text-white">{formatViews(data.sidebar.stats.readers)}</strong> readers</span>
                </div>
              )}
            </div>

            <div className="relative flex w-full shrink-0 justify-center sm:w-auto sm:justify-start">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/50" />
              <Button
                asChild
                size="lg"
                className="group relative rounded-full bg-gradient-to-r from-primary to-orange-500 px-8 text-base font-semibold shadow-lg shadow-primary/30 transition-transform hover:scale-105 hover:shadow-xl hover:shadow-primary/40"
              >
                <Link to="/library" className="flex items-center gap-2">
                  Start Reading
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

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
          <section className="relative overflow-hidden rounded-sm bg-gradient-to-br from-cyan-600 via-blue-600 to-teal-600 p-5 text-white shadow-lg sm:p-6">
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
                  <p className="mt-1 text-xs text-white/80 sm:text-sm">
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
