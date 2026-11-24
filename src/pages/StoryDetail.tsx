import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, Captions, Headphones, Newspaper, Sparkles, Youtube, Zap } from "lucide-react";
import { ApiError } from "@/api/client";
import type { StoryDetail as StoryDetailData } from "@/api/types";
import { storyApi } from "@/api/story";
import AdSpace from "@/components/AdSpace";
import BlogCard from "@/components/BlogCard";
import FullScreenLoader from "@/components/FullScreenLoader";
import NotFoundBody from "@/components/NotFoundBody";
import StoryCompletionScreen from "@/components/StoryCompletionScreen";
import StoryReactions from "@/components/StoryReactions";
import WatchModal from "@/components/WatchModal";
import SimilarTitles from "@/components/story/SimilarTitles";
import { StoryListenAction } from "@/components/story/StoryListenAction";
import StoryContentList from "@/components/story/StoryContentList";
import StoryHeader from "@/components/story/StoryHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthModal } from "@/context/AuthModalContext";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useStory } from "@/hooks/useStory";
import { useStoryProgress } from "@/hooks/useStoryProgress";
import { useStoryViewBeacon } from "@/hooks/useStoryViewBeacon";
import { consumeJustFinishedFlag } from "@/lib/storyCompletion";
import { buildStoryMeta, buildStoryNotFoundMeta } from "@/lib/storyMeta";
import { isStoryNotFoundData, loadStoryOr404 } from "@/lib/storyLoader";
import { estimateSummaryReadingMinutes } from "@/lib/summaryReadingTime";
import { cn } from "@/lib/utils";
import type { Route } from "./+types/StoryDetail";

const ACTION_BTN = "h-9 w-full min-w-0 px-2.5 text-[13px] sm:h-11 sm:px-8 sm:text-sm";
const ACTION_ITEM = "flex-1 basis-32 min-w-0 sm:basis-auto sm:min-w-[150px]";
const ACTION_ICON_BTN = "h-9 w-9 shrink-0 px-0 sm:h-11 sm:w-11";

export async function loader({ params }: Route.LoaderArgs) {
  return loadStoryOr404(params.slug!);
}

export const handle = { storyTheme: true };

export function meta({ data: story, params }: Route.MetaArgs) {
  return story && !isStoryNotFoundData(story)
    ? buildStoryMeta(story, { mode: "hub" })
    : buildStoryNotFoundMeta(params.slug, "hub");
}

