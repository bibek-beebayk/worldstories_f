import { Eye, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrendingStory {
  rank: number;
  title: string;
  image: string;
  rating: number;
  views: string;
  genres: string[];
}

const stories: TrendingStory[] = [
  {
    rank: 1,
    title: "The Delinquent Heiress",
    image: "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=200&h=200&fit=crop",
    rating: 4.6,
    views: "74,197",
    genres: ["ROMANCE", "DRAMA"]
  },
  {
    rank: 2,
    title: "Spirit Tracer",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&h=200&fit=crop",
    rating: 4.5,
    views: "74,197",
    genres: ["ACTION", "FANTASY"]
  },
  {
    rank: 3,
    title: "Mastery",
    image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=200&h=200&fit=crop",
    rating: 4.6,
    views: "74,197",
    genres: ["FICTION", "ROMANCE"]
  },
  {
    rank: 4,
    title: "Tales Of The Dragon Consort",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=200&fit=crop",
    rating: 4.5,
    views: "74,197",
    genres: ["FANTASY", "THRILLER"]
  },
  {
    rank: 5,
    title: "Magnioli of the Azure Sea",
    image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=200&h=200&fit=crop",
    rating: 4.6,
    views: "74,197",
    genres: ["FICTION", "CRIME"]
  }
];

const TrendingList = () => {
  return (
    <div className="space-y-4">
      {stories.map((story) => (
        <div key={story.rank} className="flex gap-4 group cursor-pointer">
          <div className="flex-shrink-0 w-8 text-2xl font-bold text-muted-foreground">
            {story.rank}
          </div>
          
          <div className="flex-shrink-0">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden shadow-md">
              <img 
                src={story.image} 
                alt={story.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1 truncate group-hover:text-primary transition-colors">
              {story.title}
            </h4>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{story.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{story.views}</span>
              </div>
            </div>
            
            <div className="flex gap-1 flex-wrap">
              {story.genres.map((genre) => (
                <Badge key={genre} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrendingList;
