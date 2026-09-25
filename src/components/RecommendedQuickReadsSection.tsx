import { Story } from "@/api/types";
import { Clock3, Headphones, Wand2 } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import { Link } from "react-router";

interface RecommendedQuickReadsSectionProps {
  stories: Story[];
}

// Personalized Quick Read picks, shown alongside a Quick Read page — driven
// by recommend_stories_for(require_summary=True) instead of "any story with
// a summary", and excludes the story currently being viewed. Renders nothing
// at all (not an empty state) when there's no personalized signal yet —
// matches QuickReadSection's own "don't nag" convention. A stacked list of
// rows rather than a carousel: this now lives in the sidebar column, which
// is too narrow for a multi-card rail to make sense.
const RecommendedQuickReadsSection = ({ stories }: RecommendedQuickReadsSectionProps) => {
  if (stories.length === 0) return null;

  return (
    <section className="rounded-sm border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
        <Wand2 className="h-3.5 w-3.5" />
        <span>Recommended Quick Reads</span>
      </div>

      <div className="space-y-2">
        {stories.map((story) => (
          <Link
            key={story.id}
            to={`/quick-read/${story.slug}`}
            className="group flex items-center gap-3 rounded-sm p-2 transition-colors hover:bg-muted/50"
          >
            <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-sm shadow-sm">
              <CoverImage
                src={story.cover_image}
                alt={story.title}
                author={story.author}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {story.has_audio && (
                <div className="absolute right-1 top-1 rounded-full bg-red-600 p-[3px] opacity-80">
                  <Headphones className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-xs font-semibold transition-colors group-hover:text-primary">
                {story.title}
              </h3>
              {story.author && (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">by {story.author}</p>
              )}
              {story.summary_reading_minutes != null && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock3 className="h-3 w-3" />
                  <span>{story.summary_reading_minutes} min read</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RecommendedQuickReadsSection;
