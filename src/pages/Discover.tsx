import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Badge } from "@/components/ui/badge";
import { useDiscoverData } from "@/hooks/useDiscoverData";
import { formatViews } from "@/lib/utils";

const Discover = () => {
  const { data, isLoading, isError } = useDiscoverData();

  if (isLoading) return < FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load discover content.</div>;


  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 bg-blue-800 p-8 rounded-lg shadow-md">
          <h1 className="text-4xl font-bold mb-3 text-gray-100">Discover</h1>
          <p className="text-lg text-muted-foreground text-gray-200">Find your next favorite story</p>
        </div>

        {/* <AdSpace size="banner" className="mb-8" /> */}

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Browse by Genre</h2>
          <div className="flex flex-wrap gap-3">
            {data.genres.map((genre) => (
              <Badge
                key={genre.id}
                variant = "outline"
                className={`px-4 py-2 text-base cursor-pointer hover:bg-blue-500 hover:text-primary-foreground transition-colors`}
              >
                {genre.name} ({formatViews(genre.stories_count)})
              </Badge>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">New Releases</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {data.new_releases.map((story) => (
              <StoryCard key={story.id} {...story} />
            ))}
          </div>
        </div>

        <AdSpace size="banner" className="mb-8" />

        <div>
          <h2 className="text-2xl font-bold mb-6">Hidden Gems</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {data.hidden_gems.map((story) => (
              <StoryCard key={story.id} {...story} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Discover;
