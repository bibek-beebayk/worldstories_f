import { Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
import { getLanguageLabel } from "@/lib/languages";
import { DEFAULT_DISPLAY, type CardShowFlags } from "@/lib/homeDisplay";
import { FORMAT_META, availableFormats, formatStoryLength, isNewStory } from "@/lib/storyFormats";
import CoverImage from "@/components/CoverImage";

import type { HomeSectionCardStyle } from "@/api/types";

interface StoryCardProps {
  id: number;
  slug: string;
  title: string;
  author?: string | null;
  description?: string;
  summary?: string;
  cover_image: string;
  rating: number;
  views: number;
  story_type?: string;
  language?: string;
  has_audio?: boolean;
  has_video?: boolean;
  has_read_along?: boolean;
  /** True only where the API computes it (the Library list); shows the Read badge. */
  has_text?: boolean | null;
  summary_reading_minutes?: number | null;
  is_original?: boolean;
  reading_time_minutes?: number | null;
  /** Publication date; a story published in the last 14 days gets a "New" badge. */
  site_published_date?: string | null;
  /** The signed-in reader's progress, 0–1. A thin bar shows while it is in between. */
  progress?: number | null;
  compact?: boolean;
  variant?: HomeSectionCardStyle;
  /** Optional per-section visibility toggles; omit to use default card appearance. */
  show?: CardShowFlags;
  /** Overrides the default `/read/:slug` destination — used by mode-scoped
   * sections (e.g. Library's Listen rail) so the card leads to the isolated
   * detail page for that content type instead. */
  linkTo?: string;
  /** Gives the card a softer rounded corner and heavier shadow — used by the
   * Featured Stories rail to stand apart from the site's usual
   * sharp-cornered cards elsewhere. */
  featured?: boolean;
}

const StoryCard = (props: StoryCardProps) => {
  const {
    title,
    author,
    description,
    summary,
    cover_image,
    rating,
    story_type,
    language,
    slug,
    is_original,
    reading_time_minutes,
    site_published_date,
    progress,
    compact = false,
    variant,
    show,
    linkTo,
    featured = false,
  } = props;
  const resolvedVariant: HomeSectionCardStyle = variant ?? (compact ? "compact" : "default");
  const isCompact = resolvedVariant === "compact";
  const showAuthor = show?.author ?? DEFAULT_DISPLAY.show_author;
  const showRating = show?.rating ?? DEFAULT_DISPLAY.show_rating;
  const showReadingTime = show?.readingTime ?? DEFAULT_DISPLAY.show_reading_time;
  const showBadges = show?.badges ?? DEFAULT_DISPLAY.show_badges;
  const showSummary = show?.summary ?? DEFAULT_DISPLAY.show_summary;

  const formats = availableFormats(props);
  const isNepali = showBadges && language === "ne";
  const isNew = showBadges && isNewStory(site_published_date);
  const showOriginal = showBadges && Boolean(is_original);
  const length = showReadingTime ? formatStoryLength(reading_time_minutes) : null;
  // Other languages are named in the meta line; Nepali also gets a badge on the cover.
  const languageLabel = language && language !== "en" ? getLanguageLabel(language) : null;
  const meta = [length, languageLabel].filter(Boolean).join(" · ");
  const hasRating = showRating && typeof rating === "number" && rating > 0;
  const ratingBadge = hasRating ? (
    <span className="inline-flex items-center gap-0.5 tabular-nums">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
      <span>{rating.toFixed(1)}</span>
    </span>
  ) : null;
  const summaryText = showSummary ? (summary || description || "").trim() : "";
  const showProgress = typeof progress === "number" && progress > 0 && progress < 1;
  const href = linkTo || `/story/${slug}`;

  if (resolvedVariant === "overlay") {
    return (
      <Link
        to={href}
        className="group relative z-0 block h-full cursor-pointer rounded-sm transition-transform duration-300 ease-out hover:z-20 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        <div className="relative h-full min-h-[200px] aspect-[3/4] w-full overflow-hidden rounded-sm shadow-md group-hover:shadow-2xl">
          <CoverImage
            src={cover_image}
            alt=""
            title={title}
            author={author}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {isNew && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow">
                New
              </span>
            )}
            {showOriginal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                <Sparkles className="h-3 w-3" aria-hidden="true" /> Original
              </span>
            )}
            {isNepali && (
              <Badge variant="outline" className="border-0 bg-black/70 text-white">
                Nepali
              </Badge>
            )}
          </div>
          {formats.length > 0 && (
            <div className="absolute right-2 top-2 flex flex-col gap-1">
              {formats.map((format) => {
                const { icon: Icon, badgeClass, label } = FORMAT_META[format];
                return (
                  <div
                    key={format}
                    title={label}
                    aria-label={label}
                    role="img"
                    className={`flex h-5 w-5 items-center justify-center rounded-full p-1 opacity-90 ${badgeClass}`}
                  >
                    <Icon className="h-3 w-3 text-white" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow-sm sm:text-base">
              {title}
            </h3>
            {((showAuthor && author) || ratingBadge) && (
              <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-white/90">
                {showAuthor && author && <span className="truncate">{author}</span>}
                {ratingBadge}
              </p>
            )}
            {summaryText && <p className="mt-1 line-clamp-2 text-xs text-white/85">{summaryText}</p>}
          </div>
          {showProgress && (
            <div
              className="absolute inset-x-0 bottom-0 h-1 bg-black/40"
              role="progressbar"
              aria-label={`${Math.round((progress as number) * 100)}% read`}
              aria-valuenow={Math.round((progress as number) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-primary" style={{ width: `${Math.round((progress as number) * 100)}%` }} />
            </div>
          )}
        </div>
      </Link>
    );
  }

  if (resolvedVariant === "wide") {
    return (
      <Link
        to={href}
        className="group flex items-start gap-3 rounded-md border border-transparent p-1.5 transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="relative aspect-[3/4] w-[72px] shrink-0 overflow-hidden rounded-sm shadow-sm">
          <CoverImage
            src={cover_image}
            alt=""
            title={title}
            author={author}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          {showProgress && (
            <div
              className="absolute inset-x-0 bottom-0 h-1 bg-black/40"
              role="progressbar"
              aria-label={`${Math.round((progress as number) * 100)}% read`}
              aria-valuenow={Math.round((progress as number) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-primary" style={{ width: `${Math.round((progress as number) * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {title}
          </h3>
          {showAuthor && author && <p className="mt-0.5 truncate text-xs text-muted-foreground">{author}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {meta && <span className="truncate">{meta}</span>}
            {ratingBadge}
            {isNew && (
              <span className="rounded-full bg-primary px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                New
              </span>
            )}
            {showOriginal && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-1.5 py-0 text-[10px] font-semibold text-white">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> Original
              </span>
            )}
            {isNepali && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                Nepali
              </Badge>
            )}
          </div>
          {summaryText ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{summaryText}</p>
          ) : (
            show === undefined &&
            description && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </Link>
    );
  }

  if (resolvedVariant === "text") {
    return (
      <Link
        to={href}
        className="group block border-b border-border py-2.5 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <h3 className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary">{title}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {isNew && (
              <span className="rounded-full bg-primary px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                New
              </span>
            )}
            {showOriginal && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600 px-1.5 py-0 text-[10px] font-semibold text-white">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> Original
              </span>
            )}
            {isNepali && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                Nepali
              </Badge>
            )}
          </div>
        </div>
        {((showAuthor && author) || meta || ratingBadge) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-2 truncate text-xs text-muted-foreground">
            {((showAuthor && author) || meta) && (
              <span className="truncate">{[showAuthor ? author : null, meta].filter(Boolean).join(" · ")}</span>
            )}
            {ratingBadge}
          </p>
        )}
      </Link>
    );
  }

  return (
    <Link
      to={href}
      className="group relative z-0 block cursor-pointer transition-transform duration-300 ease-out hover:z-20 hover:scale-105"
    >
      <div
        className={`relative overflow-hidden ${isCompact ? "aspect-[4/5]" : "aspect-[3/4]"} ${
          featured
            ? `rounded-xs shadow-lg ${isCompact ? "mb-2" : "mb-3"}`
            : `rounded-sm ${isCompact ? "mb-2 shadow-sm" : "mb-3 shadow-md"}`
        } group-hover:shadow-2xl`}
      >
        <CoverImage
          src={cover_image}
          alt={title}
          author={author}
          loading="lazy"
          decoding="async"
          className="w-full object-cover"
        />
        {isNew && (
          <span
            className={`absolute left-2 top-2 rounded-full bg-primary font-semibold uppercase tracking-wide text-primary-foreground shadow ${
              isCompact ? "left-1.5 top-1.5 px-1.5 py-0 text-[9px]" : "px-2 py-0.5 text-[10px]"
            }`}
          >
            New
          </span>
        )}
        {story_type && (
          <Badge
            className={`absolute left-2 border-0 bg-black/70 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
              isNew ? (isCompact ? "top-6" : "top-8") : isCompact ? "top-1.5 px-1.5 py-0 text-[10px]" : "top-2"
            }`}
          >
            {story_type}
          </Badge>
        )}
        {formats.length > 0 && (
          <div className={`absolute right-2 top-2 flex flex-col gap-1 ${isCompact ? "right-1.5 top-1.5 gap-0.5" : ""}`}>
            {formats.map((format) => {
              const { icon: Icon, badgeClass, label } = FORMAT_META[format];
              return (
                <div
                  key={format}
                  title={label}
                  aria-label={label}
                  role="img"
                  className={`flex items-center justify-center rounded-full opacity-90 ${badgeClass} ${isCompact ? "h-4 w-4 p-[3px]" : "h-5 w-5 p-1"}`}
                >
                  <Icon className={`text-white ${isCompact ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
                </div>
              );
            })}
          </div>
        )}
        {isNepali && (
          <Badge
            variant="outline"
            className={`absolute bottom-2 right-2 border-0 bg-black/70 text-white ${isCompact ? "px-1.5 py-0 text-[10px]" : ""}`}
          >
            Nepali
          </Badge>
        )}
        {showOriginal && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            <Sparkles className="h-3 w-3" /> Original
          </span>
        )}
        {showProgress && (
          <div
            className="absolute inset-x-0 bottom-0 h-1 bg-black/40"
            role="progressbar"
            aria-label={`${Math.round((progress as number) * 100)}% read`}
            aria-valuenow={Math.round((progress as number) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-primary" style={{ width: `${Math.round((progress as number) * 100)}%` }} />
          </div>
        )}
      </div>

      <h3
        className={`line-clamp-2 font-semibold transition-colors group-hover:text-primary ${isCompact ? "text-xs" : "text-sm"} ${featured ? "font-display" : ""}`}
      >
        {title}
      </h3>
      {showAuthor && author && (
        <p className={`mt-0.5 truncate text-muted-foreground ${isCompact ? "text-[10px]" : "text-xs"}`}>{author}</p>
      )}
      {((meta && !isCompact) || ratingBadge) && (
        <p
          className={`mt-0.5 flex items-center gap-2 truncate text-muted-foreground ${isCompact ? "text-[10px]" : "text-xs"}`}
        >
          {meta && !isCompact && <span className="truncate">{meta}</span>}
          {ratingBadge}
        </p>
      )}
    </Link>
  );
};

export default StoryCard;
