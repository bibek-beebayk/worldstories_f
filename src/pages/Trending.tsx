import { Link } from "react-router-dom";
import AdSpace from "@/components/AdSpace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useTrendingData } from "@/hooks/useTrendingData";
import { formatViews } from "@/lib/utils";
import { Eye, Flame, Heart, MessageSquare, Star } from "lucide-react";
import Seo, { SITE_URL } from "@/components/Seo";
import { Story, TrendingDataResponse } from "@/api/types";
import CoverImage from "@/components/CoverImage";

const RANK_STYLES = [
  "border-amber-400/50 bg-amber-400/15 text-amber-600",
  "border-slate-300/60 bg-slate-300/20 text-slate-600",
  "border-orange-400/50 bg-orange-400/15 text-orange-700",
];

const rankClass = (index: number) => RANK_STYLES[index] || "border-border bg-muted text-muted-foreground";

const TABS: {
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

const Trending = () => {
  const { data, isLoading, isError } = useTrendingData();
  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load trending stories.</div>;

  const renderLeaderboard = (stories: Story[], metricFn: (story: Story) => { icon: typeof Eye; value: string }) => (
    <div className="space-y-2 sm:space-y-3">
      {stories.map((story, index) => {
        const { icon: MetricIcon, value } = metricFn(story);
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
                loading={index < 3 ? "eager" : "lazy"}
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.08),transparent_52%),linear-gradient(to_bottom,#fff7ed,transparent_260px)]">
      <Seo
        title="Trending Now — Today's Most-Read Stories | WorldStories"
        description="See which stories readers are opening, sharing, and finishing right now, ranked by views, rating, favorites, and discussion."
        path="/trending"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Trending Now — WorldStories",
          url: `${SITE_URL}/trending`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: data.most_viewed.slice(0, 20).map((story, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${SITE_URL}/story/${story.slug}`,
              name: story.title,
            })),
          },
        }}
      />
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-6 rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100 p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
            <Flame className="h-3.5 w-3.5" />
            Live Leaderboard
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Trending Now
          </h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            Ranked four different ways — see who's leading by reads, rating, favorites, and discussion.
          </p>
        </div>

        <AdSpace size="banner" className="mb-8" />

        <Tabs defaultValue="most_viewed" className="mb-8">
          <TabsList className="mb-5 flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl p-1 whitespace-nowrap">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="shrink-0 gap-1.5 text-xs sm:text-sm">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {renderLeaderboard(data[tab.data], tab.metric)}
            </TabsContent>
          ))}
        </Tabs>

        <AdSpace size="banner" />
      </main>
    </div>
  );
};

export default Trending;
