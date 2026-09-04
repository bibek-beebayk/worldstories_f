import { useQuery } from "@tanstack/react-query";
import { Copy, Share2, Twitter } from "lucide-react";
import { authApi } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  copyMilestone,
  shareMilestoneToTwitter,
  type Milestone,
} from "@/lib/milestoneShare";

/**
 * "Your Week in Stories".
 *
 * On-site only, by instruction (§11.2): no email, no push. It is also entirely
 * passive — it reports, and the only outbound action is a share the reader
 * presses themselves (§11.4). Nothing here posts anything anywhere on its own.
 *
 * Renders nothing at all for a quiet week. A recap of five zeroes tells a
 * reader only that they did nothing, which is the opposite of encouraging.
 */
const WeeklyRecapCard = ({ enabled }: { enabled: boolean }) => {
  const { data } = useQuery({
    queryKey: ["weekly-recap"],
    queryFn: authApi.getWeeklyRecap,
    enabled,
  });

  if (!data || !data.has_activity) return null;

  const lines = [
    data.stories_completed > 0 && {
      key: "stories",
      value: data.stories_completed,
      label: data.stories_completed === 1 ? "story completed" : "stories completed",
    },
    data.minutes_read > 0 && {
      key: "minutes",
      value: data.minutes_read,
      label: data.minutes_read === 1 ? "minute read" : "minutes read",
    },
    data.countries_explored > 0 && {
      key: "countries",
      value: data.countries_explored,
      label: data.countries_explored === 1 ? "country" : "countries",
    },
    data.journeys_completed > 0 && {
      key: "journeys",
      value: data.journeys_completed,
      label: data.journeys_completed === 1 ? "journey finished" : "journeys finished",
    },
    data.current_streak > 0 && {
      key: "streak",
      value: data.current_streak,
      label: "day streak",
    },
  ].filter(Boolean) as Array<{ key: string; value: number; label: string }>;

  // The single most shareable fact of the week, if there is one. Deliberately
  // one option rather than a share button per figure — a row of them turns a
  // summary into a demand.
  const milestone: Milestone | null =
    data.stories_completed > 0
      ? { kind: "stories", value: data.stories_completed }
      : data.current_streak > 0
      ? { kind: "streak", value: data.current_streak }
      : null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Your Week in Stories</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">The last {data.days} days.</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {lines.map((line) => (
            <div key={line.key} className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-lg font-semibold leading-tight">{line.value}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{line.label}</p>
            </div>
          ))}
        </div>

        {data.favourite_genre && (
          <p className="mt-3 text-sm text-muted-foreground">
            Mostly <span className="font-medium text-foreground">{data.favourite_genre}</span> this
            week.
          </p>
        )}

        {milestone && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Share2 className="h-3.5 w-3.5" />
              Share this
            </span>
            <Button size="sm" variant="outline" onClick={() => shareMilestoneToTwitter(milestone)}>
              <Twitter className="mr-1.5 h-3.5 w-3.5" />
              Post
            </Button>
            <Button size="sm" variant="outline" onClick={() => copyMilestone(milestone)}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyRecapCard;
