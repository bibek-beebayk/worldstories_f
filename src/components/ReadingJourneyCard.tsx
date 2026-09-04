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
      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:rounded-2xl sm:p-5"
      aria-labelledby="reading-journey-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {current > 0 ? <Flame className="h-5 w-5" /> : <BookOpenCheck className="h-5 w-5" />}
          </span>
          <div>
            <h2 id="reading-journey-heading" className="text-sm font-semibold sm:text-base">
              {current > 0
                ? `${current}-day reading streak`
                : "Your reading journey"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {current > 0
                ? longest > current
                  ? `Your best run so far is ${longest} days.`
                  : "This is your best run yet."
                : `Your longest run was ${longest} days. Read something today to start another.`}
            </p>
          </div>
        </div>

        <Link
          to="/profile?section=reader"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline sm:text-sm"
        >
          Your reading
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
};

export default ReadingJourneyCard;
