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
  "border-amber-400/50 bg-amber-400/15 text-amber-600",
  "border-slate-300/60 bg-slate-300/20 text-slate-600",
  "border-orange-400/50 bg-orange-400/15 text-orange-700",
];

const rankClass = (index: number) => RANK_STYLES[index] || "border-border bg-muted text-muted-foreground";

// Cycled per card (not one color per section) so each individual genre/
// category/story-type/language tile in a grid gets a visually distinct
// background — distinct from the content-type SECTION_THEMES used above,
// since a page with both shouldn't reuse the same colors for two different
// kinds of grouping.
const CARD_PALETTE = [
  {
    wrap: "border-violet-200/60 bg-gradient-to-br from-violet-50 to-purple-50 hover:border-violet-400",
    icon: "bg-violet-600/10 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    wrap: "border-teal-200/60 bg-gradient-to-br from-teal-50 to-cyan-50 hover:border-teal-400",
    icon: "bg-teal-600/10 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
  },
  {
    wrap: "border-orange-200/60 bg-gradient-to-br from-orange-50 to-amber-50 hover:border-orange-400",
    icon: "bg-orange-600/10 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
  },
  {
    wrap: "border-cyan-200/60 bg-gradient-to-br from-cyan-50 to-sky-50 hover:border-cyan-400",
    icon: "bg-cyan-600/10 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
  },
  {
    wrap: "border-rose-200/60 bg-gradient-to-br from-rose-50 to-pink-50 hover:border-rose-400",
    icon: "bg-rose-600/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
  },
  {
    wrap: "border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-blue-50 hover:border-indigo-400",
    icon: "bg-indigo-600/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
  },
  {
    wrap: "border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-green-50 hover:border-emerald-400",
    icon: "bg-emerald-600/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    wrap: "border-amber-200/60 bg-gradient-to-br from-amber-50 to-yellow-50 hover:border-amber-400",
    icon: "bg-amber-600/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
  },
  {
    wrap: "border-fuchsia-200/60 bg-gradient-to-br from-fuchsia-50 to-pink-50 hover:border-fuchsia-400",
    icon: "bg-fuchsia-600/10 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white",
  },
  {
    wrap: "border-lime-200/60 bg-gradient-to-br from-lime-50 to-green-50 hover:border-lime-400",
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_50%),linear-gradient(to_bottom,#f8fafc,transparent_280px)]">
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-6 rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
            <Compass className="h-3.5 w-3.5" />
            Discover
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Discover</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Browse by genre, story type, or language, catch what's fresh, and dig up stories most readers miss.
          </p>
        </div>

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
          <div className="mb-5 rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100 p-5 sm:p-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-300 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
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
