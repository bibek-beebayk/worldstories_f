import { Link } from "react-router";
import { Play } from "lucide-react";
import type { PublicVideo } from "@/api/types";

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

interface VideoCardProps {
  video: PublicVideo;
  /** Compact horizontal layout for the suggestions list. */
  horizontal?: boolean;
  tall?: boolean;
  showSeries?: boolean;
}

export default function VideoCard({ video, horizontal = false, tall, showSeries = false }: VideoCardProps) {
  const duration = formatDuration(video.duration_seconds);
  const isTall = tall ?? (video.series ? video.series.layout === "tall" : video.aspect_ratio === "9:16");
  const thumb = (
    <div className={`relative overflow-hidden rounded-md bg-muted ${isTall ? "aspect-[3/4]" : "aspect-video"} ${horizontal ? "w-36 shrink-0 sm:w-40" : "w-full"}`}>
      <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
        <Play className="h-8 w-8 text-white" />
      </span>
      {duration && (
        <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[11px] font-medium text-white">
          {duration}
        </span>
      )}
    </div>
  );
  const text = (
    <div className="min-w-0">
      {showSeries && video.series && <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary">{video.series.name}</p>}
      <p className="line-clamp-2 text-sm font-medium leading-snug">{video.display_title || video.title}</p>
      {video.story && <p className="mt-0.5 truncate text-xs text-muted-foreground">{video.story.author || video.story.title}</p>}
    </div>
  );
  return (
    <Link
      to={`/watch/${video.id}`}
      className={`group ${horizontal ? "flex gap-3 active:opacity-70" : "flex flex-col gap-2"}`}
    >
      {thumb}
      {text}
    </Link>
  );
}
