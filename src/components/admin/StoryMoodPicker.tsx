import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

/**
 * Mood assignment for one story.
 *
 * Deliberately a fixed set of toggles rather than the free-text "type a name to
 * add" control the Tags and Themes fields use: mood is a closed vocabulary
 * (§8.3), and letting an editor invent one here would grow the list that "What
 * are you in the mood for?" depends on staying short.
 *
 * Saves through its own endpoint rather than the story form's payload, so it
 * neither depends on nor risks that form's save flow — and so provenance stays
 * server-side, where a re-save cannot relabel a reviewed AI suggestion as an
 * administrator's own choice.
 */
const StoryMoodPicker = ({ storyId }: { storyId: number }) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);

  const { data: moods } = useQuery({
    queryKey: ["admin-moods"],
    queryFn: storyApi.getAdminMoods,
  });

  const { data: assigned, isLoading } = useQuery({
    queryKey: ["admin-story-moods", storyId],
    queryFn: () => storyApi.getStoryMoods(storyId),
  });

  useEffect(() => {
    if (assigned) setSelected(assigned.map((row) => row.mood));
  }, [assigned]);

  const save = useMutation({
    mutationFn: () => storyApi.setStoryMoods(storyId, selected),
    onSuccess: () => {
      toast.success("Moods saved");
      queryClient.invalidateQueries({ queryKey: ["admin-story-moods", storyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-moods"] });
      queryClient.invalidateQueries({ queryKey: ["moods"] });
    },
    onError: () => toast.error("Could not save the moods."),
  });

  // Which of the current assignments came from a machine and are still
  // unreviewed — shown because they are invisible to readers, so an editor
  // seeing the chip selected would otherwise assume it is live.
  const pendingMoodIds = useMemo(
    () => new Set((assigned || []).filter((row) => !row.is_public).map((row) => row.mood)),
    [assigned]
  );

  const activeMoods = (moods || []).filter((mood) => mood.active);
  const isDirty = useMemo(() => {
    const before = new Set((assigned || []).map((row) => row.mood));
    return before.size !== selected.length || selected.some((id) => !before.has(id));
  }, [assigned, selected]);

  if (activeMoods.length === 0) return null;

  return (
    <div>
      <Label>Moods</Label>
      <div className="mt-2 rounded-md border p-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {activeMoods.map((mood) => {
                const isOn = selected.includes(mood.id);
                const isPending = pendingMoodIds.has(mood.id);
                return (
                  <button
                    key={mood.id}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() =>
                      setSelected((current) =>
                        current.includes(mood.id)
                          ? current.filter((id) => id !== mood.id)
                          : [...current, mood.id]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isOn
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span aria-hidden="true">{mood.icon} </span>
                    {mood.name}
                    {isPending && " (awaiting review)"}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={() => save.mutate()}
                disabled={save.isPending || !isDirty}
              >
                {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save moods
              </Button>
              <p className="text-xs text-muted-foreground">
                Saved separately from the story form.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StoryMoodPicker;
