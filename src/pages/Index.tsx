import HeroSection from "@/components/HeroSection";
import StoryCard from "@/components/StoryCard";
import TrendingList from "@/components/TrendingList";
import Sidebar from "@/components/Sidebar";
import AdSpace from "@/components/AdSpace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useHomeData } from "@/hooks/useHomeData";

const Index = () => {
  const { data, isLoading, isError } = useHomeData();

  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) return <div className="container px-4 py-12">Failed to load home data.</div>;

  return (
    <div className="min-h-screen bg-background">
      <HeroSection featuredStory={data.featured_story} />
      
      <div className="container px-4 py-12">
        <AdSpace size="banner" className="mb-12" />
        
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <main className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6">Weekly Spotlight</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {data.weekly_spotlight.map((story) => (
                  <StoryCard key={story.id} {...story} />
                ))}
              </div>
            </section>

            <AdSpace size="banner" />

            <section>
              <h2 className="text-2xl font-bold mb-6">New & Trending</h2>
              <TrendingList stories={data.new_trending} />
            </section>

            <AdSpace size="banner" />

            <section>
              <Tabs defaultValue="recommended" className="w-full">
                <TabsList className="mb-6 flex flex-wrap">
                  <TabsTrigger value="recommended">Recommended for You</TabsTrigger>
                  <TabsTrigger value="popular">Popular</TabsTrigger>
                  <TabsTrigger value="new">What's New</TabsTrigger>
                </TabsList>
                
                <TabsContent value="recommended">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {data.tabs.recommended.map((story) => (
                      <StoryCard key={story.id} {...story} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="popular">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {data.tabs.popular.map((story) => (
                      <StoryCard key={story.id} {...story} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="new">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {data.tabs.new.map((story) => (
                      <StoryCard key={story.id} {...story} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          </main>

          <Sidebar stories={data.sidebar.recommended} stats={data.sidebar.stats} />
        </div>
      </div>

      {/* < Footer /> */}

      {/* <footer className="border-t border-border bg-muted/50 mt-16">
        <div className="container px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <span className="text-lg font-bold text-primary-foreground">V</span>
              </div>
              <span className="text-lg font-bold">VoyceMe</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              © 2024 Genesite LLC, All rights reserved.
            </div>
          </div>
        </div>
      </footer> */}
    </div>
  );
};

export default Index;
