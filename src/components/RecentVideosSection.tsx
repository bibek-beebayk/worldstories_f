import { storyApi } from "@/api/story";
import VideoCard from "@/components/VideoCard";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Youtube } from "lucide-react";
import { Link } from "react-router";

// Self-contained like RecentBlogsSection: videos aren't part of the home-data
// payload. Renders nothing (not an empty state) until there is a video.
const RecentVideosSection = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["home-recent-videos"],
    queryFn: () => storyApi.getVideos(1),
  });
  const videos = (data?.results || []).slice(0, 4);

  if (!isLoading && videos.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
          <Youtube className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
          Watch
        </h2>
        <Link
          to="/watch"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm"
        >
          See all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-video animate-pulse rounded-md bg-muted" />
            ))
          : videos.map((video) => <VideoCard key={video.id} video={video} />)}
      </div>
    </section>
  );
};

export default RecentVideosSection;
