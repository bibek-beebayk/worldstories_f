import { Eye, Star, Headphones } from "lucide-react";
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
  has_audio?: boolean;
  compact?: boolean;
}

const StoryCard = ({ title, cover_image, rating, views, story_type, slug, has_audio, compact = false }: StoryCardProps) => {
  return (
    <Link to={`/story/${slug}/`} className="group cursor-pointer block">
      <div className={`relative overflow-hidden rounded-lg ${compact ? "mb-2 aspect-[4/5] shadow-sm" : "mb-3 aspect-[3/4] shadow-md"}`}>
        <img 
          src={cover_image} 
          alt={title}
          className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {story_type && (
          <Badge className={`absolute left-2 border-0 bg-black/70 text-white ${compact ? "top-1.5 px-1.5 py-0 text-[10px]" : "top-2"}`}>
            {story_type}
          </Badge>
        )}
        {has_audio && (
          // <Badge className="absolute top-2 right-2 bg-black/70 text-white border-0">
          //   {story_type}
          // </Badge>
          <div className={`absolute rounded-full bg-red-600 opacity-80 ${compact ? "right-1.5 top-1.5 h-4 w-4 p-[3px]" : "right-2 top-2 h-5 w-5 p-1"}`}>
            <Headphones className={`text-white ${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
          </div>
        )}
      </div>
      
      <h3 className={`line-clamp-2 font-semibold transition-colors group-hover:text-primary ${compact ? "mb-1 text-xs" : "mb-2 text-sm"}`}>
        {title}
      </h3>
      
      <div className={`flex items-center text-muted-foreground ${compact ? "gap-2 text-[11px]" : "gap-3 text-xs"}`}>
        <div className="flex items-center gap-1">
          <Star className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} fill-amber-400 text-amber-400`} />
          <span>{rating}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          <span>{formatViews(views)}</span>
        </div>
      </div>
    </Link>
  );
};

export default StoryCard;
