import Header from "@/components/Header";
import StoryCard from "@/components/StoryCard";
import AdSpace from "@/components/AdSpace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Trending = () => {
  const trendingStories = [
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
          <h1 className="text-4xl font-bold mb-3">Trending Now</h1>
          <p className="text-lg text-muted-foreground">The hottest stories everyone's reading</p>
        </div>

        <AdSpace size="banner" className="mb-8" />

        <Tabs defaultValue="today" className="mb-8">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="alltime">All Time</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {trendingStories.map((story, index) => (
                <StoryCard key={index} {...story} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="week" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {trendingStories.map((story, index) => (
                <StoryCard key={index} {...story} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="month" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {trendingStories.map((story, index) => (
                <StoryCard key={index} {...story} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="alltime" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {trendingStories.map((story, index) => (
                <StoryCard key={index} {...story} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <AdSpace size="banner" />
      </main>
    </div>
  );
};

export default Trending;
