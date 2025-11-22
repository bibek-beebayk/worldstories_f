import { useState } from "react";
import Header from "@/components/Header";
import StoryCard from "@/components/StoryCard";
import AdSpace from "@/components/AdSpace";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const Catalogue = () => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const genres = ["Romance", "Fantasy", "Mystery", "Sci-Fi", "Horror", "Drama", "Comedy", "Action"];
  
  const stories = [
    { title: "Echoes of Tomorrow", image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80", rating: 4.8, views: "2.3M", genre: "Sci-Fi" },
    { title: "The Last Kingdom", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80", rating: 4.9, views: "3.1M", genre: "Fantasy" },
    { title: "Mystery at Midnight", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80", rating: 4.7, views: "1.8M", genre: "Mystery" },
    { title: "Love in Paris", image: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=80", rating: 4.6, views: "2.9M", genre: "Romance" },
    { title: "Dark Waters", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80", rating: 4.5, views: "1.5M", genre: "Horror" },
    { title: "The Silent Witness", image: "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400&q=80", rating: 4.8, views: "2.1M", genre: "Drama" },
    { title: "Galactic Warriors", image: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&q=80", rating: 4.7, views: "2.7M", genre: "Action" },
    { title: "The Comedy Club", image: "https://images.unsplash.com/photo-1533167649158-6d508895b680?w=400&q=80", rating: 4.4, views: "1.2M", genre: "Comedy" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Filters</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Sort By</Label>
                    <Select defaultValue="popular">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popular">Most Popular</SelectItem>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                        <SelectItem value="views">Most Viewed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium mb-3 block">Status</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stories</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium mb-3 block">Genres</Label>
                    <div className="space-y-3">
                      {genres.map((genre) => (
                        <div key={genre} className="flex items-center space-x-2">
                          <Checkbox 
                            id={genre}
                            checked={selectedGenres.includes(genre)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGenres([...selectedGenres, genre]);
                              } else {
                                setSelectedGenres(selectedGenres.filter(g => g !== genre));
                              }
                            }}
                          />
                          <Label htmlFor={genre} className="text-sm font-normal cursor-pointer">
                            {genre}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium mb-3 block">Rating</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="4.5">4.5+ Stars</SelectItem>
                        <SelectItem value="4.0">4.0+ Stars</SelectItem>
                        <SelectItem value="3.5">3.5+ Stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <AdSpace size="rectangle" />
            </div>
          </aside>

          {/* Stories Grid */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Browse Stories</h1>
              <p className="text-muted-foreground">Discover amazing stories from talented creators</p>
            </div>

            <AdSpace size="banner" className="mb-8" />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {stories.map((story, index) => (
                <StoryCard key={index} {...story} />
              ))}
            </div>

            <AdSpace size="banner" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Catalogue;
