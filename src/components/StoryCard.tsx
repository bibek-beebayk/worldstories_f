import { Captions, Headphones, Sparkles, Youtube, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
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
  /** Overrides the default `/read/:slug` destination — used by mode-scoped
   * sections (e.g. Library's Listen rail) so the card leads to the isolated
   * detail page for that content type instead. */
  linkTo?: string;
  /** Gives the card a softer rounded corner and heavier shadow — used by the
   * Featured Stories rail to stand apart from the site's usual
   * sharp-cornered cards elsewhere. */
  featured?: boolean;
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
    story_type,
    language,
    slug,
    is_original,
    compact = false,
    linkTo,
    featured = false,
  } = props;
  const activeBadges = FORMAT_BADGES.filter((badge) => badge.check(props));

  return (
    <Link
      to={linkTo || `/read/${slug}`}
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
        {story_type && (
          <Badge
            className={`absolute left-2 border-0 bg-black/70 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${compact ? "top-1.5 px-1.5 py-0 text-[10px]" : "top-2"}`}
          >
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

      <h3 className={`line-clamp-2 font-semibold transition-colors group-hover:text-primary ${compact ? "text-xs" : "text-sm"} ${featured ? "font-display" : ""}`}>
        {title}
      </h3>
    </Link>
  );
};

export default StoryCard;
