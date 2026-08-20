import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDiscoverData } from "@/hooks/useDiscoverData";
import { storyApi } from "@/api/story";
import type { Route } from "./+types/Discover";
import { formatRelativeDate, formatViews } from "@/lib/utils";
import {
  BookOpenText,
  Compass,
  Eye,
  Flame,
  Gem,
  Heart,
  Languages,
  MessageSquare,
  Sparkles,
  Star,
  Tag,
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
          to={`/story/${story.slug}`}
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

const Discover = ({ loaderData }: Route.ComponentProps) => {
  const { data, isLoading, isError } = useDiscoverData(loaderData);
  const location = useLocation();

  useEffect(() => {
    if (!data || location.hash !== "#trending") return;
    requestAnimationFrame(() => document.getElementById("trending")?.scrollIntoView({ block: "start" }));
  }, [data, location.hash]);

  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load discover content.</div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_50%),linear-gradient(to_bottom,#f8fafc,transparent_280px)]">
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-6 rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
            <Compass className="h-3.5 w-3.5" />
            Discover
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Discover</h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            Browse by genre, story type, or language, catch what's fresh, and dig up stories most readers miss.
          </p>
        </div>

        {/* Genre browsing — the primary entry point into this page. Clicking a genre hands
            off to the Library's full filtering experience rather than duplicating it here. */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Browse by Genre</h2>
          </div>
          <Carousel opts={{ align: "start" }} className="px-1">
            <CarouselContent>
              {data.genres.map((genre) => (
                <CarouselItem key={genre.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                  <Link
                    to={`/library?genre=${genre.id}`}
                    className="group flex min-h-28 h-full flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Sparkles className="h-4 w-4 text-primary/70 transition-colors group-hover:text-primary" />
                    <div className="mt-3">
                      <p className="text-sm font-semibold leading-tight">{genre.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatViews(genre.stories_count)} {genre.stories_count === 1 ? "story" : "stories"}
                      </p>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        {/* Categories are a separate, admin-managed taxonomy from genres —
            same browsing pattern, independent list. */}
        {data.categories.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold sm:text-xl">Browse by Category</h2>
            </div>
            <Carousel opts={{ align: "start" }} className="px-1">
              <CarouselContent>
                {data.categories.map((category) => (
                  <CarouselItem key={category.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                    <Link
                      to={`/library?category=${category.id}`}
                      className="group flex min-h-28 h-full flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Sparkles className="h-4 w-4 text-primary/70 transition-colors group-hover:text-primary" />
                      <div className="mt-3">
                        <p className="text-sm font-semibold leading-tight">{category.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatViews(category.stories_count)} {category.stories_count === 1 ? "story" : "stories"}
                        </p>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </section>
        )}

        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Browse by Story Type</h2>
          </div>
          <Carousel opts={{ align: "start" }} className="px-1">
            <CarouselContent>
              {data.story_types?.map((storyType) => (
                <CarouselItem key={storyType.value} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <Link
                    to={`/library?story_type=${encodeURIComponent(storyType.value)}`}
                    className="group flex min-h-24 h-full items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <BookOpenText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight">{storyType.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatViews(storyType.stories_count)} {storyType.stories_count === 1 ? "story" : "stories"}
                      </span>
                    </span>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Browse by Language</h2>
          </div>
          <Carousel opts={{ align: "start" }} className="px-1">
            <CarouselContent>
              {data.languages?.map((language) => (
                <CarouselItem key={language.value} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                  <Link
                    to={`/library?language=${encodeURIComponent(language.value)}`}
                    className="group flex min-h-24 h-full flex-col justify-center rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="text-sm font-semibold">{language.label}</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {formatViews(language.stories_count)} {language.stories_count === 1 ? "story" : "stories"}
                    </span>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        <AdSpace size="banner" className="mb-8" />

        <section id="trending" className="mb-8 scroll-mt-24">
          <div className="mb-5 rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100 p-5 sm:p-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
              <Flame className="h-3.5 w-3.5" />
              Live Leaderboard
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Trending Now</h2>
            <p className="mt-2 text-sm text-slate-700 sm:text-base">
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

        {/* New Releases — a horizontal shelf emphasizing recency, not another grid-in-a-box. */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">New Releases</h2>
          </div>
          <Carousel opts={{ align: "start" }} className="px-1">
            <CarouselContent>
              {data.new_releases.map((story) => (
                <CarouselItem key={story.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                  <Link to={`/story/${story.slug}`} className="group block">
                    <div className="relative mb-2 aspect-[3/4] overflow-hidden rounded-lg bg-muted shadow-sm">
                      <CoverImage
                        src={story.cover_image}
                        alt={story.title}
                        author={story.author}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {story.site_published_date && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                          {formatRelativeDate(story.site_published_date)}
                        </span>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-xs font-semibold transition-colors group-hover:text-primary sm:text-sm">
                      {story.title}
                    </h3>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        <AdSpace size="banner" className="mb-8" />

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
                to={`/story/${story.slug}`}
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
