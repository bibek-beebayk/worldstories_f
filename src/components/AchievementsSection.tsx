import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { AchievementProgress, AchievementsResponse } from "@/api/types";

const CATEGORY_LABELS: Record<string, string> = {
  reading: "Reading",
  countries: "Countries",
  genre: "Genre",
  streak: "Streaks",
  quick_read: "Quick Read",
};

const AchievementRow = ({ achievement }: { achievement: AchievementProgress }) => {
  const percent = achievement.target_value
    ? Math.round((achievement.progress / achievement.target_value) * 100)
    : 0;

  return (
    <li
      className={`rounded-md border p-3 ${
        achievement.completed ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`text-xl leading-none ${achievement.completed ? "" : "opacity-40 grayscale"}`}
        >
          {achievement.icon || "•"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-sm font-medium">{achievement.name}</p>
            {/* Earned state in words as well as colour — the same reason the
                passport tiles carry theirs. */}
            <p className="text-xs text-muted-foreground">
              {achievement.completed
                ? "Earned"
                : `${achievement.progress} / ${achievement.target_value}`}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{achievement.description}</p>

          {/* No bar once it is earned: a full bar says less than the word. */}
          {!achievement.completed && (
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={achievement.target_value}
              aria-valuenow={achievement.progress}
              aria-label={`${achievement.name} progress`}
            >
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

/**
 * The reader's achievements, grouped by category.
 *
 * Shows unearned achievements too, with their progress — an achievement nobody
 * can see until they have it is a surprise, not a goal, and the point of this
 * list is to be something to aim at. (`hidden` achievements are the deliberate
 * exception; the API omits those until earned.)
 */
const AchievementsSection = ({
  data,
  isLoading,
}: {
  data: AchievementsResponse | undefined;
  isLoading: boolean;
}) => {
  const grouped = useMemo(() => {
    const groups = new Map<string, AchievementProgress[]>();
    for (const achievement of data?.results || []) {
      const bucket = groups.get(achievement.category) || [];
      bucket.push(achievement);
      groups.set(achievement.category, bucket);
    }
    return Array.from(groups.entries());
  }, [data]);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            No achievements are available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-6 p-5">
        <p className="text-sm text-muted-foreground">
          {data.earned} of {data.total} earned.
        </p>

        {grouped.map(([category, achievements]) => (
          <div key={category}>
            <h3 className="mb-2 text-sm font-semibold">
              {CATEGORY_LABELS[category] || category}
            </h3>
            <ul className="space-y-2">
              {achievements.map((achievement) => (
                <AchievementRow key={achievement.slug} achievement={achievement} />
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AchievementsSection;
