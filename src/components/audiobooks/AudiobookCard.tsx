import { Link } from "react-router";
import { Play } from "lucide-react";
import type { Story } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import { formatAudioDuration } from "@/lib/audiobooks";

export interface AudiobookCardProps {
  story: Story;
  /** Listening progress percentage (1-100) for a signed-in reader, when known. */
  progressPercent?: number;
}

export function AudiobookCard({ story, progressPercent }: AudiobookCardProps) {
  const duration = formatAudioDuration(story.audio_minutes);
  const badgeLabel = story.has_read_along ? "Read-along" : story.has_video ? "Video" : null;
  const firstGenre = story.genres?.[0] ?? null;
  const showProgress =
    typeof progressPercent === "number" &&
    Number.isFinite(progressPercent) &&
    progressPercent > 0 &&
    progressPercent < 100;
  const ariaLabel = duration ? `Listen to ${story.title}, ${duration}` : `Listen to ${story.title}`;

  return (
    <Link
      to={`/listen/${story.slug}`}
      aria-label={ariaLabel}
      className="group block rounded-md transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-muted shadow-sm transition-shadow duration-200 group-hover:shadow-md group-focus-visible:shadow-md">
        <CoverImage
          src={story.cover_image}
          alt=""
          title={story.title}
          author={story.author}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />

        {badgeLabel && (
          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm">
            {badgeLabel}
          </span>
        )}

        <span
          aria-hidden="true"
          className="absolute bottom-2 left-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#D92F4C] text-white shadow-md transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>

        {duration && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">
            {duration}
          </span>
        )}
      </div>

      {showProgress && (
        <div className="mt-1.5 space-y-1">
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`${progressPercent}% listened`}
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-[#D92F4C]" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-[11px] font-medium text-[#A71B36] dark:text-rose-300">{progressPercent}% listened</p>
        </div>
      )}

      <div className="mt-2 space-y-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-[#A71B36]">
          {story.title}
        </h3>
        {story.author && <p className="truncate text-xs text-muted-foreground">{story.author}</p>}
        {firstGenre && <p className="truncate text-[11px] text-muted-foreground/85">{firstGenre}</p>}
      </div>
    </Link>
  );
}
