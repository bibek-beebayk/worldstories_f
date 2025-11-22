import { Eye, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface StoryCardProps {
  title: string;
  image: string;
  rating: number;
  views: string;
  genre?: string;
}

const StoryCard = ({ title, image, rating, views, genre }: StoryCardProps) => {
  return (
    <Link to="/story/1" className="group cursor-pointer block">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 shadow-md">
        <img 
          src={image} 
          alt={title}
          className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {genre && (
          <Badge className="absolute top-2 left-2 bg-black/70 text-white border-0">
            {genre}
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
          <span>{views}</span>
        </div>
      </div>
    </Link>
  );
};

export default StoryCard;
