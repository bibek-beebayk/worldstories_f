import Header from "@/components/Header";
import StoryCard from "@/components/StoryCard";
import AdSpace from "@/components/AdSpace";

const Originals = () => {
  const originalStories = [
    { title: "The Crown of Shadows", image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80", rating: 4.9, views: "5.2M", genre: "Fantasy" },
    { title: "Neon Dreams", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80", rating: 4.8, views: "4.8M", genre: "Sci-Fi" },
    { title: "Whispers of the Heart", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80", rating: 4.9, views: "6.1M", genre: "Romance" },
    { title: "The Last Stand", image: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=80", rating: 4.7, views: "3.9M", genre: "Action" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">WorldStories Originals</h1>
          <p className="text-lg text-muted-foreground">Exclusive stories created by our featured authors</p>
        </div>

        <AdSpace size="banner" className="mb-8" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
          {originalStories.map((story, index) => (
            <StoryCard key={index} {...story} />
          ))}
        </div>

        <AdSpace size="banner" />
      </main>
    </div>
  );
};

export default Originals;
