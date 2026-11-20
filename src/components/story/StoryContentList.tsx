import { BookMarked, Captions, CheckCircle2, Eye, Headphones, Youtube } from "lucide-react";
import { Link, useNavigate } from "react-router";
import type { StoryDetail } from "@/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { StoryProgressMode } from "@/hooks/useStoryProgress";

interface StoryContentListProps {
  story: StoryDetail;
  mode: StoryProgressMode;
  isAuthenticated: boolean;
  chapterProgressMap?: Record<string, number>;
  videoProgressMap?: Record<string, number>;
  onWatch?: (slug: string) => void;
  showReadAlongAction?: boolean;
}

const labels = {
  read: { title: "Chapters", icon: BookMarked },
  listen: { title: "Audio Tracks", icon: Headphones },
  "read-along": { title: "Read Along Tracks", icon: Captions },
  watch: { title: "Videos", icon: Youtube },
};

const StoryContentList = ({
  story,
  mode,
  isAuthenticated,
  chapterProgressMap = {},
  videoProgressMap = {},
  onWatch,
  showReadAlongAction = false,
}: StoryContentListProps) => {
  const navigate = useNavigate();
  const items =
    mode === "read"
      ? story.chapters
      : mode === "read-along"
        ? story.audios.filter((audio) => audio.read_along_available).sort((a, b) => a.order - b.order)
        : mode === "listen"
          ? story.audios
          : story.videos;
  const { title, icon: Icon } = labels[mode];

  return (
    <Card>
      <CardContent className="p-0">
        <h3 className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {title}
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {items.length}
          </span>
        </h3>
        {items.length > 1 ? (
          items.map((item, index) => {
            const href =
              mode === "read"
                ? `/read/${story.slug}/${item.slug}`
                : mode === "read-along"
                  ? `/read-along/${story.slug}/${item.slug}`
                  : mode === "listen"
                    ? `/listen/${story.slug}/${item.slug}`
                    : null;
            const progress = mode === "read" ? chapterProgressMap[item.slug] || 0 : videoProgressMap[item.slug] || 0;
            const completed = mode === "read" ? progress >= 1 : progress >= 0.995;
            const row = (
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-muted-foreground w-8">{item.order}</span>
                  <h3 className="font-medium">{item.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {isAuthenticated &&
                    (mode === "read" || mode === "watch") &&
                    (completed ? (
                      <span className="inline-flex items-center gap-1 rounded-full tinted-chip border [--tint:#10b981] px-2 py-0.5 text-xs font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        {mode === "watch" ? "Watched" : "Completed"}
                      </span>
                    ) : progress > 0 || mode === "read" ? (
                      <>
                        <Eye className="h-3 w-3" />
                        <span>{Math.round(progress * 100)}%</span>
                      </>
                    ) : null)}
                  {mode === "listen" && <Headphones className="h-3 w-3" />}
                  {mode === "read-along" && <Captions className="h-4 w-4" />}
                  {mode === "watch" && <Youtube className="h-4 w-4" />}
                  {mode === "listen" &&
                    showReadAlongAction &&
                    "read_along_available" in item &&
                    item.read_along_available && (
                      <button
                        type="button"
                        title="Read Along"
                        aria-label={`Read Along: ${item.title}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          navigate(`/read-along/${story.slug}/${item.slug}`);
                        }}
                        className="rounded-full p-1.5 hover:bg-muted"
                      >
                        <Captions className="h-4 w-4" />
                      </button>
                    )}
                </div>
              </div>
            );
            return (
              <div key={item.slug}>
                {href ? (
                  <Link to={href}>{row}</Link>
                ) : (
                  <button type="button" className="w-full text-left" onClick={() => onWatch?.(item.slug)}>
                    {row}
                  </button>
                )}
                {index < items.length - 1 && <Separator />}
              </div>
            );
          })
        ) : (
          <p className="p-4 text-muted-foreground">No {title.toLowerCase()} available.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StoryContentList;
