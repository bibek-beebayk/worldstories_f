import StoryCard from "@/components/StoryCard";
import AdSpace from "@/components/AdSpace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useTrendingData } from "@/hooks/useTrendingData";
import { Flame, TrendingUp } from "lucide-react";

const Trending = () => {
  const { data, isLoading, isError } = useTrendingData();
  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load trending stories.</div>;

  const renderTrendingSection = (stories: typeof data.today) => {
    const [featured, ...rest] = stories;

    return (
      <div className="space-y-6">
        {featured && (
          <div className="rounded-2xl border bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Flame className="h-4 w-4" />
              Top Pick
            </div>
            <div className="grid items-center gap-4 sm:grid-cols-[140px_1fr]">
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={featured.cover_image}
                  alt={featured.title}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight">{featured.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This story is currently leading the chart in this window.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
          {rest.map((story) => (
            <StoryCard key={story.id} {...story} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.09),transparent_52%),linear-gradient(to_bottom,#f8fafc,transparent_260px)]">
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-6 rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-100 p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            <TrendingUp className="h-3.5 w-3.5" />
            Live Ranking
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Trending Now
          </h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            The stories readers are opening, sharing, and finishing right now.
          </p>
        </div>

        <AdSpace size="banner" className="mb-8" />

        <Tabs defaultValue="today" className="mb-8">
          <TabsList className="mb-5 flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl p-1 whitespace-nowrap">
            <TabsTrigger value="today" className="shrink-0 text-xs sm:text-sm">Today</TabsTrigger>
            <TabsTrigger value="week" className="shrink-0 text-xs sm:text-sm">This Week</TabsTrigger>
            <TabsTrigger value="month" className="shrink-0 text-xs sm:text-sm">This Month</TabsTrigger>
            <TabsTrigger value="alltime" className="shrink-0 text-xs sm:text-sm">All Time</TabsTrigger>
          </TabsList>

          <TabsContent value="today">{renderTrendingSection(data.today)}</TabsContent>
          <TabsContent value="week">{renderTrendingSection(data.week)}</TabsContent>
          <TabsContent value="month">{renderTrendingSection(data.month)}</TabsContent>
          <TabsContent value="alltime">{renderTrendingSection(data.alltime)}</TabsContent>
        </Tabs>

        <AdSpace size="banner" />
      </main>
    </div>
  );
};

export default Trending;
