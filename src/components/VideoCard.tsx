import { Link } from "react-router";
import { Play } from "lucide-react";
import type { PublicVideo } from "@/api/types";
import { DEFAULT_DISPLAY, type CardShowFlags } from "@/lib/homeDisplay";

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
  variant?: "default" | "overlay" | "wide" | "text";
  show?: CardShowFlags;
}

export default function VideoCard({
  video,
  horizontal = false,
  tall,
  showSeries = false,
  variant = "default",
  show,
}: VideoCardProps) {
  const duration = formatDuration(video.duration_seconds);
  const isTall = tall ?? (video.series ? video.series.layout === "tall" : video.aspect_ratio === "9:16");
  const titleText = video.display_title || video.title;
  const showAuthor = show?.author ?? DEFAULT_DISPLAY.show_author;
  const subText = showAuthor && video.story ? video.story.author || video.story.title : null;

  if (variant === "overlay") {
    return (
      <Link
        to={`/watch/${video.id}`}
        className="group relative block h-full overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className={`relative h-full min-h-[180px] w-full ${isTall ? "aspect-[3/4]" : "aspect-video"}`}>
          <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Play className="h-9 w-9 text-white drop-shadow" />
          </span>
          {duration && (
            <span className="absolute right-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
              {duration}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow-sm">{titleText}</p>
            {subText && <p className="mt-0.5 truncate text-xs text-white/90">{subText}</p>}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "wide") {
    return (
      <Link
        to={`/watch/${video.id}`}
        className="group flex items-start gap-3 rounded-md border border-transparent p-1.5 transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-muted">
          <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Play className="h-6 w-6 text-white" />
          </span>
          {duration && (
            <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-medium text-white">
              {duration}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
            {titleText}
          </p>
          {subText && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subText}</p>}
        </div>
      </Link>
    );
  }

  if (variant === "text") {
    return (
      <Link
        to={`/watch/${video.id}`}
        className="group flex items-baseline justify-between gap-2 border-b border-border py-2.5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
            <Play className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="line-clamp-1">{titleText}</span>
          </p>
          {subText && <p className="mt-0.5 truncate pl-5 text-xs text-muted-foreground">{subText}</p>}
        </div>
        {duration && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{duration}</span>}
      </Link>
    );
  }
  const thumb = (
    <div
      className={`relative overflow-hidden rounded-md bg-muted ${isTall ? "aspect-[3/4]" : "aspect-video"} ${horizontal ? "w-36 shrink-0 sm:w-40" : "w-full"}`}
    >
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
      {showSeries && video.series && (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-primary">{video.series.name}</p>
      )}
      <p className="line-clamp-2 text-sm font-medium leading-snug">{video.display_title || video.title}</p>
      {subText && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subText}</p>}
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
