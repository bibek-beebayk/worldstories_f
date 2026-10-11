import { Captions, Clock, Headphones, Sparkles, Star, Youtube } from "lucide-react";
import { Link } from "react-router";
import CoverImage from "@/components/CoverImage";
import type { FeaturedStory } from "@/api/types";
import { getLanguageLabel } from "@/lib/languages";
import { plainText } from "@/lib/plainText";
import { formatReadingMinutes } from "@/lib/readingTime";

// Same formats as StoryCard's FORMAT_BADGES, in lighter tints so they read on
// the card's dark backdrop.
const FORMATS = [
  { key: "audio", check: (s: FeaturedStory) => !!s.has_audio, icon: Headphones, label: "Audio", color: "text-rose-300" },
  { key: "read_along", check: (s: FeaturedStory) => !!s.has_read_along, icon: Captions, label: "Read along", color: "text-sky-300" },
  { key: "video", check: (s: FeaturedStory) => !!s.has_video, icon: Youtube, label: "Video", color: "text-indigo-300" },
] as const;

interface FeaturedStoryCardProps {
  story: FeaturedStory;
  /** 1-based position in the editorial lineup, shown as "No. 01". */
  rank: number;
  /** The top pick: spans the full row with a bigger cover and title. */
  lead?: boolean;
}

/**
 * Editorial "spotlight" card for the homepage's Featured Stories section.
 * Deliberately unlike the light, utilitarian Continue Reading/Listening cards
 * that sit right below it: a dark backdrop built from the story's own cover
 * (blurred), a numbered rank, and a short profile of the story — so the
 * team's picks read as curated rather than as another list row.
 */
const FeaturedStoryCard = ({ story, rank, lead = false }: FeaturedStoryCardProps) => {
  const about = story.about ? plainText(story.about) : "";
  const readingTime = formatReadingMinutes(story.reading_time_minutes);
  const formats = FORMATS.filter((format) => format.check(story));
  const genres = (story.genres || []).slice(0, 3);

  return (
    <Link
      to={`/read/${story.slug}`}
      className={`group relative isolate flex overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg ring-1 ring-white/10 transition-shadow duration-300 hover:shadow-2xl ${
        lead ? "gap-4 p-4 sm:gap-6 sm:p-6 md:col-span-2" : "gap-4 p-4"
      }`}
    >
      {/* Backdrop: the cover itself, blurred and darkened, so every card
          carries its own story's palette. */}
      <CoverImage
        src={story.cover_image}
        alt=""
        title={story.title}
        author={story.author}
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full scale-125 object-cover opacity-70 blur-2xl"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/70 to-black/45" />

      <div
        className={`relative aspect-[3/4] shrink-0 overflow-hidden rounded-md shadow-2xl ring-1 ring-white/20 transition-transform duration-300 group-hover:-translate-y-1 ${
          lead ? "w-28 sm:w-40 md:w-44" : "w-24 sm:w-28"
        }`}
      >
        <CoverImage
          src={story.cover_image}
          alt={story.title}
          author={story.author}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {story.is_original && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
            <Sparkles className="h-3 w-3" /> Original
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
          <span className="text-amber-300">No. {String(rank).padStart(2, "0")}</span>
          {story.story_type && <span className="text-white/60">{story.story_type}</span>}
          {story.language && <span className="text-white/60">{getLanguageLabel(story.language)}</span>}
        </div>

        <h3
          className={`mt-1.5 line-clamp-2 font-display font-semibold leading-tight text-white transition-colors group-hover:text-amber-200 ${
            lead ? "text-xl sm:text-2xl md:text-3xl" : "text-base sm:text-lg"
          }`}
        >
          {story.title}
        </h3>
        {story.author && (
          <p className={`mt-1 truncate text-white/75 ${lead ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>
            by {story.author}
          </p>
        )}

        {about && (
          <p
            className={`mt-2 leading-relaxed text-white/75 ${
              lead ? "line-clamp-3 text-sm sm:line-clamp-4 sm:text-base" : "line-clamp-2 text-xs sm:line-clamp-3 sm:text-sm"
            }`}
          >
            {about}
          </p>
        )}

        {genres.length > 0 && (
          <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
            {genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur-sm"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-white/70">
          {readingTime && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {readingTime}
            </span>
          )}
          {story.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
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
