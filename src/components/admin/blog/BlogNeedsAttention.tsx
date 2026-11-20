import { CheckCircle2 } from "lucide-react";
import type { AdminBlogStats } from "@/api/types";
import type { BlogNeed } from "./blogList";

const ATTENTION_ITEMS: {
  need: BlogNeed;
  key: "missing_excerpt" | "missing_topics" | "missing_cover" | "no_linked_stories";
  label: string;
}[] = [
  { need: "excerpt", key: "missing_excerpt", label: "without an excerpt" },
  { need: "topics", key: "missing_topics", label: "without topics" },
  { need: "cover", key: "missing_cover", label: "without a cover" },
  { need: "linked_stories", key: "no_linked_stories", label: "with no linked stories" },
];

const StatTile = ({ label, value }: { label: string; value: number | undefined }) => (
  <div className="rounded-lg border bg-card px-3.5 py-3">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-xl font-bold tabular-nums">{value === undefined ? "–" : value.toLocaleString()}</p>
  </div>
);

interface BlogNeedsAttentionProps {
  stats: AdminBlogStats | undefined;
  isLoading: boolean;
  isError: boolean;
  activeNeeds: BlogNeed[];
  onSelectNeed: (need: BlogNeed) => void;
}

export const BlogNeedsAttention = ({
  stats,
  isLoading,
  isError,
  activeNeeds,
  onSelectNeed,
}: BlogNeedsAttentionProps) => {
  const visibleItems = ATTENTION_ITEMS.filter((item) => (stats?.[item.key] ?? 0) > 0);
  const allComplete = Boolean(stats && visibleItems.length === 0);

  return (
    <div className="space-y-2.5" aria-label="Blog overview">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-busy={isLoading}>
        <StatTile label="Total" value={stats?.total} />
        <StatTile label="Published" value={stats?.published} />
        <StatTile label="Draft" value={stats?.draft} />
        <StatTile label="Scheduled" value={stats?.scheduled} />
      </div>

      {isError && <p className="text-xs text-destructive">Blog counts could not be loaded.</p>}

      {allComplete ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          All posts complete
        </p>
      ) : (
        visibleItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Needs attention">
            {visibleItems.map((item) => {
              const count = stats?.[item.key] ?? 0;
              const isActive = activeNeeds.length === 1 && activeNeeds[0] === item.need;
              return (
                <button
                  key={item.need}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelectNeed(item.need)}
                  className={`min-h-11 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-amber-300/80 bg-amber-50/70 text-amber-900 hover:bg-amber-100/80 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
                  }`}
                >
                  <span className="font-semibold tabular-nums">{count.toLocaleString()}</span> {item.label}
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
