import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { storyApi } from "@/api/story";
import type { AdminJourney } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

/** One story as the editor arranges it, before it is saved. */
interface DraftItem {
  story: number;
  title: string;
  required: boolean;
  published: boolean;
}

const JourneyEditor = ({ journey }: { journey: AdminJourney }) => {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setItems(
      journey.items.map((item) => ({
        story: item.story,
        title: item.story_title,
        required: item.required,
        published: item.story_published,
      }))
    );
  }, [journey.items]);

  // Only searched once the editor types — the admin story list is large and
  // an unfiltered fetch would be a page of noise.
  const { data: results, isFetching } = useQuery({
    queryKey: ["admin-journey-story-search", search],
    queryFn: () => storyApi.getAdminStories(1, search),
    enabled: search.trim().length > 1,
  });

  const chosenIds = useMemo(() => new Set(items.map((item) => item.story)), [items]);

  const save = useMutation({
    mutationFn: () =>
      storyApi.setAdminJourneyItems(
        journey.id,
        items.map((item) => ({ story: item.story, required: item.required }))
      ),
    onSuccess: () => {
      toast.success("Journey saved");
      queryClient.invalidateQueries({ queryKey: ["admin-journeys"] });
      queryClient.invalidateQueries({ queryKey: ["journeys"] });
    },
    onError: () => toast.error("Could not save the journey."),
  });

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  const requiredCount = items.filter((item) => item.required).length;

  return (
    <div className="mt-4 space-y-4 rounded-md border p-3">
      <div>
        <Label className="text-xs">Add a story</Label>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search stories by title…"
          className="mt-1"
        />
        {isFetching && <p className="mt-1 text-xs text-muted-foreground">Searching…</p>}
        {search.trim().length > 1 && results && (
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
            {results.results.length === 0 && (
              <p className="text-xs text-muted-foreground">No stories match that.</p>
            )}
            {results.results.map((story) => (
              <button
                key={story.id}
                type="button"
                disabled={chosenIds.has(story.id)}
                onClick={() => {
                  setItems((current) => [
                    ...current,
                    {
                      story: story.id,
                      title: story.title,
                      required: true,
                      published: Boolean(story.is_published),
                    },
                  ]);
                  setSearch("");
                }}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted disabled:opacity-40"
              >
                <span className="truncate">{story.title}</span>
                {chosenIds.has(story.id) && (
                  <span className="shrink-0 text-xs text-muted-foreground">added</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No stories yet. A journey with none stays hidden from readers.
        </p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.story}
              className="flex flex-wrap items-center gap-2 rounded-md border p-2"
            >
              <span className="w-6 text-center text-xs text-muted-foreground">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {item.title}
                {!item.published && (
                  <span className="ml-2 text-xs text-amber-600">unpublished</span>
                )}
              </span>

              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, required: event.target.checked } : row
                      )
                    )
                  }
                />
                Required
              </label>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  aria-label="Move down"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  aria-label={`Remove ${item.title}`}
                  onClick={() =>
                    setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Save stories
        </Button>
        {/* Completion is judged on required items, so this is the number that
            decides when a reader finishes — and zero means it never can. */}
        <p className="text-xs text-muted-foreground">
          {requiredCount === 0
            ? "No required stories — this journey can never be completed."
            : `${requiredCount} required of ${items.length}.`}
        </p>
      </div>
    </div>
  );
};

/**
 * Journey administration.
 *
 * Built here rather than relying on Django admin, which is unusable on this
 * deployment: Django 5.0's template context copying breaks on Python 3.14, so
 * every Django admin change list 500s. The Django registration remains for
 * whenever that mismatch is resolved.
 */
const AdminJourneys = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: journeys, isLoading } = useQuery({
    queryKey: ["admin-journeys"],
    queryFn: storyApi.getAdminJourneys,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-journeys"] });
    queryClient.invalidateQueries({ queryKey: ["journeys"] });
  };

  const create = useMutation({
    mutationFn: () => storyApi.createAdminJourney({ title: title.trim() }),
    onSuccess: (journey) => {
      toast.success("Journey created");
      setTitle("");
      setExpanded(journey.id);
      refresh();
    },
    onError: () => toast.error("Could not create the journey."),
  });

  const update = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      storyApi.updateAdminJourney(id, { active }),
    onSuccess: (_journey, variables) => {
      toast.success(variables.active ? "Journey is live" : "Journey hidden");
      refresh();
    },
    onError: () => toast.error("Could not update the journey."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => storyApi.deleteAdminJourney(id),
    onSuccess: () => {
      toast.success("Journey deleted");
      refresh();
    },
    onError: () => toast.error("Could not delete the journey."),
  });

  return (
    // The admin shell's content section is overflow-hidden, so every page owns
    // its own scroll area — see the layout contract in the engagement tracker.
    <div className="h-full space-y-6 overflow-y-auto pr-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New journey</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (title.trim()) create.mutate();
            }}
          >
            <div className="min-w-[240px] flex-1">
              <Label htmlFor="journey-title" className="text-xs">
                Title
              </Label>
              <Input
                id="journey-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ghost Stories Around the World"
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={create.isPending || !title.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            New journeys start hidden. Add the stories, then switch it live.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Journeys</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!isLoading && (journeys || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No journeys yet.</p>
          )}

          <ul className="space-y-3">
            {(journeys || []).map((journey) => (
              <li key={journey.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {journey.title}
                      {journey.active ? (
                        <span className="ml-2 text-xs text-primary">live</span>
                      ) : (
                        <span className="ml-2 text-xs text-muted-foreground">hidden</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {journey.item_count} stories · {journey.required_count} required
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setExpanded((current) => (current === journey.id ? null : journey.id))
                      }
                    >
                      {expanded === journey.id ? "Close" : "Edit stories"}
                    </Button>
                    <Button
                      size="sm"
                      variant={journey.active ? "outline" : "default"}
                      disabled={
                        update.isPending || (!journey.active && journey.required_count === 0)
                      }
                      title={
                        !journey.active && journey.required_count === 0
                          ? "Add at least one required story first"
                          : undefined
                      }
                      onClick={() => update.mutate({ id: journey.id, active: !journey.active })}
                    >
                      {journey.active ? "Hide" : "Go live"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(journey.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {expanded === journey.id && <JourneyEditor journey={journey} />}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminJourneys;
