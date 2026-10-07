import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import { OriginalsRail } from "@/components/OriginalsRail";
import SurpriseMeCard from "@/components/SurpriseMeCard";
import MoodPicker from "@/components/MoodPicker";
import BlogCard from "@/components/BlogCard";
import { ContentTypeSection, SECTION_THEMES } from "@/components/ContentTypeSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDiscoverData } from "@/hooks/useDiscoverData";
import { storyApi } from "@/api/story";
import type { Route } from "./+types/Discover";
import { formatViews } from "@/lib/utils";
import { formatStoryCountLabel, getLanguageNativeLabel } from "@/lib/languages";
import {
  BookMarked,
  BookOpenText,
  Captions,
  Compass,
  Eye,
  Flame,
  Gem,
  Headphones,
  Heart,
  Languages,
  MessageSquare,
  Newspaper,
  Star,
  Tag,
  Youtube,
  Zap,
} from "lucide-react";
import { buildMeta } from "@/lib/buildMeta";
import CoverImage from "@/components/CoverImage";
import type { Story, TrendingDataResponse } from "@/api/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const RANK_STYLES = [
  "tinted-chip [--tint:#f59e0b]",
  "tinted-chip [--tint:#64748b]",
  "tinted-chip [--tint:#f97316]",
];

const rankClass = (index: number) => RANK_STYLES[index] || "border-border bg-muted text-muted-foreground";

