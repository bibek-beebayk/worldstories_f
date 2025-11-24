import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Badge } from "@/components/ui/badge";
import { useStories } from "@/hooks/useStories";

const Discover = () => {

  const { data: stories, isLoading, isError } = useStories();

  if (isLoading) return < FullScreenLoader />;

  console.log("Stories: ", stories);

  const genres = [
    { name: "Romance", count: "2.3K", color: "bg-pink-500" },
    { name: "Fantasy", count: "1.8K", color: "bg-purple-500" },
    { name: "Mystery", count: "1.5K", color: "bg-blue-500" },
    { name: "Sci-Fi", count: "1.2K", color: "bg-cyan-500" },
    { name: "Horror", count: "900", color: "bg-red-500" },
    { name: "Drama", count: "1.1K", color: "bg-amber-500" },
  ];

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
            {genres.map((genre) => (
              <Badge
                key={genre.name}
                variant = "outline"
                className={`px-4 py-2 text-base cursor-pointer hover:bg-blue-500 hover:text-primary-foreground transition-colors`}
              >
                {genre.name} ({genre.count})
              </Badge>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">New Releases</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {stories?.results?.map((story, index) => (
              <StoryCard key={index} {...story} />
            ))}
          </div>
        </div>

        <AdSpace size="banner" className="mb-8" />

        {/* <div>
          <h2 className="text-2xl font-bold mb-6">Hidden Gems</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {stories?.results?.map((story, index) => (
              <StoryCard key={index} {...story} />
            ))}
          </div>
        </div> */}
      </main>
    </div>
  );
};

export default Discover;
