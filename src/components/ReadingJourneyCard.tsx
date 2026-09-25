import { useQuery } from "@tanstack/react-query";
import { Flame, ArrowRight, BookOpenCheck } from "lucide-react";
import { Link } from "react-router";
import { authApi } from "@/api/auth";

/**
 * The reader's own progress, at the top of their homepage.
 *
 * Reuses the streak the backend has always calculated
 * (`GET /api/auth/reading-streak/`, `apps/stats/streaks.py`) — it existed but
 * was only ever visible inside the profile, which is the one place a reader
 * goes *after* they already know how they are doing.
 *
 * Encouraging, never pressuring: a broken streak is stated plainly with an
 * invitation to start another, not framed as a loss. Nothing counts down and
 * nothing warns.
 */
const ReadingJourneyCard = ({ enabled }: { enabled: boolean }) => {
  const { data } = useQuery({
    queryKey: ["reading-streak"],
    // Same query key the profile uses, so the two surfaces share one fetch
    // and can never disagree about the reader's streak.
    queryFn: authApi.getReadingStreak,
    enabled,
  });

  // Rendered only once there is something real to say. A reader with no history
  // gets nothing here rather than a row of zeroes, which is the "misleading
  // empty state" the brief warns against.
  if (!data || (data.current_streak === 0 && data.longest_streak === 0)) return null;

  const { current_streak: current, longest_streak: longest } = data;

  return (
    <section
      className="relative overflow-hidden rounded-sm bg-gradient-to-br from-orange-500 via-rose-500 to-primary p-5 text-white shadow-lg sm:p-6"
      aria-labelledby="reading-journey-heading"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      {/* Decorative watermark + rising embers — mirrors Explore by Country's
          background treatment but themed to fire/streaks instead of maps.
          The watermark always flickers; embers only rise for an active
          streak, since they read as "the fire is currently lit". */}
      <Flame className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 animate-flicker text-white/10" style={{ animationDuration: "3s" }} />
      {current > 0 && (
        <>
          <span className="pointer-events-none absolute bottom-3 left-[22%] h-1.5 w-1.5 animate-rise rounded-full bg-amber-200/70" style={{ animationDuration: "2.8s" }} />
          <span className="pointer-events-none absolute bottom-2 left-[45%] h-1 w-1 animate-rise rounded-full bg-white/70" style={{ animationDelay: "0.8s", animationDuration: "3.4s" }} />
          <span className="pointer-events-none absolute bottom-4 right-[30%] h-1.5 w-1.5 animate-rise rounded-full bg-amber-200/60" style={{ animationDelay: "1.6s", animationDuration: "3s" }} />
        </>
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
            {current > 0 ? (
              <Flame className="h-7 w-7 animate-flicker text-amber-200" />
            ) : (
              <BookOpenCheck className="h-7 w-7" />
            )}
          </span>
          <div>
            {current > 0 ? (
              <h2 id="reading-journey-heading" className="font-display text-3xl font-extrabold leading-none sm:text-4xl">
                {current}
                <span className="ml-1.5 text-base font-semibold text-white/85">
                  day{current === 1 ? "" : "s"} strong
                </span>
              </h2>
            ) : (
              <h2 id="reading-journey-heading" className="font-display text-lg font-bold sm:text-xl">
                Your reading streak
              </h2>
            )}
            <p className="mt-1 text-xs text-white/80 sm:text-sm">
              {current > 0
                ? longest > current
                  ? `Your best run so far is ${longest} days.`
                  : "This is your best run yet. Keep it going!"
                : `Your longest run was ${longest} days. Read something today to start another.`}
            </p>
          </div>
        </div>

        <div className="relative shrink-0">
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-white/20" />
          <Link
            to="/profile/reader"
            className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:scale-110 hover:bg-white/25 sm:text-sm"
          >
            Your reading
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ReadingJourneyCard;
