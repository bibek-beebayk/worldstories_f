import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Sparkles } from "lucide-react";
import { storyApi } from "@/api/story";
import { trackAnalyticsEvent } from "@/lib/analytics";

/**
 * "What are you in the mood for?" — the entry point into the mood layer.
 *
 * Every mood shown has stories behind it: the API counts only assignments
 * readers may see, and this drops anything at zero. A mood chip that leads to
 * an empty results page is worse than no chip, and it is the exact failure the
 * unreviewed-AI rule (§8.5) exists to prevent.
 *
 * Renders nothing at all until moods have been assigned, so the section does
 * not appear as a row of dead links on a site that has not populated them yet.
 */
const MoodPicker = () => {
  const { data } = useQuery({
    queryKey: ["moods"],
    queryFn: storyApi.getMoods,
    staleTime: 5 * 60 * 1000,
  });

  const moods = (data?.moods || []).filter((mood) => mood.stories_count > 0);
  if (moods.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        <span>What are you in the mood for?</span>
      </div>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Pick a feeling rather than a genre.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {moods.map((mood) => (
          <Link
            key={mood.slug}
            to={`/library?moods=${encodeURIComponent(mood.slug)}`}
            onClick={() =>
              trackAnalyticsEvent({
                event_type: "mood_selected",
                metadata: { mood: mood.slug },
              })
            }
            title={mood.description}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span aria-hidden="true">{mood.icon}</span>
            {mood.name}
            <span className="text-xs text-muted-foreground">{mood.stories_count}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default MoodPicker;
