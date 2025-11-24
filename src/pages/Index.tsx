import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StoryCard from "@/components/StoryCard";
import TrendingList from "@/components/TrendingList";
import Sidebar from "@/components/Sidebar";
import AdSpace from "@/components/AdSpace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Footer from "@/components/Footer";

const spotlightStories = [
  { title: "AFK", image: "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=300&h=400&fit=crop", rating: 4.6, views: "74,197", genre: "FANTASY" },
  { title: "The Mad Gate", image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=400&fit=crop", rating: 4.6, views: "74,197", genre: "ACTION" },
  { title: "Chaos Girl", image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=300&h=400&fit=crop", rating: 4.6, views: "74,197", genre: "ROMANCE" },
  { title: "Carrier of the Mask", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop", rating: 4.6, views: "74,197", genre: "THRILLER" },
  { title: "Sunshine Cafe", image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&h=400&fit=crop", rating: 4.6, views: "74,197", genre: "SLICE OF LIFE" },
  { title: "Dishonor", image: "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=300&h=400&fit=crop", rating: 4.6, views: "74,197", genre: "DRAMA" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}
      <HeroSection />
      
      <div className="container px-4 py-12">
        <AdSpace size="banner" className="mb-12" />
        
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <main className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6">Weekly Spotlight</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {spotlightStories.map((story, index) => (
                  <StoryCard key={index} {...story} />
                ))}
              </div>
            </section>

            <AdSpace size="banner" />

            <section>
              <h2 className="text-2xl font-bold mb-6">New & Trending</h2>
              <TrendingList />
            </section>

            <AdSpace size="banner" />

            <section>
              <Tabs defaultValue="recommended" className="w-full">
                <TabsList className="mb-6 flex flex-wrap">
                  <TabsTrigger value="recommended">Recommended for You</TabsTrigger>
                  <TabsTrigger value="popular">Popular</TabsTrigger>
                  <TabsTrigger value="originals">Originals</TabsTrigger>
                  <TabsTrigger value="new">What's New</TabsTrigger>
                </TabsList>
                
                <TabsContent value="recommended">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {spotlightStories.map((story, index) => (
                      <StoryCard key={index} {...story} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="popular">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {[...spotlightStories].reverse().map((story, index) => (
                      <StoryCard key={index} {...story} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="originals">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {spotlightStories.slice(0, 3).map((story, index) => (
                      <StoryCard key={index} {...story} />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="new">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {spotlightStories.slice(3).map((story, index) => (
                      <StoryCard key={index} {...story} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          </main>

          <Sidebar />
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
