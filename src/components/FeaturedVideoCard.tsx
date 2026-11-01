import { Play } from "lucide-react";
import { Link } from "react-router";
import { formatDuration } from "@/components/VideoCard";
import type { PublicVideo } from "@/api/types";

interface FeaturedVideoCardProps {
  video: PublicVideo;
  /** 1-based position in the editorial lineup, shown as "No. 01". */
  rank: number;
  /** The top pick: spans the full row with a bigger title. */
  lead?: boolean;
}

/**
 * The Featured card for a video. Videos have no description, so instead of a
 * text card with empty space, the thumbnail fills the whole card and the rank,
 * title and source story sit on a gradient over it.
 */
const FeaturedVideoCard = ({ video, rank, lead = false }: FeaturedVideoCardProps) => {
  const duration = formatDuration(video.duration_seconds);

  return (
    <Link
      to={`/watch/${video.id}`}
      className={`group relative isolate flex min-h-[16rem] overflow-hidden rounded-2xl border bg-black text-white shadow-sm transition-shadow duration-300 hover:shadow-lg ${
        lead ? "md:col-span-2 md:min-h-[20rem]" : ""
      }`}
    >
      <img
        src={video.thumbnail}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

      <div className="absolute left-4 top-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-black">No. {String(rank).padStart(2, "0")}</span>
        <span className="rounded-full bg-black/55 px-2 py-0.5 backdrop-blur-sm">
          {video.video_type ? video.video_type.name : "Video"}
        </span>
      </div>

      <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-transform duration-300 group-hover:scale-110">
        <Play className="h-6 w-6 fill-current" />
      </span>

      {duration && (
        <span className="absolute right-4 top-4 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium">
          {duration}
        </span>
      )}

      <div className="relative mt-auto w-full p-4 sm:p-5">
        <h3
          className={`line-clamp-2 font-display font-semibold leading-tight ${
            lead ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl"
          }`}
        >
          {video.title}
        </h3>
        {video.story && (
          <p className={`mt-1 truncate text-white/75 ${lead ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>
            from {video.story.title}
          </p>
        )}
      </div>
    </Link>
  );
};

export default FeaturedVideoCard;