const StoryDetailContent = ({ initialStory }: { initialStory?: StoryDetailData }) => {
  const { slug } = useParams();
  const { data: story, isLoading, error, refetch } = useStory(slug!, initialStory);
  useStoryViewBeacon(story?.slug);
  const progress = useStoryProgress(slug, story, { modes: ["read", "listen", "read-along", "watch"] });
  const queryClient = useQueryClient();
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const { isFavorite, favoritesCount, favoriteLoading, favoriteError, toggleFavorite } = useFavoriteToggle(slug, story);
  const [activeTab, setActiveTab] = useState("chapters");
  const [watchOpen, setWatchOpen] = useState(false);
  const [watchStartSlug, setWatchStartSlug] = useState<string | null>(null);
  const [showFinishedRail, setShowFinishedRail] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (story) setShowFinishedRail(consumeJustFinishedFlag(story.slug));
    // The slug is the one-shot key; background refetches must not consume it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.slug]);
  useEffect(() => {
    if (!story || story.chapters.length > 1) return;
    setActiveTab((current) =>
      current !== "chapters"
        ? current
        : story.audios.length > 1
          ? "audios"
          : story.videos.length > 1
            ? "videos"
            : "about",
    );
  }, [story]);

  const { data: relatedBlogsData } = useQuery({
    queryKey: ["related-blogs", slug],
    queryFn: () => storyApi.getBlogsForStory(slug!),
    enabled: !!slug,
  });
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["story-reviews", slug],
    queryFn: () => storyApi.getStoryReviews(slug!),
    enabled: !!slug && activeTab === "reviews",
  });
  const { data: myReview } = useQuery({
    queryKey: ["story-reviews", slug, "me"],
    queryFn: () => storyApi.getMyStoryReview(slug!),
    enabled: !!slug && !!isAuthenticated && activeTab === "reviews",
    retry: false,
  });
  const { data: originalsRail } = useQuery({
    queryKey: ["originals-rail"],
    queryFn: () => storyApi.getOriginals(1),
    enabled: !!story?.is_original,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!myReview) return;
    setReviewRating(myReview.rating);
    setReviewComment(myReview.comment || "");
  }, [myReview]);

  if (isLoading) return <FullScreenLoader />;
  if (!story && error instanceof ApiError && error.status === 404) return <NotFoundBody />;
  if (!story)
    return (
      <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p>We couldn’t load this story. Check your connection and try again.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );

  const savedChapterSlug = progress.readingProgress?.chapter_slug;
  const hasSavedChapter = !!savedChapterSlug && story.chapters.some((chapter) => chapter.slug === savedChapterSlug);
  const readChapterSlug = hasSavedChapter ? savedChapterSlug : story.chapters[0]?.slug;
  const chapterProgressMap = Object.fromEntries(
    (progress.readingProgress?.chapter_progresses || []).map((item) => [item.chapter_slug, item.progress]),
  );
  const primaryReadHref = story.chapters.length
    ? `/read/${story.slug}/${readChapterSlug}`
    : story.epub_file
      ? `/story/${story.slug}/epub`
      : story.pdf_file
        ? `/story/${story.slug}/pdf`
        : null;
  const primaryFileProgress = story.chapters.length
    ? null
    : story.epub_file
      ? progress.epubProgress
      : progress.pdfProgress;
  const hasSavedRead = story.chapters.length ? hasSavedChapter : (primaryFileProgress?.progress || 0) > 0;
  const readCompletion = story.chapters.length
    ? progress.readingProgress?.overall_progress || 0
    : primaryFileProgress?.progress || 0;
  const latestGuestAudio = (progress.guestAudioProgress || [])
    .filter((item) => item.kind === "audio")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const savedAudioSlug = progress.audioProgress?.audio_slug ?? latestGuestAudio?.item_slug;
  const hasSavedAudio = !!savedAudioSlug && story.audios.some((audio) => audio.slug === savedAudioSlug);
  const listenAudioSlug = hasSavedAudio ? savedAudioSlug : story.audios[0]?.slug;
  const readAlongTracks = story.audios.filter((audio) => audio.read_along_available).sort((a, b) => a.order - b.order);
  const hasReadAlong = readAlongTracks.length > 0;
  const readAlongResumeSlug =
    savedAudioSlug && readAlongTracks.some((audio) => audio.slug === savedAudioSlug) ? savedAudioSlug : null;
  const readAlongStartSlug = readAlongResumeSlug ?? readAlongTracks[0]?.slug;
  const savedVideoSlug = progress.videoProgress?.video_slug;
  const hasSavedVideo = !!savedVideoSlug && story.videos.some((video) => video.slug === savedVideoSlug);
  const watchVideoSlug = hasSavedVideo ? savedVideoSlug : story.videos[0]?.slug;
  const videoProgressMap = Object.fromEntries(
    (progress.videoProgress?.video_progresses || []).map((item) => [item.video_slug, item.progress]),
  );
  const quickReadMinutes = estimateSummaryReadingMinutes(story.summary);
  const readLabel = hasSavedRead ? "Continue Reading" : "Start Reading";
  const listenLabel = hasSavedAudio ? "Continue Listening" : "Listen to Audio";
  const watchLabel = hasSavedVideo ? "Continue Watching" : "Watch";

  const actions = (
    <>
      {primaryReadHref && (
        <Link to={primaryReadHref} className={ACTION_ITEM}>
          <Button size="lg" className={ACTION_BTN}>
            <BookMarked className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate sm:hidden">{hasSavedRead ? "Resume" : "Read"}</span>
            <span className="hidden truncate sm:inline">{readLabel}</span>
          </Button>
        </Link>
      )}
      {((story.audiobooks && story.audiobooks.length > 0) || (story.audios.length > 0 && listenAudioSlug)) && (
        <StoryListenAction
          storySlug={story.slug}
          audiobooks={story.audiobooks}
          listenAudioSlug={listenAudioSlug}
          listenLabel={listenLabel}
          hasReadAlong={hasReadAlong}
          readAlongStartSlug={readAlongStartSlug}
          readAlongResumeSlug={readAlongResumeSlug}
          itemClassName={ACTION_ITEM}
          buttonClassName={ACTION_BTN}
          iconButtonClassName={ACTION_ICON_BTN}
        />
      )}
      {story.videos.length > 0 && (
        <Button
          size="lg"
          variant="secondary"
          className={cn(ACTION_BTN, ACTION_ITEM)}
          onClick={() => {
            setWatchStartSlug(watchVideoSlug || null);
            setWatchOpen(true);
          }}
        >
          <Youtube className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate sm:hidden">Watch</span>
          <span className="hidden truncate sm:inline">{watchLabel}</span>
        </Button>
      )}
    </>
  );
  const guestAudioBySlug = Object.fromEntries(
    (progress.guestAudioProgress || [])
      .filter((item) => item.kind === "audio")
      .map((item) => [item.item_slug, item.progress]),
  );
  const guestAudioOverall = story.audios.length
    ? story.audios.reduce((sum, audio) => sum + (guestAudioBySlug[audio.slug] || 0), 0) / story.audios.length
    : 0;
  const progressText = (
    <>
      {quickReadMinutes !== null && (
        <Link
          to={`/quick-read/${story.slug}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Zap className="h-3.5 w-3.5" />
          Quick Read · {quickReadMinutes} min
        </Link>
      )}
      {isAuthenticated ? (
        <>
          <p className="text-sm text-muted-foreground">Completion: {Math.round(readCompletion * 100)}%</p>
          {story.audios.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Audio completion: {Math.round((progress.audioProgress?.overall_progress ?? guestAudioOverall) * 100)}%
            </p>
          )}
          {story.videos.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Watch completion: {Math.round((progress.videoProgress?.overall_progress || 0) * 100)}%
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          <button type="button" onClick={openLoginModal} className="text-primary hover:underline">
            Login
          </button>{" "}
          to track progress
        </p>
      )}
    </>
  );

  const submitReview = async () => {
    setReviewError("");
    setReviewLoading(true);
    try {
      if (myReview) await storyApi.updateMyStoryReview(slug!, reviewRating, reviewComment);
      else await storyApi.createStoryReview(slug!, reviewRating, reviewComment);
      await queryClient.invalidateQueries({ queryKey: ["story-reviews", slug] });
      await queryClient.invalidateQueries({ queryKey: ["story-reviews", slug, "me"] });
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setReviewLoading(false);
    }
  };
  const deleteReview = async () => {
    setReviewError("");
    setReviewLoading(true);
    try {
      await storyApi.deleteMyStoryReview(slug!);
      await queryClient.invalidateQueries({ queryKey: ["story-reviews", slug] });
      await queryClient.invalidateQueries({ queryKey: ["story-reviews", slug, "me"] });
      setReviewComment("");
      setReviewRating(5);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to delete review.");
    } finally {
      setReviewLoading(false);
    }
  };

  const relatedBlogs = relatedBlogsData?.results || [];
  const moreOriginals = (originalsRail?.results || []).filter((item) => item.slug !== story.slug).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <StoryHeader
              story={story}
              isFavorite={isFavorite}
              favoritesCount={favoritesCount}
              favoriteLoading={favoriteLoading}
              favoriteError={favoriteError}
              onToggleFavorite={toggleFavorite}
              actions={actions}
              progress={progressText}
              compactActions
            />
            <AdSpace size="banner" className="mb-8" contentType="story" />
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="-mx-1 overflow-x-auto px-1 pb-1 scrollbar-none">
                <TabsList className="w-max">
                  {story.chapters.length > 1 && <TabsTrigger value="chapters">Chapters</TabsTrigger>}
                  {story.audios.length > 1 && <TabsTrigger value="audios">Audios</TabsTrigger>}
                  {story.videos.length > 1 && <TabsTrigger value="videos">Watch</TabsTrigger>}
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="chapters" className="mt-6">
                <StoryContentList
                  story={story}
                  mode="read"
                  isAuthenticated={!!isAuthenticated}
                  chapterProgressMap={chapterProgressMap}
                />
              </TabsContent>
              <TabsContent value="audios" className="mt-6">
                <StoryContentList story={story} mode="listen" isAuthenticated={!!isAuthenticated} showReadAlongAction />
              </TabsContent>
              <TabsContent value="videos" className="mt-6">
                <StoryContentList
                  story={story}
                  mode="watch"
                  isAuthenticated={!!isAuthenticated}
                  videoProgressMap={videoProgressMap}
                  onWatch={(videoSlug) => {
                    setWatchStartSlug(videoSlug);
                    setWatchOpen(true);
                  }}
                />
              </TabsContent>
              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Story Description</h3>
                      <p className="text-muted-foreground">{story.about || "No description available."}</p>
                    </div>
                    {story.author && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-2">About the Author</h3>
                          <Link
                            to={`/authors/${story.author.slug}`}
                            className="group mb-3 flex w-fit items-center gap-3"
                          >
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={story.author.image || ""} />
                              <AvatarFallback>SC</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium group-hover:text-primary group-hover:underline">
                                {story.author.name}
                              </p>
                              <p className="text-sm text-muted-foreground">{story.author.stories_count} stories</p>
                            </div>
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {story.author.bio || "No author bio available."}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {isAuthenticated ? (
                      <div className="space-y-3 rounded-md border p-4">
                        <h3 className="font-semibold">{myReview ? "Update your review" : "Write a review"}</h3>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setReviewRating(value)}
                              aria-label={`Rate ${value} stars`}
                              className={value <= reviewRating ? "text-amber-500" : "text-muted-foreground"}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <Textarea
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="Share your thoughts about this story..."
                        />
                        {reviewError && <p className="text-sm text-red-500">{reviewError}</p>}
                        <div className="flex gap-2">
                          <Button onClick={submitReview} disabled={reviewLoading}>
                            {reviewLoading ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
                          </Button>
                          {myReview && (
                            <Button variant="outline" onClick={deleteReview} disabled={reviewLoading}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        <button type="button" onClick={openLoginModal} className="text-primary hover:underline">
                          Log in
                        </button>{" "}
                        to rate and review this story.
                      </p>
                    )}
                    <div>
                      <h3 className="font-semibold mb-4">Community Reviews</h3>
                      {reviewsLoading ? (
                        <p>Loading reviews...</p>
                      ) : !reviewsData?.results?.length ? (
                        <p className="text-muted-foreground">No reviews yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {reviewsData.results.map((review) => (
                            <div key={review.id} className="rounded-md border p-4">
                              <div className="mb-2 flex justify-between">
                                <p className="font-medium">{review.user.username}</p>
                                <p>{review.rating}/5</p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {review.comment || "No comment provided."}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-6">
            <AdSpace size="rectangle" contentType="story" />
          </div>
        </div>
        {relatedBlogs.length > 0 && (
          <section className="mt-12 border-t pt-8" aria-labelledby="related-blogs-heading">
            <div className="mb-5 flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <h2 id="related-blogs-heading" className="text-xl font-bold sm:text-2xl">
                Related Blogs
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {relatedBlogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          </section>
        )}
        {showFinishedRail && (
          <div className="mt-12">
            <StoryCompletionScreen storySlug={story.slug} storyTitle={story.title} />
          </div>
        )}
        <div className="mt-12">
          <StoryReactions storySlug={story.slug} />
        </div>
        <SimilarTitles stories={story.similar_stories} linkTo={(item) => `/story/${item.slug}`} />
        {story.is_original && moreOriginals.length > 0 && (
          <SimilarTitles
            stories={moreOriginals}
            linkTo={(item) => `/story/${item.slug}`}
            title="More WorldStories Originals"
            description="Other stories published in-house by WorldStories."
            headingId="more-originals-heading"
          />
        )}
      </main>
      {story.videos.length > 0 && (
        <WatchModal
          storySlug={story.slug}
          storyTitle={story.title}
          videos={story.videos}
          initialVideoSlug={watchStartSlug || watchVideoSlug}
          open={watchOpen}
          onOpenChange={setWatchOpen}
          isAuthenticated={!!isAuthenticated}
          onProgressSaved={() => queryClient.invalidateQueries({ queryKey: ["video-progress", slug] })}
        />
      )}
    </div>
  );
};

const StoryDetail = ({ loaderData }: Route.ComponentProps) =>
  isStoryNotFoundData(loaderData) ? <NotFoundBody /> : <StoryDetailContent initialStory={loaderData} />;

export default StoryDetail;
