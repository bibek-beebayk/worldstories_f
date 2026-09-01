import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Star, X } from "lucide-react";
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
    </div>
  );
};

export default AdminFeatured;
