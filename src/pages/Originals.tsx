import StoryCard from "@/components/StoryCard";
import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useOriginalsData } from "@/hooks/useOriginalsData";

const Originals = () => {
  const { data, isLoading, isError } = useOriginalsData();
  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load originals.</div>;

  return (
    <div className="min-h-screen bg-background">

      <main className="container mx-auto px-4 py-8">

        <div className="mb-8 bg-blue-800 p-8 rounded-lg shadow-md">
          <h1 className="text-4xl font-bold mb-3 text-gray-100">WorldStories Originals</h1>
          <p className="text-lg text-muted-foreground text-gray-300">Exclusive stories created by our featured authors</p>
        </div>

        <AdSpace size="banner" className="mb-8" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          {data.stories.map((story) => (
            <StoryCard key={story.id} {...story} />
          ))}
        </div>

        <AdSpace size="banner" />
      </main>
    </div>
  );
};

export default Originals;
