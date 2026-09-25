import { useQuery } from "@tanstack/react-query";
import { Route, ArrowRight, MapPin, Compass } from "lucide-react";
import { Link } from "react-router";
import { storyApi } from "@/api/story";

/**
 * Homepage entry point into Story Journeys — curated multi-story paths
 * (by country, genre, theme, or hand-picked). Mirrors ReadingJourneyCard's
 * visual language (gradient band, glow accents, pill CTA) but with its own
 * violet identity so the two don't read as the same promo repeated twice.
 */
const StoryJourneysBanner = ({ enabled }: { enabled: boolean }) => {
  const { data } = useQuery({
    queryKey: ["journeys"],
    queryFn: storyApi.getJourneys,
    enabled,
  });

  const journeys = data?.journeys ?? [];
  if (journeys.length === 0) return null;

  const completedCount = journeys.filter((journey) => journey.is_complete).length;

  return (
    <section
      className="relative overflow-hidden rounded-sm bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-5 text-white shadow-lg sm:p-6"
      aria-labelledby="story-journeys-heading"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      {/* Decorative watermark + drifting waypoints — same treatment as
          Explore by Country's globe/pins, themed to journeys/routes instead. */}
      <Route className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 text-white/10 [animation:spin_35s_linear_infinite]" />
      <Compass className="pointer-events-none absolute bottom-2 left-[18%] h-8 w-8 animate-float text-white/15" style={{ animationDuration: "5.5s" }} />
      <MapPin className="pointer-events-none absolute right-[22%] top-4 h-6 w-6 animate-float text-white/20" style={{ animationDelay: "1.2s", animationDuration: "6s" }} />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Route className="h-7 w-7" />
          </span>
          <div>
            <h2 id="story-journeys-heading" className="font-display text-lg font-bold sm:text-xl">
              Story Journeys
            </h2>
            <p className="mt-1 text-xs text-white/80 sm:text-sm">
              {completedCount > 0
                ? `You've completed ${completedCount} of ${journeys.length} curated journeys.`
                : `${journeys.length} curated paths through countries, genres, and themes.`}
            </p>
          </div>
        </div>

        <Link
          to="/journeys"
          className="inline-flex shrink-0 animate-pop-loop items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:animate-none hover:scale-110 hover:bg-white/25 sm:text-sm"
        >
          Explore journeys
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
};

export default StoryJourneysBanner;
