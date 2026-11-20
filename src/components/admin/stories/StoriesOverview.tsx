import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { StoryNeed } from "./storyList";

const ATTENTION: {
  need: StoryNeed;
  key: "missing_summary" | "missing_retrospective" | "missing_cover" | "missing_chapters";
  label: string;
}[] = [
  { need: "summary", key: "missing_summary", label: "without a summary" },
  { need: "retro", key: "missing_retrospective", label: "without a retrospective" },
  { need: "cover", key: "missing_cover", label: "without a cover image" },
  { need: "chapters", key: "missing_chapters", label: "without chapters" },
];

const Tile = ({ label, value }: { label: string; value: number | undefined }) => (
  <div className="rounded-lg border bg-card p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold tabular-nums">{value === undefined ? "–" : value.toLocaleString()}</p>
  </div>
);

/**
 * The right panel when no story is selected: the counts, and what needs
 * attention among published stories. "Show them" applies the matching filter in the list.
 */
const StoriesOverview = ({
  onNew,
  onBulkUpdate,
  onShowNeed,
}: {
  onNew: () => void;
  onBulkUpdate: () => void;
  onShowNeed: (need: StoryNeed) => void;
}) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-story-stats"],
    queryFn: storyApi.getAdminStoryStats,
    // Edits happen elsewhere on this page; always show fresh numbers when the overview comes back.
    refetchOnMount: "always",
  });
  const rows = ATTENTION.filter((row) => (data?.[row.key] ?? 0) > 0);

  return (
    <Card>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Stories</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a story on the left to edit it, or see what needs work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={onBulkUpdate}>
              Bulk update taxonomy
            </Button>
            <Button type="button" className="min-h-11" onClick={onNew}>
              New story
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={isLoading}>
          <Tile label="Total" value={data?.total} />
          <Tile label="Published" value={data?.published} />
          <Tile label="Drafts" value={data?.draft} />
          <Tile label="Scheduled" value={data?.scheduled} />
        </div>

        {isError && <p className="text-sm text-destructive">The story counts could not be loaded.</p>}

        <section aria-labelledby="needs-attention-heading">
          <h2 id="needs-attention-heading" className="text-base font-semibold">
            Needs attention
          </h2>
          <p className="text-xs text-muted-foreground">Published stories that are missing something.</p>
          {data && rows.length === 0 && (
            <p className="mt-3 rounded-md border bg-muted/30 px-3 py-3 text-sm">
              Nothing to fix: every published story is complete.
            </p>
          )}
          <ul className="mt-3 divide-y rounded-md border">
            {rows.map((row) => (
              <li key={row.need} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <p className="text-sm">
                  <span className="font-semibold tabular-nums">{(data?.[row.key] ?? 0).toLocaleString()}</span>{" "}
                  {(data?.[row.key] ?? 0) === 1 ? "story" : "stories"} {row.label}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 shrink-0"
                  onClick={() => onShowNeed(row.need)}
                >
                  Show them <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
};

export default StoriesOverview;
