import { Sparkles } from "lucide-react";
import FeaturedStoryCard from "@/components/FeaturedStoryCard";
import type { FeaturedStory } from "@/api/types";

interface FeaturedStoriesSectionProps {
  stories: FeaturedStory[];
  /** True when an admin configured today's Daily Story — the section then
   *  shows just that one story under a "Daily Story" heading. */
  isDaily: boolean;
  /** The server's "today" (YYYY-MM-DD, UTC) from the home payload. */
  date?: string | null;
  /** The Daily Story's editorial note, shown as the subtitle when present. */
  reason?: string | null;
}

// Formatted with a fixed locale and UTC (the server's timezone for the Daily
// Story) so the server render and the client hydration produce the same
// string — a browser-locale/timezone format here would cause a hydration
// mismatch.
const formatIssueDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

/**
 * The homepage's editorial showcase. A full-width band that picks up the
 * hero's background colour where the hero ends and fades into the page at
 * the bottom, with its own "editor's picks" heading — eyebrow, display-font
 * title, issue date — rather than the plain icon-plus-title heading every
 * other homepage section uses, so it reads as curated rather than as
 * another rail.
 */
const FeaturedStoriesSection = ({
  stories,
  isDaily,
  date,
  reason,
}: FeaturedStoriesSectionProps) => {
  if (stories.length === 0) return null;

  const issueDate = date ? formatIssueDate(date) : null;
  const subtitle =
    (isDaily && reason?.trim()) ||
    (isDaily ? "One story, chosen for today." : "Hand-picked by the WorldStories team.");

  return (
    <section aria-labelledby="featured-stories-heading" className="container px-3 pt-8 sm:px-4 sm:pt-10 md:pt-12">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 sm:mb-6">
        <div className="min-w-0">
          <h2
            id="featured-stories-heading"
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl"
          >
            <Sparkles className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
            {isDaily ? "Daily Story" : "Featured Stories"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
        </div>
        {issueDate && (
          <span className="shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {issueDate}
          </span>
        )}
      </header>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {stories.map((story, index) => (
          <FeaturedStoryCard
            key={story.id}
            story={story}
            rank={index + 1}
            // The top pick spans the row; only when that leaves an even
            // number below, so the 2-column grid never ends on a lone
            // half-width card.
            lead={index === 0 && stories.length % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
};

export default FeaturedStoriesSection;
