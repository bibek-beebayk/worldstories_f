import StoryCard from "@/components/StoryCard";
import AdSpace from "@/components/AdSpace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useTrendingData } from "@/hooks/useTrendingData";

const Trending = () => {
  const { data, isLoading, isError } = useTrendingData();
  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load trending stories.</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}
      
      <main className="container mx-auto px-4 py-8">

        <div className="mb-8 bg-blue-800 p-8 rounded-lg shadow-md">
          <h1 className="text-4xl font-bold mb-3 text-gray-100">Trending Now</h1>
          <p className="text-lg text-muted-foreground text-gray-300">The hottest stories everyone's reading</p>
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
              {data.today.map((story) => (
                <StoryCard key={story.id} {...story} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="week" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {data.week.map((story) => (
                <StoryCard key={story.id} {...story} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="month" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {data.month.map((story) => (
                <StoryCard key={story.id} {...story} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="alltime" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {data.alltime.map((story) => (
                <StoryCard key={story.id} {...story} />
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
