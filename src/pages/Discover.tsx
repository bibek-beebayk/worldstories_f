import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Badge } from "@/components/ui/badge";
import { useDiscoverData } from "@/hooks/useDiscoverData";
import { formatViews } from "@/lib/utils";
import { Compass, Gem, Sparkles, Tag } from "lucide-react";

const Discover = () => {
  const { data, isLoading, isError } = useDiscoverData();

  if (isLoading) return < FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load discover content.</div>;


  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_50%),linear-gradient(to_bottom,#f8fafc,transparent_280px)]">
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-6 rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
            <Compass className="h-3.5 w-3.5" />
            Explore
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Discover</h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            Find new releases, hidden gems, and stories matched to your taste.
          </p>
        </div>

        <section className="mb-8 rounded-2xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Browse by Genre</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.genres.map((genre) => (
              <Badge
                key={genre.id}
                variant="outline"
                className="cursor-pointer rounded-full px-3 py-1 text-xs hover:bg-primary hover:text-primary-foreground sm:text-sm"
              >
                {genre.name} ({formatViews(genre.stories_count)})
              </Badge>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-2xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">New Releases</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
            {data.new_releases.map((story) => (
              <StoryCard key={story.id} {...story} />
            ))}
          </div>
        </section>

        <AdSpace size="banner" className="mb-8" />

        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Gem className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Hidden Gems</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
            {data.hidden_gems.map((story) => (
              <StoryCard key={story.id} {...story} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Discover;
