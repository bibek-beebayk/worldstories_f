import { Eye, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Story } from "@/api/types";
import { formatViews } from "@/lib/utils";

interface TrendingListProps {
  stories: Story[];
}

const TrendingList = ({ stories }: TrendingListProps) => {
  return (
    <div className="space-y-4">
      {stories.map((story, index) => (
        <Link to={`/story/${story.slug}/`} key={story.id} className="flex gap-4 group cursor-pointer">
          <div className="flex-shrink-0 w-8 text-2xl font-bold text-muted-foreground">
            {index + 1}
          </div>
          
          <div className="flex-shrink-0">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden shadow-md">
              <img 
                src={story.cover_image} 
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
                <span>{formatViews(story.views)}</span>
              </div>
            </div>
            
            <div className="flex gap-1 flex-wrap">
              {(story.genres || []).map((genre) => (
                <Badge key={genre} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default TrendingList;
