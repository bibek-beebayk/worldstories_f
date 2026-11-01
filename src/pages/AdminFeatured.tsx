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
import { ArrowDown, ArrowUp, BookOpen, CalendarDays, Star, Trash2, X, Youtube } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import { FeaturedStoryPickerModal } from "@/components/admin/FeaturedStoryPickerModal";
import { FeaturedVideoPickerModal } from "@/components/admin/FeaturedVideoPickerModal";
import type { AdminFeaturedStory, AdminStory, PublicVideo } from "@/api/types";

type Kind = "story" | "video";
type Target = { kind: Kind; id: number };

const kindOf = (item: AdminFeaturedStory): Kind => item.kind ?? "story";
const targetOf = (item: AdminFeaturedStory): Target => ({ kind: kindOf(item), id: item.id });
const keyOf = (item: AdminFeaturedStory) => `${kindOf(item)}-${item.id}`;

/** First step of picking: is this slot a story or a video? */
const KindChooser = ({ onChoose, onClose }: { onChoose: (kind: Kind) => void; onClose: () => void }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
    <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">What do you want to feature?</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-16" onClick={() => onChoose("story")}>
          <BookOpen className="mr-2 h-4 w-4" /> Story
        </Button>
        <Button variant="outline" className="h-16" onClick={() => onChoose("video")}>
          <Youtube className="mr-2 h-4 w-4" /> Video
        </Button>
      </CardContent>
    </Card>
  </div>
);

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
  const [pickerKind, setPickerKind] = useState<Kind | null>(null);
  const [dailyPickerOpen, setDailyPickerOpen] = useState(false);
  const [dailyPickerKind, setDailyPickerKind] = useState<Kind | null>(null);
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

  const persist = async (items: Target[], successMessage: string) => {
    try {
      setPending(true);
      await storyApi.setFeaturedItems(items);
      await queryClient.invalidateQueries({ queryKey: ["admin-featured-stories"] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update the featured lineup.");
    } finally {
      setPending(false);
    }
  };

  const removeStory = (item: AdminFeaturedStory) => {
    persist(
      featured.filter((s) => keyOf(s) !== keyOf(item)).map(targetOf),
      `Removed "${item.title}" from the Featured lineup.`
    );
  };

  const moveStory = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= featured.length) return;
    const ids = featured.map(targetOf);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    persist(ids, "Reordered the Featured lineup.");
  };

  const closePicker = () => {
    setPickerSlotIndex(null);
    setPickerKind(null);
  };

  const handlePick = (kind: Kind, id: number, title: string) => {
    if (pickerSlotIndex === null) return;
    const ids = featured.map(targetOf);
    const isSwap = pickerSlotIndex < ids.length;
    if (isSwap) {
      ids[pickerSlotIndex] = { kind, id };
    } else {
      ids.push({ kind, id });
    }
    const slot = pickerSlotIndex;
    closePicker();
    persist(
      ids,
      isSwap ? `Set "${title}" as featured #${slot + 1}.` : `Added "${title}" to the Featured lineup.`
    );
  };

  const dailyCurrent: AdminFeaturedStory | null = dailyStory?.video_detail ?? dailyStory?.story_detail ?? null;
  const dailyTarget: Target | null = dailyStory?.video
    ? { kind: "video", id: dailyStory.video }
    : dailyStory?.story
      ? { kind: "story", id: dailyStory.story }
      : null;

  const saveDailyStory = async (target: Target | null = dailyTarget) => {
    if (!target) return;
    try {
      setDailyPending(true);
      await storyApi.setDailyStory({
        date: dailyDate,
        ...(target.kind === "story" ? { story: target.id } : { video: target.id }),
        featured_reason: dailyReason.trim(),
        active: dailyActive,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-daily-story", dailyDate] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
      setDailyPickerOpen(false);
      setDailyPickerKind(null);
      toast.success("Daily pick saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save the Daily pick.");
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
      toast.success("Daily pick removed for this date.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove the Daily pick.");
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
            <CalendarDays className="h-5 w-5 text-primary" /> Daily Story / Video
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose one published story or video for a UTC calendar date. Everyone sees the same selection;
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
          ) : dailyStory && dailyCurrent ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className={`shrink-0 overflow-hidden rounded-md bg-muted ${dailyCurrent.kind === "video" ? "aspect-video w-28" : "h-20 w-16"}`}>
                <CoverImage src={dailyCurrent.cover_image || ""} alt={dailyCurrent.title} author={dailyCurrent.author} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{dailyCurrent.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {dailyCurrent.kind === "video" ? "Video" : "Story"} · {dailyCurrent.author || "No author"}
                </p>
                <button type="button" className="mt-2 text-sm font-medium text-primary hover:underline" onClick={() => setDailyPickerOpen(true)}>Change</button>
              </div>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" disabled={dailyPending} onClick={deleteDailyStory} aria-label="Remove Daily Story for this date">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button type="button" disabled={dailyPending} onClick={() => setDailyPickerOpen(true)} className="flex min-h-20 w-full items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              No Daily pick configured — choose a story or video
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
            Featured Lineup
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose up to {MAX_FEATURED} stories and/or videos for the homepage Featured section, in
            the order they should appear. Click a slot to add or change its item. The section shows
            exactly what you select here — pick just 1 or 2 and only those appear. Leave all slots
            empty and it falls back to the most popular stories automatically.
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
                      Empty slot — click to add a story or video.
                    </button>
                  );
                }
                return (
                  <div key={keyOf(story)} className="flex items-center gap-3 rounded-md border p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setPickerSlotIndex(index)}
                      title="Click to change this item"
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <div className={`shrink-0 overflow-hidden rounded ${story.kind === "video" ? "aspect-video w-24" : "h-14 w-10"}`}>
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
                          {kindOf(story) === "video" ? "Video · " : ""}
                          {story.author || "No author"}
                          {!story.is_published && (
                            <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              {kindOf(story) === "video" ? "Story unpublished — won't show" : "Draft — won't show until published"}
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

      {pickerSlotIndex !== null && pickerKind === null && (
        <KindChooser onChoose={setPickerKind} onClose={closePicker} />
      )}
      <FeaturedStoryPickerModal
        open={pickerSlotIndex !== null && pickerKind === "story"}
        onClose={closePicker}
        excludeIds={featured.filter((s) => kindOf(s) === "story").map((s) => s.id)}
        onSelect={(story: AdminStory) => handlePick("story", story.id, story.title)}
      />
      <FeaturedVideoPickerModal
        open={pickerSlotIndex !== null && pickerKind === "video"}
        onClose={closePicker}
        excludeIds={featured.filter((s) => kindOf(s) === "video").map((s) => s.id)}
        onSelect={(video: PublicVideo) => handlePick("video", video.id, video.title)}
      />

      {dailyPickerOpen && dailyPickerKind === null && (
        <KindChooser onChoose={setDailyPickerKind} onClose={() => setDailyPickerOpen(false)} />
      )}
      <FeaturedStoryPickerModal
        open={dailyPickerOpen && dailyPickerKind === "story"}
        onClose={() => {
          setDailyPickerOpen(false);
          setDailyPickerKind(null);
        }}
        excludeIds={[]}
        onSelect={(story) => void saveDailyStory({ kind: "story", id: story.id })}
      />
      <FeaturedVideoPickerModal
        open={dailyPickerOpen && dailyPickerKind === "video"}
        onClose={() => {
          setDailyPickerOpen(false);
          setDailyPickerKind(null);
        }}
        excludeIds={[]}
        onSelect={(video) => void saveDailyStory({ kind: "video", id: video.id })}
      />
    </div>
  );
};

export default AdminFeatured;
