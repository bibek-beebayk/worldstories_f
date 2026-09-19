import { Captions, Clock3, Eye, Star, Headphones, Sparkles, Youtube, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
import { formatViews } from "@/lib/utils";
import { formatMinutes } from "@/lib/readingTime";
import { getLanguageLabel } from "@/lib/languages";
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
  summary_reading_minutes?: number | null;
  is_original?: boolean;
  reading_time_minutes?: number | null;
  compact?: boolean;
  /** Overrides the default `/story/:slug` destination — used by mode-scoped
   * sections (e.g. Library's Listen rail) so the card leads to the isolated
   * detail page for that content type instead of the all-modes hub. */
  linkTo?: string;
}

// One badge per format the title is actually available in — mirrors the
// color coding used for these same content types elsewhere (Library/
// Discover sections, StoryDetailShell's primary action buttons).
const FORMAT_BADGES = [
  { key: "audio", check: (p: StoryCardProps) => !!p.has_audio, icon: Headphones, color: "bg-rose-600" },
  { key: "read_along", check: (p: StoryCardProps) => !!p.has_read_along, icon: Captions, color: "bg-sky-600" },
  { key: "video", check: (p: StoryCardProps) => !!p.has_video, icon: Youtube, color: "bg-indigo-600" },
  { key: "quick_read", check: (p: StoryCardProps) => p.summary_reading_minutes != null, icon: Zap, color: "bg-amber-600" },
] as const;

const StoryCard = (props: StoryCardProps) => {
  const {
    title,
    author,
    cover_image,
    rating,
    views,
    story_type,
    language,
    slug,
    is_original,
    reading_time_minutes,
    compact = false,
    linkTo,
  } = props;
  const readingTime = formatMinutes(reading_time_minutes);
  const activeBadges = FORMAT_BADGES.filter((badge) => badge.check(props));

  return (
    <Link to={linkTo || `/story/${slug}`} className="group cursor-pointer block">
      <div className={`relative overflow-hidden rounded-lg ${compact ? "mb-2 aspect-[4/5] shadow-sm" : "mb-3 aspect-[3/4] shadow-md"}`}>
        <CoverImage
          src={cover_image}
          alt={title}
          author={author}
          loading="lazy"
          decoding="async"
          className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {story_type && (
          <Badge className={`absolute left-2 border-0 bg-black/70 text-white ${compact ? "top-1.5 px-1.5 py-0 text-[10px]" : "top-2"}`}>
            {story_type}
          </Badge>
        )}
        {activeBadges.length > 0 && (
          <div className={`absolute right-2 top-2 flex flex-col gap-1 ${compact ? "right-1.5 top-1.5 gap-0.5" : ""}`}>
            {activeBadges.map(({ key, icon: Icon, color }) => (
              <div
                key={key}
                className={`flex items-center justify-center rounded-full opacity-90 ${color} ${compact ? "h-4 w-4 p-[3px]" : "h-5 w-5 p-1"}`}
              >
                <Icon className={`text-white ${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
              </div>
            ))}
          </div>
        )}
        {language && language !== "en" && (
          <Badge
            variant="outline"
            className={`absolute right-2 bottom-2 border-0 bg-black/70 text-white ${compact ? "px-1.5 py-0 text-[10px]" : ""}`}
          >
            {getLanguageLabel(language)}
          </Badge>
        )}
        {is_original && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            <Sparkles className="h-3 w-3" /> Original
          </span>
        )}
      </div>
      
      <h3 className={`line-clamp-2 font-semibold transition-colors group-hover:text-primary ${compact ? "mb-1 text-xs" : "mb-2 text-sm"}`}>
        {title}
      </h3>
      
      <div className={`flex items-center text-muted-foreground ${compact ? "gap-2 text-[11px]" : "gap-3 text-xs"}`}>
        <div className="flex items-center gap-1">
          <Star className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} fill-amber-400 text-amber-400`} />
          {/* Live stat — can genuinely differ between the server's render and
              the moment the client hydrates (real traffic changing it in
              between). suppressHydrationWarning tells React to silently keep
              the client's value for just this node instead of treating the
              difference as an error and discarding/re-rendering the whole
              tree client-side (which is what was dropping the page's CSS). */}
          <span suppressHydrationWarning>{rating}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          <span suppressHydrationWarning>{formatViews(views)}</span>
        </div>
        {/* Omitted entirely when the story has no estimate, rather than
            rendering a placeholder — see lib/readingTime.ts. */}
        {readingTime && (
          <div className="flex items-center gap-1">
            <Clock3 className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            <span>{readingTime}</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default StoryCard;
