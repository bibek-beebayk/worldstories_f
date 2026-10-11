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
  /** The hero template's colours, so this band reads as a continuation of
   *  the hero directly above it. Runtime values, hence inline styles. */
  backgroundColor: string;
  accentColor: string;
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
  backgroundColor,
  accentColor,
}: FeaturedStoriesSectionProps) => {
  if (stories.length === 0) return null;

  const issueDate = date ? formatIssueDate(date) : null;
  const subtitle =
    (isDaily && reason?.trim()) ||
    (isDaily ? "One story, chosen for today." : "Hand-picked by the WorldStories team.");

  return (
    <section
      aria-labelledby="featured-stories-heading"
      className="relative isolate overflow-hidden text-white"
      style={{ backgroundColor }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Accent glows, echoing the hero's own drifting blobs. */}
        <div
          className="absolute -left-24 top-1/4 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="absolute -right-24 top-1/2 h-96 w-96 rounded-full opacity-15 blur-3xl"
          style={{ backgroundColor: accentColor }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_60%,transparent)]" />
        {/* Fades the band into the page background below it. */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background sm:h-32" />
      </div>

      <div className="container px-3 pb-20 pt-4 sm:px-4 sm:pb-28 sm:pt-6">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Editor's Picks
            </span>
            <h2
              id="featured-stories-heading"
              className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
            >
              {isDaily ? "Daily Story" : "Featured Stories"}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/65 sm:text-base">{subtitle}</p>
          </div>

          {issueDate && (
            <div className="flex shrink-0 items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-white/55">
              <span className="h-px w-8 bg-white/25 sm:w-12" />
              {issueDate}
            </div>
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
      </div>
    </section>
  );
};

export default FeaturedStoriesSection;
