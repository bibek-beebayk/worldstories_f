import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Star, Trash2, X } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import { FeaturedStoryPickerModal } from "@/components/admin/FeaturedStoryPickerModal";
import type { AdminStory } from "@/api/types";

const MAX_FEATURED = 5;

const AdminFeatured = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ["admin-featured-stories"],
    queryFn: storyApi.getFeaturedStories,
    enabled: isAuthenticated && isSuperuser,
  });

  const [pending, setPending] = useState(false);
  // The slot a click opened the picker for — an existing slot (0..featured.length-1)
  // to swap it, or the next empty one (featured.length..MAX_FEATURED-1) to fill it.
  const [pickerSlotIndex, setPickerSlotIndex] = useState<number | null>(null);
  const [dailyPickerOpen, setDailyPickerOpen] = useState(false);
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailyReason, setDailyReason] = useState("");
  const [dailyActive, setDailyActive] = useState(true);
  const [dailyPending, setDailyPending] = useState(false);

  const { data: dailyStory, isLoading: dailyLoading } = useQuery({
    queryKey: ["admin-daily-story", dailyDate],
    queryFn: () => storyApi.getDailyStory(dailyDate),
    enabled: isAuthenticated && isSuperuser && Boolean(dailyDate),
  });

  useEffect(() => {
    setDailyReason(dailyStory?.featured_reason ?? "");
    setDailyActive(dailyStory?.active ?? true);
  }, [dailyStory]);

  const persist = async (storyIds: number[], successMessage: string) => {
    try {
      setPending(true);
      await storyApi.setFeaturedStories(storyIds);
      await queryClient.invalidateQueries({ queryKey: ["admin-featured-stories"] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update featured stories.");
    } finally {
      setPending(false);
    }
  };

  const removeStory = (story: { id: number; title: string }) => {
    persist(
      featured.filter((s) => s.id !== story.id).map((s) => s.id),
      `Removed "${story.title}" from Featured Stories.`
    );
  };

  const moveStory = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= featured.length) return;
    const ids = featured.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    persist(ids, "Reordered Featured Stories.");
  };

  const handlePick = (story: AdminStory) => {
    if (pickerSlotIndex === null) return;
    const ids = featured.map((s) => s.id);
    const isSwap = pickerSlotIndex < ids.length;
    if (isSwap) {
      ids[pickerSlotIndex] = story.id;
    } else {
      ids.push(story.id);
    }
    setPickerSlotIndex(null);
    persist(
      ids,
      isSwap
        ? `Set "${story.title}" as featured story #${pickerSlotIndex + 1}.`
        : `Added "${story.title}" to Featured Stories.`
    );
  };

  const saveDailyStory = async (storyId = dailyStory?.story) => {
    if (!storyId) return;
    try {
      setDailyPending(true);
      await storyApi.setDailyStory({
        date: dailyDate,
        story: storyId,
        featured_reason: dailyReason.trim(),
        active: dailyActive,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-daily-story", dailyDate] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
      setDailyPickerOpen(false);
      toast.success("Daily Story saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save the Daily Story.");
    } finally {
      setDailyPending(false);
    }
  };

  const deleteDailyStory = async () => {
    try {
      setDailyPending(true);
      await storyApi.deleteDailyStory(dailyDate);
      await queryClient.invalidateQueries({ queryKey: ["admin-daily-story", dailyDate] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
      toast.success("Daily Story removed for this date.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove the Daily Story.");
    } finally {
      setDailyPending(false);
    }
  };

  if (meLoading) {
    return <FullScreenLoader />;
  }

  if (!isSuperuser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Featured Stories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Access denied. Superuser privileges are required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      <Card>
        <CardHeader className="space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" /> Daily Story
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose one published story for a UTC calendar date. Everyone sees the same selection;
            when a date has none, the homepage keeps its existing Featured Story hero.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <div>
              <Label htmlFor="daily-story-date">Date (UTC)</Label>
              <Input id="daily-story-date" type="date" value={dailyDate} onChange={(event) => setDailyDate(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="daily-story-reason">Featured reason</Label>
              <Input id="daily-story-reason" value={dailyReason} maxLength={280} onChange={(event) => setDailyReason(event.target.value)} placeholder="Why readers should discover this story today" className="mt-2" />
            </div>
          </div>

          {dailyLoading ? (
            <p className="text-sm text-muted-foreground">Loading Daily Story…</p>
          ) : dailyStory ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                <CoverImage src={dailyStory.story_detail.cover_image || ""} alt={dailyStory.story_detail.title} author={dailyStory.story_detail.author} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{dailyStory.story_detail.title}</p>
                <p className="truncate text-sm text-muted-foreground">{dailyStory.story_detail.author || "No author"}</p>
                <button type="button" className="mt-2 text-sm font-medium text-primary hover:underline" onClick={() => setDailyPickerOpen(true)}>Change story</button>
              </div>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" disabled={dailyPending} onClick={deleteDailyStory} aria-label="Remove Daily Story for this date">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button type="button" disabled={dailyPending} onClick={() => setDailyPickerOpen(true)} className="flex min-h-20 w-full items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              No Daily Story configured — choose a story
            </button>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={dailyActive} onCheckedChange={(checked) => setDailyActive(checked === true)} /> Active
            </label>
            <Button disabled={!dailyStory || dailyPending} onClick={() => saveDailyStory()}>{dailyPending ? "Saving…" : "Save Daily Story"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-amber-500" />
            Featured Stories
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose up to {MAX_FEATURED} stories to lead the homepage hero, in the order they should
            appear. Click a slot to add or change its story. The hero shows exactly what you select
            here — pick just 1 or 2 and only those appear. Leave all slots empty and the hero falls
            back to the site's most popular stories automatically.
          </p>
        </CardHeader>
        <CardContent>
          {featuredLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: MAX_FEATURED }).map((_, index) => {
                const story = featured[index];
                if (!story) {
                  return (
                    <button
                      key={`empty-${index}`}
                      type="button"
                      disabled={pending}
                      onClick={() => setPickerSlotIndex(index)}
                      className="flex w-full items-center gap-3 rounded-md border border-dashed p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                        {index + 1}
                      </span>
                      Empty slot — click to add a story.
                    </button>
                  );
                }
                return (
                  <div key={story.id} className="flex items-center gap-3 rounded-md border p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setPickerSlotIndex(index)}
                      title="Click to change this story"
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded">
                        <CoverImage
                          src={story.cover_image || ""}
                          alt={story.title}
                          author={story.author}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{story.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {story.author || "No author"}
                          {!story.is_published && (
                            <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              Draft — won't show until published
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={pending || index === 0}
                        onClick={() => moveStory(index, -1)}
                        aria-label={`Move ${story.title} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={pending || index === featured.length - 1}
                        onClick={() => moveStory(index, 1)}
                        aria-label={`Move ${story.title} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={pending}
                        onClick={() => removeStory(story)}
                        aria-label={`Remove ${story.title} from featured`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FeaturedStoryPickerModal
        open={pickerSlotIndex !== null}
        onClose={() => setPickerSlotIndex(null)}
        excludeIds={featured.map((s) => s.id)}
        onSelect={handlePick}
      />
      <FeaturedStoryPickerModal
        open={dailyPickerOpen}
        onClose={() => setDailyPickerOpen(false)}
        excludeIds={[]}
        onSelect={(story) => void saveDailyStory(story.id)}
      />
    </div>
  );
};

export default AdminFeatured;
