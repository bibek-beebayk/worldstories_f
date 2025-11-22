import StoryCard from "./StoryCard";
import AdSpace from "./AdSpace";
import { Users, BookOpen, Eye } from "lucide-react";

const stories = [
  { title: "Carrier of the Mask", image: "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=300&h=400&fit=crop", rating: 4.6, views: "74,197" },
  { title: "Sunshine Cafe", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop", rating: 4.6, views: "74,197" },
  { title: "Dishonor", image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&h=400&fit=crop", rating: 4.6, views: "74,197" },
];

const Sidebar = () => {
  return (
    <aside className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
          Recommended for You
        </h2>
        <div className="space-y-4">
          {stories.map((story, index) => (
            <StoryCard key={index} {...story} />
          ))}
        </div>
      </div>

      <AdSpace size="square" />

      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">42.5k</div>
            <div className="text-xs text-muted-foreground">CREATORS</div>
          </div>
          <div>
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">16.1k</div>
            <div className="text-xs text-muted-foreground">STORIES</div>
          </div>
          <div>
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">8.9k</div>
            <div className="text-xs text-muted-foreground">READERS</div>
          </div>
        </div>
      </div>

      <AdSpace size="rectangle" />
    </aside>
  );
};

export default Sidebar;
