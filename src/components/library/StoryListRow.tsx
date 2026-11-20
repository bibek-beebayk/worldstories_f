import { Link } from "react-router";
import { Sparkles, Star } from "lucide-react";
import type { Story } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import { getLanguageLabel } from "@/lib/languages";
import { FORMAT_META, availableFormats, formatStoryLength, isNewStory } from "@/lib/storyFormats";

/** The list view: one story per row, with the details a grid card has no room for. */
const StoryListRow = ({ story, linkTo, progress }: { story: Story; linkTo?: string; progress?: number | null }) => {
  const formats = availableFormats(story);
  const length = formatStoryLength(story.reading_time_minutes);
  const showProgress = typeof progress === "number" && progress > 0 && progress < 1;
  const percent = Math.round((progress ?? 0) * 100);

  return (
    <Link
      to={linkTo || `/story/${story.slug}`}
      className="group flex gap-3 rounded-lg border bg-card p-2.5 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30 sm:gap-4 sm:p-3"
    >
      <div className="aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-sm shadow-sm sm:w-16">
        <CoverImage
          src={story.cover_image}
          alt=""
          title={story.title}
          author={story.author}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h3 className="line-clamp-1 text-sm font-semibold group-hover:text-primary sm:text-base">{story.title}</h3>
          {story.is_original && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles className="h-2.5 w-2.5" /> Original
            </span>
          )}
          {isNewStory(story.site_published_date) && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">New</span>
          )}
        </div>
        {story.author && <p className="truncate text-xs text-muted-foreground sm:text-sm">{story.author}</p>}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {length && <span>{length}</span>}
          {story.language && <span>{getLanguageLabel(story.language)}</span>}
          {story.rating > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {story.rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {formats.map((format) => {
            const { icon: Icon, label, badgeClass } = FORMAT_META[format];
            return (
              <span key={format} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${badgeClass}`}>
                <Icon className="h-2.5 w-2.5" />
                {label}
              </span>
            );
          })}
          {(story.genres ?? []).map((genre) => (
            <span key={genre} className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
              {genre}
            </span>
          ))}
        </div>

        {showProgress && (
          <div className="mt-2 flex items-center gap-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${percent}% read`}>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-[10px] font-semibold text-primary">{percent}%</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default StoryListRow;
