import Header from "@/components/Header";
import StoryCard from "@/components/StoryCard";
import AdSpace from "@/components/AdSpace";
import { Badge } from "@/components/ui/badge";

const Discover = () => {
  const genres = [
    { name: "Romance", count: "2.3K", color: "bg-pink-500" },
    { name: "Fantasy", count: "1.8K", color: "bg-purple-500" },
    { name: "Mystery", count: "1.5K", color: "bg-blue-500" },
    { name: "Sci-Fi", count: "1.2K", color: "bg-cyan-500" },
    { name: "Horror", count: "900", color: "bg-red-500" },
    { name: "Drama", count: "1.1K", color: "bg-amber-500" },
  ];

  const stories = [
    { title: "Echoes of Tomorrow", image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80", rating: 4.8, views: "2.3M", genre: "Sci-Fi" },
    { title: "The Last Kingdom", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80", rating: 4.9, views: "3.1M", genre: "Fantasy" },
    { title: "Mystery at Midnight", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80", rating: 4.7, views: "1.8M", genre: "Mystery" },
    { title: "Love in Paris", image: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=80", rating: 4.6, views: "2.9M", genre: "Romance" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">Discover</h1>
          <p className="text-lg text-muted-foreground">Find your next favorite story</p>
        </div>

        <AdSpace size="banner" className="mb-8" />

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Browse by Genre</h2>
          <div className="flex flex-wrap gap-3">
            {genres.map((genre) => (
              <Badge 
                key={genre.name}
                variant="outline"
                className="px-4 py-2 text-base cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {genre.name} ({genre.count})
              </Badge>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">New Releases</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {stories.map((story, index) => (
              <StoryCard key={index} {...story} />
            ))}
          </div>
        </div>

        <AdSpace size="banner" className="mb-8" />

        <div>
          <h2 className="text-2xl font-bold mb-6">Hidden Gems</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {stories.map((story, index) => (
              <StoryCard key={index} {...story} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Discover;
