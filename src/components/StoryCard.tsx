import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
import { getLanguageLabel } from "@/lib/languages";
import { FORMAT_META, availableFormats, formatStoryLength, isNewStory } from "@/lib/storyFormats";
import CoverImage from "@/components/CoverImage";

interface StoryCardProps {
  id: number;
  slug: string;
  title: string;
  author?: string | null;
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
    cover_image,
    story_type,
    language,
    slug,
    is_original,
    reading_time_minutes,
    site_published_date,
    progress,
    compact = false,
    linkTo,
    featured = false,
  } = props;
  const formats = availableFormats(props);
  const isNepali = language === "ne";
  const isNew = isNewStory(site_published_date);
  const length = formatStoryLength(reading_time_minutes);
  // Other languages are named in the meta line; Nepali also gets a badge on the cover.
  const languageLabel = language && language !== "en" ? getLanguageLabel(language) : null;
  const meta = [length, languageLabel].filter(Boolean).join(" · ");
  const showProgress = typeof progress === "number" && progress > 0 && progress < 1;

  return (
    <Link
      to={linkTo || `/story/${slug}`}
      className="group relative z-0 block cursor-pointer transition-transform duration-300 ease-out hover:z-20 hover:scale-105"
    >
      <div
        className={`relative overflow-hidden ${compact ? "aspect-[4/5]" : "aspect-[3/4]"} ${
          featured
            ? `rounded-xs shadow-lg ${compact ? "mb-2" : "mb-3"}`
            : `rounded-sm ${compact ? "mb-2 shadow-sm" : "mb-3 shadow-md"}`
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
              compact ? "left-1.5 top-1.5 px-1.5 py-0 text-[9px]" : "px-2 py-0.5 text-[10px]"
            }`}
          >
            New
          </span>
        )}
        {story_type && (
          <Badge
            className={`absolute left-2 border-0 bg-black/70 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
              isNew ? (compact ? "top-6" : "top-8") : compact ? "top-1.5 px-1.5 py-0 text-[10px]" : "top-2"
            }`}
          >
            {story_type}
          </Badge>
        )}
        {formats.length > 0 && (
          <div className={`absolute right-2 top-2 flex flex-col gap-1 ${compact ? "right-1.5 top-1.5 gap-0.5" : ""}`}>
            {formats.map((format) => {
              const { icon: Icon, badgeClass, label } = FORMAT_META[format];
              return (
                <div
                  key={format}
                  title={label}
                  aria-label={label}
                  role="img"
                  className={`flex items-center justify-center rounded-full opacity-90 ${badgeClass} ${compact ? "h-4 w-4 p-[3px]" : "h-5 w-5 p-1"}`}
                >
                  <Icon className={`text-white ${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
                </div>
              );
            })}
          </div>
        )}
        {isNepali && (
          <Badge
            variant="outline"
            className={`absolute bottom-2 right-2 border-0 bg-black/70 text-white ${compact ? "px-1.5 py-0 text-[10px]" : ""}`}
          >
            Nepali
          </Badge>
        )}
        {is_original && (
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

      <h3 className={`line-clamp-2 font-semibold transition-colors group-hover:text-primary ${compact ? "text-xs" : "text-sm"} ${featured ? "font-display" : ""}`}>
        {title}
      </h3>
      {author && <p className={`mt-0.5 truncate text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>{author}</p>}
      {meta && !compact && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
    </Link>
  );
};

export default StoryCard;
