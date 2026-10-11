import { Captions, Clock, Headphones, Sparkles, Star, Youtube } from "lucide-react";
import { Link } from "react-router";
import CoverImage from "@/components/CoverImage";
import type { FeaturedStory } from "@/api/types";
import { getLanguageLabel } from "@/lib/languages";
import { plainText } from "@/lib/plainText";
import { formatReadingMinutes } from "@/lib/readingTime";

// Same per-format colors as StoryCard's FORMAT_BADGES, so the coding stays
// consistent across the homepage.
const FORMATS = [
  { key: "audio", check: (s: FeaturedStory) => !!s.has_audio, icon: Headphones, label: "Audio", color: "text-rose-600" },
  { key: "read_along", check: (s: FeaturedStory) => !!s.has_read_along, icon: Captions, label: "Read along", color: "text-sky-600" },
  { key: "video", check: (s: FeaturedStory) => !!s.has_video, icon: Youtube, label: "Video", color: "text-indigo-600" },
] as const;

/**
 * Horizontal card for the homepage's Featured Stories section: cover on the
 * left, a short story profile on the right. Wider than StoryCard on purpose —
 * featured picks get room for a blurb rather than just a title.
 */
const FeaturedStoryCard = ({ story }: { story: FeaturedStory }) => {
  const about = story.about ? plainText(story.about) : "";
  const readingTime = formatReadingMinutes(story.reading_time_minutes);
  const formats = FORMATS.filter((format) => format.check(story));
  const genres = (story.genres || []).slice(0, 3);

  return (
    <Link
      to={`/read/${story.slug}`}
      className="group flex gap-4 rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow duration-300 hover:shadow-lg sm:p-4"
    >
      <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-xs shadow-md sm:w-32">
        <CoverImage
          src={story.cover_image}
          alt={story.title}
          author={story.author}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {story.is_original && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
            <Sparkles className="h-3 w-3" /> Original
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {story.story_type && <span>{story.story_type}</span>}
          {story.story_type && story.language && <span aria-hidden>·</span>}
          {story.language && <span>{getLanguageLabel(story.language)}</span>}
        </div>

        <h3 className="mt-1 line-clamp-2 font-display text-base font-semibold leading-snug transition-colors group-hover:text-primary sm:text-lg">
          {story.title}
        </h3>
        {story.author && <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">by {story.author}</p>}

        {about && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:line-clamp-3 sm:text-sm">
            {about}
          </p>
        )}

        {genres.length > 0 && (
          <div className="mt-2 hidden flex-wrap gap-1 sm:flex">
            {genres.map((genre) => (
              <span key={genre} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {genre}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
          {readingTime && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {readingTime}
            </span>
          )}
          {story.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {story.rating.toFixed(1)}
            </span>
          )}
          {formats.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              {formats.map(({ key, icon: Icon, label, color }) => (
                <Icon key={key} className={`h-3.5 w-3.5 ${color}`} aria-label={label} />
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default FeaturedStoryCard;
