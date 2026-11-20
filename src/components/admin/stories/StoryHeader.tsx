import { ExternalLink, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminStory } from "@/api/types";
import { CoverThumb, StatusLabel } from "./StoryListPanel";
import { readyChecklist, storyStatus, type ReadyKey } from "./storyList";

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;

/** The selected story's header: cover, title, status, slug, links, and the facts the API already returns. */
export const StoryHeaderCard = ({ story, onEdit }: { story: AdminStory; onEdit: () => void }) => {
  const status = storyStatus(story);
  // Live since: when the scheduled time passed, otherwise the date it was put on the site.
  const liveSince = status === "published" ? formatDate(story.publish_at ?? story.site_published_date) : null;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
        <CoverThumb
          url={story.cover_image_url}
          title={story.title}
          className="h-[96px] w-[72px] shrink-0 rounded-md text-2xl shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold leading-tight break-words">{story.title}</h1>
            <span className="rounded-full border px-2.5 py-0.5">
              <StatusLabel status={status} />
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">/{story.slug}</p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{story.views.toLocaleString()} views</span>
            {story.rating > 0 && <span>Rating {story.rating.toFixed(1)}</span>}
            {liveSince && <span>Live since {liveSince}</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" onClick={onEdit}>
              Edit story
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <a href={`/story/${story.slug}`} target="_blank" rel="noopener noreferrer">
                View on site <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ACTION_LABEL: Record<ReadyKey, string> = {
  cover: "Add a cover",
  about: "Write the about text",
  author: "Choose an author",
  genre: "Pick a genre",
  summary: "Add a summary",
  chapters: "Add chapters",
};

/**
 * "Ready to publish": six checks with a segmented progress bar. Each missing
 * item has an action — a tab to jump to, or the existing editor for fields it holds.
 */
export const ReadyChecklist = ({ story, onAction }: { story: AdminStory; onAction: (key: ReadyKey) => void }) => {
  const items = readyChecklist(story);
  const done = items.filter((item) => item.done).length;
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Ready to publish</h2>
          <p className="text-sm text-muted-foreground">
            {done} of {items.length} done
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Ready to publish"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={done}
          className="mt-3 flex h-2 gap-1"
        >
          {items.map((item) => (
            <span key={item.key} className={`min-w-0 flex-1 rounded-full ${item.done ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.key} className="flex min-h-11 items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                {item.done ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={item.done ? "" : "font-medium"}>{item.label}</span>
                <span className="sr-only">{item.done ? "done" : "missing"}</span>
              </span>
              {!item.done && (
                <button
                  type="button"
                  onClick={() => onAction(item.key)}
                  className="min-h-11 shrink-0 px-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {ACTION_LABEL[item.key]}
                </button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
