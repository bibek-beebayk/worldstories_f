import { Link } from "react-router";
import { Play } from "lucide-react";
import type { PublicAudiobook, Story } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import { formatAudioDuration } from "@/lib/audiobooks";
import { formatLong } from "@/lib/formatDuration";
import { audiobookUrl } from "@/lib/urls";

export interface AudiobookCardProps {
  /** Preferred Phase 3 public audiobook object. */
  audiobook?: PublicAudiobook;
  /** Legacy Story-shaped prop (used by admin preview and any remaining callers). */
  story?: Story;
  /** Optional track slug to link directly to (e.g. from Continue Listening). */
  trackSlug?: string | null;
  /** Listening progress percentage (1-100) for a signed-in reader, when known. */
  progressPercent?: number;
}

export function AudiobookCard({ audiobook, story, trackSlug, progressPercent }: AudiobookCardProps) {
  const slug = audiobook?.slug ?? story?.slug ?? "";
  const title = audiobook?.title ?? story?.title ?? "";
  const author = audiobook ? audiobook.author : story?.author;
  const coverImage = audiobook ? audiobook.cover_image : story?.cover_image;
  const duration = audiobook
    ? formatLong(audiobook.total_duration_seconds) || formatAudioDuration(audiobook.minutes)
    : formatAudioDuration(story?.audio_minutes);
  const trackCount = audiobook?.track_count ?? null;
  const badgeLabel = audiobook
    ? audiobook.has_read_along
      ? "Read-along"
      : null
    : story?.has_read_along
      ? "Read-along"
      : story?.has_video
        ? "Video"
        : null;
  const firstGenre = audiobook ? (audiobook.genres?.[0] ?? null) : (story?.genres?.[0] ?? null);
  const seriesList = audiobook?.series ?? [];
  const firstSeries = seriesList[0] ?? null;
  const extraSeriesCount = seriesList.length > 1 ? seriesList.length - 1 : 0;
  const showProgress =
    typeof progressPercent === "number" &&
    Number.isFinite(progressPercent) &&
    progressPercent > 0 &&
    progressPercent < 100;
  const ariaLabel = duration ? `Listen to ${title}, ${duration}` : `Listen to ${title}`;

  return (
    <Link
      to={audiobookUrl(slug, trackSlug)}
      aria-label={ariaLabel}
      className="group block rounded-md transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-muted shadow-sm transition-shadow duration-200 group-hover:shadow-md group-focus-visible:shadow-md">
        <CoverImage
          src={coverImage}
          alt=""
          title={title}
          author={author}
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
          {title}
        </h3>
        {author && <p className="truncate text-xs text-muted-foreground">{author}</p>}
        {(firstGenre || (trackCount !== null && trackCount > 1)) && (
          <p className="truncate text-[11px] text-muted-foreground/85">
            {[firstGenre, trackCount !== null && trackCount > 1 ? `${trackCount} tracks` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {firstSeries && (
          <div className="flex items-center gap-1 pt-0.5">
            <span className="max-w-[140px] truncate rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {firstSeries.title}
            </span>
            {extraSeriesCount > 0 && (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                +{extraSeriesCount}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