// Cycled per card (not one color per section) so each individual genre/
// category/story-type/language tile in a grid gets a visually distinct
// background — distinct from the content-type SECTION_THEMES used above,
// since a page with both shouldn't reuse the same colors for two different
// kinds of grouping.
const CARD_PALETTE = [
  {
    wrap: "tinted-panel [--tint:#8b5cf6] [--tint-2:#a855f7] hover:border-violet-400",
    icon: "bg-violet-600/10 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    wrap: "tinted-panel [--tint:#14b8a6] [--tint-2:#06b6d4] hover:border-teal-400",
    icon: "bg-teal-600/10 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
  },
  {
    wrap: "tinted-panel [--tint:#f97316] [--tint-2:#f59e0b] hover:border-orange-400",
    icon: "bg-orange-600/10 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
  },
  {
    wrap: "tinted-panel [--tint:#06b6d4] [--tint-2:#0ea5e9] hover:border-cyan-400",
    icon: "bg-cyan-600/10 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
  },
  {
    wrap: "tinted-panel [--tint:#f43f5e] [--tint-2:#ec4899] hover:border-rose-400",
    icon: "bg-rose-600/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
  },
  {
    wrap: "tinted-panel [--tint:#6366f1] [--tint-2:#3b82f6] hover:border-indigo-400",
    icon: "bg-indigo-600/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
  },
  {
    wrap: "tinted-panel [--tint:#10b981] [--tint-2:#22c55e] hover:border-emerald-400",
    icon: "bg-emerald-600/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    wrap: "tinted-panel [--tint:#f59e0b] [--tint-2:#eab308] hover:border-amber-400",
    icon: "bg-amber-600/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
  },
  {
    wrap: "tinted-panel [--tint:#d946ef] [--tint-2:#ec4899] hover:border-fuchsia-400",
    icon: "bg-fuchsia-600/10 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white",
  },
  {
    wrap: "tinted-panel [--tint:#84cc16] [--tint-2:#22c55e] hover:border-lime-400",
    icon: "bg-lime-600/10 text-lime-700 group-hover:bg-lime-600 group-hover:text-white",
  },
] as const;

function BrowseGrid({
  items,
  icon: Icon,
}: {
  items: {
    key: string | number;
    href: string;
    name: string;
    count: number;
    lang?: string;
    /** Overrides the default "N stories" text — used for the language grid
     * so the count reads in that language too, not just the name above it. */
    countLabel?: string;
  }[];
  icon: typeof Tag;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
      {items.map((item, index) => {
        const colors = CARD_PALETTE[index % CARD_PALETTE.length];
        return (
          <Link
            key={item.key}
            to={item.href}
            className={`group flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-colors ${colors.wrap}`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${colors.icon}`}>
              <Icon className="h-4 w-4" />
            </span>
            {/* lang, when set, renders the card's own name in that language
                (e.g. "Español" tagged lang="es") rather than always English. */}
            <span lang={item.lang} className="line-clamp-2 text-xs font-semibold leading-tight sm:text-sm">
              {item.name}
            </span>
            <span lang={item.lang} className="text-[11px] text-muted-foreground">
              {item.countLabel ?? `${formatViews(item.count)} ${item.count === 1 ? "story" : "stories"}`}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

const TRENDING_TABS: {
  value: string;
  label: string;
  icon: typeof Eye;
  data: keyof TrendingDataResponse;
  metric: (story: Story) => { icon: typeof Eye; value: string };
}[] = [
  {
    value: "most_viewed",
    label: "Most Viewed",
    icon: Eye,
    data: "most_viewed",
    metric: (story) => ({ icon: Eye, value: `${formatViews(story.views)} reads` }),
  },
  {
    value: "highest_rated",
    label: "Highest Rated",
    icon: Star,
    data: "highest_rated",
    metric: (story) => ({ icon: Star, value: story.rating.toFixed(1) }),
  },
  {
    value: "most_favorited",
    label: "Most Favorited",
    icon: Heart,
    data: "most_favorited",
    metric: (story) => ({ icon: Heart, value: `${formatViews(story.favorites_count || 0)} favorites` }),
  },
  {
    value: "most_discussed",
    label: "Most Discussed",
    icon: MessageSquare,
    data: "most_discussed",
    metric: (story) => ({ icon: MessageSquare, value: `${formatViews(story.reviews_count || 0)} reviews` }),
  },
];

const TrendingLeaderboard = ({
  stories,
  metric,
}: {
  stories: Story[];
  metric: (story: Story) => { icon: typeof Eye; value: string };
}) => (
  <div className="space-y-2 sm:space-y-3">
    {stories.map((story, index) => {
      const { icon: MetricIcon, value } = metric(story);
      return (
        <Link
          key={story.id}
          to={`/read/${story.slug}`}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 sm:gap-4 sm:p-4"
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold tabular-nums sm:h-10 sm:w-10 ${rankClass(index)}`}
          >
            {index + 1}
          </div>
          <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:h-20 sm:w-14">
            <CoverImage
              src={story.cover_image}
              alt={story.title}
              author={story.author}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary sm:text-base">
              {story.title}
            </h3>
            {(story.genres?.length ?? 0) > 0 && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{story.genres!.join(" · ")}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
            <MetricIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="tabular-nums">{value}</span>
          </div>
        </Link>
      );
    })}
  </div>
);

// TODO: this page's ItemList structuredData depended on new_releases —
// dropped here since it's a nice-to-have on top of the title/description/
// canonical fix this migration is actually for, not because a loader isn't
// available (there is one now, below).
export function meta() {
  return buildMeta({
    title: "Discover & Trending Stories | WorldStories",
    description:
      "Explore trending stories, new releases, and hidden gems, or browse WorldStories by genre, story type, and language.",
    path: "/discover",
  });
}

export async function loader() {
  try {
    return await storyApi.getDiscoverData();
  } catch {
    return undefined;
  }
}

const NEW_PREVIEW_COUNT = 12;

const Discover = ({ loaderData }: Route.ComponentProps) => {
  const { data, isLoading, isError } = useDiscoverData(loaderData);
  const location = useLocation();

  useEffect(() => {
    if (!data || location.hash !== "#trending") return;
    requestAnimationFrame(() => document.getElementById("trending")?.scrollIntoView({ block: "start" }));
  }, [data, location.hash]);

  // "New X" sections — each sorted by recency and scoped to one content
  // type, mirroring the Library's 6 type sections but newest-first instead
  // of most-popular-first. Cards link to that type's isolated detail page.
  const { data: newStories, isLoading: isNewStoriesLoading } = useQuery({
    queryKey: ["discover-new", "read"],
    queryFn: () => storyApi.getStories(1, [], "recent", "all", "", "all", "all", []),
    staleTime: 60_000,
  });
  const { data: newAudiobooks, isLoading: isNewAudiobooksLoading } = useQuery({
    queryKey: ["discover-new", "listen"],
    queryFn: () => storyApi.getStories(1, [], "recent", "all", "", "all", "all", [], true),
    staleTime: 60_000,
  });
  const { data: newReadAlongs, isLoading: isNewReadAlongsLoading } = useQuery({
    queryKey: ["discover-new", "read-along"],
    queryFn: () =>
      storyApi.getStories(1, [], "recent", "all", "", "all", "all", [], false, false, "all", false, [], true),
    staleTime: 60_000,
  });
  const { data: newVideos, isLoading: isNewVideosLoading } = useQuery({
    queryKey: ["discover-new", "watch"],
    queryFn: () => storyApi.getStories(1, [], "recent", "all", "", "all", "all", [], false, false, "all", true),
    staleTime: 60_000,
  });
  const { data: newQuickReads, isLoading: isNewQuickReadsLoading } = useQuery({
    queryKey: ["discover-new", "quick-read"],
    queryFn: () => storyApi.getStories(1, [], "recent", "all", "", "all", "all", [], false, true),
    staleTime: 60_000,
  });
  const { data: newBlogs, isLoading: isNewBlogsLoading } = useQuery({
    queryKey: ["discover-new", "blog"],
    queryFn: () => storyApi.getBlogs(1, "", "newest"),
    staleTime: 60_000,
  });

  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load discover content.</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Same full-width banner as Library, Blog and the other section pages,
          in Discover's own cyan → blue (the theme's accent under a site theme). */}
      <div className="relative overflow-hidden themed-banner [--banner-from:#0891b2] [--banner-via:#0284c7] [--banner-to:#1e3a8a]">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        {/* Decorative only — a big slowly-drifting compass watermark plus small
            floating finds: languages, genres, hidden gems. */}
        <Compass className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 animate-drift-slow text-white/10" style={{ animationDuration: "14s" }} />
        <Gem className="pointer-events-none absolute bottom-5 left-[16%] h-6 w-6 animate-float text-white/25" style={{ animationDuration: "4.5s" }} />
        <Languages className="pointer-events-none absolute right-[26%] top-8 h-5 w-5 animate-float text-white/20" style={{ animationDelay: "1s", animationDuration: "5.5s" }} />

        <div className="container relative mx-auto px-3 py-8 sm:px-4 sm:py-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Compass className="h-3.5 w-3.5" />
            Explore
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-inherit sm:text-4xl">Discover</h1>
          <p className="mt-2 max-w-xl text-sm opacity-85 sm:text-base">
            Browse by genre, story type, or language, catch what's fresh, and dig up stories most readers miss.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">

        {/* Two ways past the filters, for a reader who does not want to browse:
            one picks for them, the other asks how they want to feel. Ahead of
            the Originals rail because they answer "I don't know what I want",
            which is the state someone opening Discover is usually in. */}
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <SurpriseMeCard />
          <MoodPicker />
        </div>

        <OriginalsRail className="mb-8" />

        {/* Genre browsing — the primary entry point into this page. Clicking a genre hands
            off to the Library's full filtering experience rather than duplicating it here. */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Browse by Genre</h2>
          </div>
          <BrowseGrid
            icon={Tag}
            items={data.genres.map((genre) => ({
              key: genre.id,
              href: `/library?genre=${genre.id}`,
              name: genre.name,
              count: genre.stories_count,
            }))}
          />
        </section>

        {/* Categories are a separate, admin-managed taxonomy from genres —
            same browsing pattern, independent list. */}
        {data.categories.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold sm:text-xl">Browse by Category</h2>
            </div>
            <BrowseGrid
              icon={Tag}
              items={data.categories.map((category) => ({
                key: category.id,
                href: `/library?category=${category.id}`,
                name: category.name,
                count: category.stories_count,
              }))}
            />
          </section>
        )}

        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Browse by Story Type</h2>
          </div>
          <BrowseGrid
            icon={BookOpenText}
            items={(data.story_types || []).map((storyType) => ({
              key: storyType.id,
              href: `/library?story_type=${storyType.id}`,
              name: storyType.name,
              count: storyType.stories_count ?? 0,
            }))}
          />
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Browse by Language</h2>
          </div>
          <BrowseGrid
            icon={Languages}
            items={(data.languages || []).map((language) => ({
              key: language.value,
              href: `/library?language=${encodeURIComponent(language.value)}`,
              name: getLanguageNativeLabel(language.value),
              lang: language.value,
              count: language.stories_count,
              countLabel: formatStoryCountLabel(language.value, language.stories_count),
            }))}
          />
        </section>

        <AdSpace size="banner" className="mb-8" contentType="discover" />

        <section id="trending" className="mb-8 scroll-mt-24">
          <div className="mb-5 tinted-panel rounded-2xl border [--tint:#f43f5e] [--tint-2:#f59e0b] p-5 sm:p-6">
            <div className="mb-2 inline-flex items-center gap-2 tinted-chip rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Flame className="h-3.5 w-3.5" />
              Live Leaderboard
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Trending Now</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Ranked by reads, rating, favorites, and discussion.
            </p>
          </div>

          <Tabs defaultValue="most_viewed">
            <TabsList className="mb-5 flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl p-1 whitespace-nowrap">
              {TRENDING_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 gap-1.5 text-xs sm:text-sm">
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TRENDING_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <TrendingLeaderboard stories={data[tab.data] || []} metric={tab.metric} />
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* New-by-type — 6 sections, each scoped to one content type and
            sorted newest-first, so "what just got added" is answerable per
            type instead of one mixed "New Releases" shelf. */}
        <div className="mb-8 space-y-6">
          <ContentTypeSection
            title="New Stories"
            icon={BookMarked}
            theme="emerald"
            subtitle="The latest text stories to read."
            stories={(newStories?.results || []).slice(0, NEW_PREVIEW_COUNT)}
            isLoading={isNewStoriesLoading}
            seeAllTo="/library?mode=read"
            linkTo={(slug) => `/read/${slug}`}
          />
          <ContentTypeSection
            title="New Audiobooks"
            icon={Headphones}
            theme="rose"
            subtitle="The latest narrated audiobooks."
            stories={(newAudiobooks?.results || []).slice(0, NEW_PREVIEW_COUNT)}
            isLoading={isNewAudiobooksLoading}
            seeAllTo="/audiobooks"
            linkTo={(slug) => `/listen/${slug}`}
          />
          <ContentTypeSection
            title="New Read Alongs"
            icon={Captions}
            theme="sky"
            subtitle="The latest titles with synced read-along captions."
            stories={(newReadAlongs?.results || []).slice(0, NEW_PREVIEW_COUNT)}
            isLoading={isNewReadAlongsLoading}
            seeAllTo="/library?mode=read-along"
            linkTo={(slug) => `/read-along/${slug}`}
          />
          <ContentTypeSection
            title="New Videos"
            icon={Youtube}
            theme="indigo"
            subtitle="The latest animated video narrations."
            stories={(newVideos?.results || []).slice(0, NEW_PREVIEW_COUNT)}
            isLoading={isNewVideosLoading}
            seeAllTo="/watch"
            linkTo={(slug) => `/watch/${slug}`}
          />
          <ContentTypeSection
            title="New Quick Reads"
            icon={Zap}
            theme="amber"
            subtitle="The latest short summaries."
            stories={(newQuickReads?.results || []).slice(0, NEW_PREVIEW_COUNT)}
            isLoading={isNewQuickReadsLoading}
            seeAllTo="/quick-reads"
            linkTo={(slug) => `/quick-read/${slug}`}
          />

          <section className={`rounded-2xl border p-4 sm:p-6 ${SECTION_THEMES.slate.wrap}`}>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
                  <Newspaper className={`h-5 w-5 ${SECTION_THEMES.slate.icon}`} />
                  New Blog Posts
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">The latest from the WorldStories blog.</p>
              </div>
              <Link
                to="/blog"
                className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium sm:text-sm ${SECTION_THEMES.slate.link}`}
              >
                See all
              </Link>
            </div>
            {isNewBlogsLoading ? (
              <div className="py-6 text-sm text-muted-foreground">Loading...</div>
            ) : (newBlogs?.results || []).length === 0 ? (
              <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
                No blog posts yet.
              </div>
            ) : (
              <Carousel opts={{ align: "start" }} className="px-1">
                <CarouselContent>
                  {(newBlogs?.results || []).slice(0, NEW_PREVIEW_COUNT).map((blog) => (
                    <CarouselItem key={blog.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                      <BlogCard blog={blog} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            )}
          </section>
        </div>

        <AdSpace size="banner" className="mb-8" contentType="discover" />

        {/* Hidden Gems — a list, not a grid, so the rating (the whole point of this section)
            reads as the headline rather than competing visually with cover art. */}
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Gem className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Hidden Gems</h2>
            <span className="text-xs text-muted-foreground">Highly rated, quietly read</span>
          </div>
          <div className="space-y-2">
            {data.hidden_gems.map((story) => (
              <Link
                key={story.id}
                to={`/read/${story.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/50 sm:gap-4"
              >
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:h-20 sm:w-14">
                  <CoverImage
                    src={story.cover_image}
                    alt={story.title}
                    author={story.author}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary sm:text-base">
                    {story.title}
                  </h3>
                  {(story.genres?.length ?? 0) > 0 && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{story.genres!.join(" · ")}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground sm:text-sm">
                  <div className="flex items-center gap-1 font-semibold text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {story.rating.toFixed(1)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {formatViews(story.views)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Discover;
