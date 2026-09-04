import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { storyApi } from "@/api/story";
import type { AdminMood } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

/**
 * Moods administration.
 *
 * Two jobs on one page, because they are two halves of the same thing: editing
 * the vocabulary, and reviewing the machine suggestions that are waiting on a
 * person. The review queue is what turns §8.5's `source` column into an actual
 * workflow — without it, "allow admin review" is a field nobody can act on.
 */
const AdminMoods = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [editing, setEditing] = useState<AdminMood | null>(null);

  const { data: moods, isLoading } = useQuery({
    queryKey: ["admin-moods"],
    queryFn: storyApi.getAdminMoods,
  });

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ["admin-mood-reviews"],
    queryFn: storyApi.getPendingMoodReviews,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-moods"] });
    queryClient.invalidateQueries({ queryKey: ["admin-mood-reviews"] });
    // The public list counts only visible assignments, so approving a
    // suggestion changes it too.
    queryClient.invalidateQueries({ queryKey: ["moods"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("A mood needs a name.");
      if (editing) {
        return storyApi.updateAdminMood(editing.id, { name: trimmed, icon: icon.trim() });
      }
      return storyApi.createAdminMood({ name: trimmed, icon: icon.trim() });
    },
    onSuccess: () => {
      toast.success(editing ? "Mood updated" : "Mood created");
      setName("");
      setIcon("");
      setEditing(null);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Could not save the mood."),
  });

  const remove = useMutation({
    mutationFn: (mood: AdminMood) => storyApi.deleteAdminMood(mood.id),
    onSuccess: () => {
      toast.success("Mood deleted");
      refresh();
    },
    onError: () => toast.error("Could not delete the mood."),
  });

  const review = useMutation({
    mutationFn: ({ id, approved }: { id: number; approved: boolean }) =>
      storyApi.reviewMoodAssignment(id, approved),
    onSuccess: (_result, variables) => {
      toast.success(variables.approved ? "Suggestion approved" : "Suggestion rejected");
      refresh();
    },
    onError: () => toast.error("Could not record that decision."),
  });

  const startEditing = (mood: AdminMood) => {
    setEditing(mood);
    setName(mood.name);
    setIcon(mood.icon);
  };

  const cancelEditing = () => {
    setEditing(null);
    setName("");
    setIcon("");
  };

  return (
    // The admin shell's content section is overflow-hidden, so every page owns
    // its own scroll area — same wrapper as AdminThemes/Tags/Genres/Categories.
    // Without it this page's content is simply clipped at the viewport.
    <div className="h-full space-y-6 overflow-y-auto pr-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {editing ? `Edit ${editing.name}` : "Add a mood"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mood-name">
                Name
              </label>
              <Input
                id="mood-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Comforting"
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="mood-icon">
                Icon
              </label>
              <Input
                id="mood-icon"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="🫖"
              />
            </div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              {editing ? "Save" : "Add"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
            )}
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Keep the list short. "What are you in the mood for?" stops working once the answers
            need scrolling.
          </p>
        </CardContent>
      </Card>

      {/* The review queue sits above the vocabulary: a suggestion waiting on a
          person is the thing that needs doing, not the list of moods. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Suggestions awaiting review{" "}
            {pending && pending.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {pending.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!pendingLoading && (!pending || pending.length === 0) && (
            <p className="text-sm text-muted-foreground">
              Nothing waiting. AI-suggested moods appear here and stay hidden from readers until
              approved.
            </p>
          )}

          <ul className="space-y-2">
            {(pending || []).map((assignment) => (
              <li
                key={assignment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span aria-hidden="true">{assignment.mood_icon} </span>
                    {assignment.mood_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{assignment.story_title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: assignment.id, approved: false })}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: assignment.id, approved: true })}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Moods</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

          <ul className="space-y-2">
            {(moods || []).map((mood) => (
              <li
                key={mood.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span aria-hidden="true">{mood.icon} </span>
                    {mood.name}
                    {!mood.active && (
                      <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mood.stories_count} visible
                    {mood.pending_review_count > 0 && ` · ${mood.pending_review_count} awaiting review`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEditing(mood)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(mood)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMoods;
