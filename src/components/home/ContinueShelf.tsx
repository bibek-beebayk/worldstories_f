import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowRight, BookOpenText, Flame } from "lucide-react";
import { authApi } from "@/api/auth";
import ContinueCoverflow from "@/components/home/ContinueCoverflow";
import type { ContinueEntry } from "@/lib/continueShelf";

/**
 * One "Continue" row for everything the reader has in progress — reading and
 * listening together, newest activity first, all shown in one circular
 * coverflow; the reading streak is a small chip in the header instead of its
 * own banner. Renders nothing when there is nothing.
 */
const ContinueShelf = ({ entries, title = "Continue" }: { entries: ContinueEntry[]; title?: string }) => {
  const { data: streak } = useQuery({
    queryKey: ["reading-streak"],
    queryFn: authApi.getReadingStreak,
    staleTime: 60_000,
  });

  if (entries.length === 0) return null;

  return (
    <section aria-label={title}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
            <BookOpenText className="h-5 w-5 shrink-0 text-primary" />
            {title}
          </h2>
          {streak && streak.current_streak > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600"
              title={`Longest streak: ${streak.longest_streak} ${streak.longest_streak === 1 ? "day" : "days"}`}
            >
              <Flame className="h-3.5 w-3.5" />
              {streak.current_streak}-day streak
            </span>
          )}
        </div>
        <Link
          to="/profile/reader?view=reading"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm"
        >
          See all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <ContinueCoverflow entries={entries} />
    </section>
  );
};

export default ContinueShelf;
