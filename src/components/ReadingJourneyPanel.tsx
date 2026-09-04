import { BookOpenCheck, Clock3, Flame, Globe2, Sparkles, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProfileInsightsResponse, ReadingStreakResponse } from "@/api/types";

interface ReadingJourneyPanelProps {
  insights: ProfileInsightsResponse | undefined;
  streak: ReadingStreakResponse | undefined;
  isLoading: boolean;
}

/** `95` → `1h 35m`. Minutes alone stop being readable somewhere around two
 *  hours, and total reading time is a number readers accumulate for months. */
function formatTotalMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * "Your Reading Journey" — the profile's answer to "how am I doing".
 *
 * Every figure here is measured rather than estimated. Stories Completed comes
 * from the completion record, reading time from real session durations, and
 * Countries Explored from the countries of finished stories — the same fact
 * the Story Passport will be built around.
 *
 * A metric with nothing behind it renders as an em dash rather than a zero
 * dressed up as an achievement, and the panel does not appear at all until
 * there is something to show.
 */
const ReadingJourneyPanel = ({ insights, streak, isLoading }: ReadingJourneyPanelProps) => {
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Your Reading Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  const { summary } = insights;
  const metrics = [
    {
      key: "completed",
      icon: BookOpenCheck,
      label: "Stories Completed",
      value: summary.titles_completed > 0 ? String(summary.titles_completed) : "—",
    },
    {
      key: "current-streak",
      icon: Flame,
      label: "Current Streak",
      value: streak && streak.current_streak > 0 ? `${streak.current_streak} days` : "—",
    },
    {
      key: "longest-streak",
      icon: Trophy,
      label: "Longest Streak",
      value: streak && streak.longest_streak > 0 ? `${streak.longest_streak} days` : "—",
    },
    {
      key: "reading-time",
      icon: Clock3,
      label: "Total Reading Time",
      value:
        summary.total_reading_minutes > 0
          ? formatTotalMinutes(summary.total_reading_minutes)
          : "—",
    },
    {
      key: "favourite-genre",
      icon: Sparkles,
      label: "Favourite Genre",
      value: summary.favorite_genre || "—",
    },
    {
      key: "countries",
      icon: Globe2,
      label: "Countries Explored",
      value: summary.countries_explored > 0 ? String(summary.countries_explored) : "—",
    },
  ];

  // Nothing to celebrate yet is a real state — a wall of dashes tells a new
  // reader only that they have done nothing.
  if (metrics.every((metric) => metric.value === "—")) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Your Reading Journey</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map(({ key, icon: Icon, label, value }) => (
            <div key={key} className="rounded-lg border bg-muted/30 p-3 text-center">
              <Icon className="mx-auto mb-1.5 h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-base font-semibold leading-tight sm:text-lg">{value}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadingJourneyPanel;
