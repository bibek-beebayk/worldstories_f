import { Eye, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { formatViews } from "@/lib/utils";

interface StoryCardProps {
  id: number;
  slug: string;
  title: string;
  cover_image: string;
  rating: number;
  views: number;
  story_type?: string;
}

const StoryCard = ({ title, cover_image, rating, views, story_type, slug }: StoryCardProps) => {
  return (
    <Link to={`/story/${slug}/`} className="group cursor-pointer block">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 shadow-md">
        <img 
          src={cover_image} 
          alt={title}
          className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {story_type && (
          <Badge className="absolute top-2 left-2 bg-black/70 text-white border-0">
            {story_type}
          </Badge>
        )}
      </div>
      
      <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{rating}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          <span>{formatViews(views)}</span>
        </div>
      </div>
    </Link>
  );
};

export default StoryCard;
