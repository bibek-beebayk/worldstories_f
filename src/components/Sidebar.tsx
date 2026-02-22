import StoryCard from "./StoryCard";
import AdSpace from "./AdSpace";
import { Users, BookOpen, Eye } from "lucide-react";
import { Story } from "@/api/types";
import { formatViews } from "@/lib/utils";

interface SidebarProps {
  stories: Story[];
  stats: {
    creators: number;
    stories: number;
    readers: number;
  };
}

const Sidebar = ({ stories, stats }: SidebarProps) => {
  return (
    <aside className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
          Recommended for You
        </h2>
        <div className="space-y-4">
          {stories.map((story) => (
            <StoryCard key={story.id} {...story} />
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
            <div className="text-2xl font-bold">{formatViews(stats.creators)}</div>
            <div className="text-xs text-muted-foreground">CREATORS</div>
          </div>
          <div>
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">{formatViews(stats.stories)}</div>
            <div className="text-xs text-muted-foreground">STORIES</div>
          </div>
          <div>
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">{formatViews(stats.readers)}</div>
            <div className="text-xs text-muted-foreground">READERS</div>
          </div>
        </div>
      </div>

      <AdSpace size="rectangle" />
    </aside>
  );
};

export default Sidebar;
