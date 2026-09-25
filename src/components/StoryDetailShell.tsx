import AdSpace from "@/components/AdSpace";
import { plainText } from "@/lib/plainText";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shareToFacebook, shareToTwitter, copyShareLink } from "@/lib/share";
import StoryReactions from "@/components/StoryReactions";
import { storyApi } from "@/api/story";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStory } from "@/hooks/useStory";
import {
  BookMarked,
  CalendarDays,
  Captions,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Facebook,
  FileText,
  Headphones,
  Heart,
  Link2,
  Loader2,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Youtube,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useDownloadedIds, useOfflineDownload } from "@/hooks/useOfflineDownload";
import { listLocalProgress, makeDownloadId } from "@/lib/offlineDb";
import { formatDurationMinutes } from "@/lib/utils";
import CoverImage from "@/components/CoverImage";
import StoryCard from "@/components/StoryCard";
import WatchModal from "@/components/WatchModal";
import AuthGatedLink from "@/components/AuthGatedLink";
import type { Story } from "@/api/types";

export type StoryDetailMode = "read" | "listen" | "read-along" | "watch";

const MODE_LABEL: Record<StoryDetailMode, string> = {
  read: "Read",
  listen: "Listen",
  "read-along": "Read Along",
  watch: "Watch",
};

// Same per-format color coding used elsewhere (StoryCard's FORMAT_BADGES,
// Discover's ContentTypeSection themes), so "Also Available" pills read
// consistently with the rest of the app rather than inventing new colors.
const MODE_PILL_COLORS: Record<StoryDetailMode, string> = {
  read: "border-emerald-200 bg-emerald-50 text-emerald-700",
  listen: "border-rose-200 bg-rose-50 text-rose-700",
  "read-along": "border-sky-200 bg-sky-50 text-sky-700",
  watch: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

// Each mode-scoped detail page (ReadDetail/ListenDetail/ReadAlongDetail/
// WatchDetail) renders this shell — it deliberately only surfaces the
// actions/content relevant to the `mode` it was mounted with, so a reader who
// clicked "Read" from the library never sees Listen/Watch/Read Along CTAs.
// The all-modes hub with every action together still lives at /story/:slug
// (StoryDetail.tsx) for now.
const StoryDetailShell = ({ mode, loaderData }: { mode: StoryDetailMode; loaderData?: Story }) => {
  const { slug } = useParams();
  const { data: story, isLoading, isError } = useStory(slug, loaderData || undefined);
  const { downloadedIds, refresh: refreshDownloadedIds } = useDownloadedIds(slug || "");
  const {
    downloadChapter,
    downloadAudio,
    isPending: isDownloadPending,
    getProgress: getDownloadProgress,
    removeDownloadItem,
  } = useOfflineDownload();

  const viewedSlugRef = useRef<string | null>(null);
  useEffect(() => {
    const viewedSlug = story?.slug;
    if (!viewedSlug || viewedSlugRef.current === viewedSlug) return;
    viewedSlugRef.current = viewedSlug;
    storyApi.registerStoryView(viewedSlug).catch(() => undefined);
  }, [story?.slug]);

  const [watchOpen, setWatchOpen] = useState(false);
  const [watchStartSlug, setWatchStartSlug] = useState<string | null>(null);
  const { isFavorite, favoritesCount, favoriteLoading, favoriteError, toggleFavorite } = useFavoriteToggle(slug, story);
  const queryClient = useQueryClient();
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();

  const { data: readingProgress } = useQuery({
    queryKey: ["reading-progress", slug],
    queryFn: () => storyApi.getReadingProgress(slug!),
    enabled: !!slug && !!isAuthenticated && mode === "read",
    retry: false,
  });

  const { data: audioProgress } = useQuery({
    queryKey: ["audio-progress", slug],
    queryFn: () => storyApi.getAudioProgress(slug!),
    enabled: !!slug && !!isAuthenticated && (mode === "listen" || mode === "read-along"),
    retry: false,
  });

  const { data: guestAudioProgress } = useQuery({
    queryKey: ["local-audio-progress", slug],
    queryFn: () => listLocalProgress(slug),
    enabled: !!slug && !isAuthenticated && (mode === "listen" || mode === "read-along") && typeof window !== "undefined",
    retry: false,
  });

  const { data: videoProgress } = useQuery({
    queryKey: ["video-progress", slug],
    queryFn: () => storyApi.getVideoProgress(slug!),
    enabled: !!slug && !!isAuthenticated && mode === "watch",
    retry: false,
  });

  if (isLoading) return <FullScreenLoader />;
  if (isError || !story) return <div>Error loading story.</div>;

  const firstChapterSlug = story.chapters[0]?.slug;
  const savedChapterSlug = readingProgress?.chapter_slug;
  const hasSavedChapter =
    !!savedChapterSlug && story.chapters.some((chapter) => chapter.slug === savedChapterSlug);
  const readChapterSlug = hasSavedChapter ? savedChapterSlug : firstChapterSlug;
  const chapterProgressMap = Object.fromEntries(
    (readingProgress?.chapter_progresses || []).map((item) => [item.chapter_slug, item.progress])
  );
  const completionPercentage = Math.round((readingProgress?.overall_progress || 0) * 100);

  const primaryReadHref =
    story.chapters.length > 0
      ? `/read/${story.slug}/${readChapterSlug}`
      : story.epub_file
      ? `/story/${story.slug}/epub`
      : story.pdf_file
      ? `/story/${story.slug}/pdf`
      : null;
  const hasSavedRead = hasSavedChapter;
  const readLabel = hasSavedRead ? "Continue Reading" : "Start Reading";

  const firstAudioSlug = story.audios[0]?.slug;
  const latestGuestAudio = (guestAudioProgress || [])
    .filter((item) => item.kind === "audio")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const savedAudioSlug = audioProgress?.audio_slug ?? latestGuestAudio?.item_slug;
  const hasSavedAudio = !!savedAudioSlug && story.audios.some((audio) => audio.slug === savedAudioSlug);
  const listenAudioSlug = hasSavedAudio ? savedAudioSlug : firstAudioSlug;
  const guestAudioProgressBySlug = Object.fromEntries(
    (guestAudioProgress || [])
      .filter((item) => item.kind === "audio")
      .map((item) => [item.item_slug, item.progress])
  );
  const guestAudioOverall = story.audios.length
    ? story.audios.reduce((total, audio) => total + (guestAudioProgressBySlug[audio.slug] || 0), 0) /
      story.audios.length
    : 0;
  const audioCompletionPercentage = Math.round((audioProgress?.overall_progress ?? guestAudioOverall) * 100);
  const listenLabel = hasSavedAudio ? "Continue Listening" : "Listen to Audio";

  const readAlongTracks = story.audios
    .filter((audio) => audio.read_along_available)
    .sort((a, b) => a.order - b.order);
  const readAlongResumeSlug =
    savedAudioSlug && readAlongTracks.some((audio) => audio.slug === savedAudioSlug) ? savedAudioSlug : null;
  const readAlongStartSlug = readAlongResumeSlug ?? readAlongTracks[0]?.slug;
  const readAlongLabel = readAlongResumeSlug ? "Continue Read Along" : "Start Read Along";

  const firstVideoSlug = story.videos[0]?.slug;
  const savedVideoSlug = videoProgress?.video_slug;
  const hasSavedVideo = !!savedVideoSlug && story.videos.some((video) => video.slug === savedVideoSlug);
  const watchVideoSlug = hasSavedVideo ? savedVideoSlug : firstVideoSlug;
  const videoProgressMap = Object.fromEntries(
    (videoProgress?.video_progresses || []).map((item) => [item.video_slug, item.progress])
  );
  const videoCompletionPercentage = Math.round((videoProgress?.overall_progress || 0) * 100);
  const watchLabel = hasSavedVideo ? "Continue Watching" : "Watch";

  const storyPath = `/${mode}/${story.slug}`;
  // Other ways to experience this same title, excluding the mode this page
  // is already scoped to — surfaced separately below as "Also Available"
  // rather than mixed into the primary action, so the page stays a single
  // clear reading/listening/watching experience with just an escape hatch.
  const otherModes: { mode: StoryDetailMode; href: string; label: string; icon: typeof BookMarked }[] = [
    ...(mode !== "read" && primaryReadHref ? [{ mode: "read" as const, href: `/read/${story.slug}`, label: "Read", icon: BookMarked }] : []),
    ...(mode !== "listen" && story.audios.length > 0 && listenAudioSlug
      ? [{ mode: "listen" as const, href: `/listen/${story.slug}`, label: "Listen", icon: Headphones }]
      : []),
    ...(mode !== "read-along" && readAlongTracks.length > 0
      ? [{ mode: "read-along" as const, href: `/read-along/${story.slug}`, label: "Read Along", icon: Captions }]
      : []),
    ...(mode !== "watch" && story.videos.length > 0
      ? [{ mode: "watch" as const, href: `/watch/${story.slug}`, label: "Watch", icon: Youtube }]
      : []),
  ];
  const hasQuickRead = Boolean(story.summary);
  // Similar titles are scoped to the same mode this page is isolated to —
  // a reader on a Watch page shouldn't be offered "similar" titles that
  // turn out to be text-only. "read" has no reliable per-item flag to
  // filter on (virtually every story has some readable form), so it's left
  // unfiltered, matching how the Library's Read section also has no filter.
  const similarStories =
    mode === "listen"
      ? story.similar_stories.filter((item) => item.has_audio)
      : mode === "read-along"
      ? story.similar_stories.filter((item) => item.has_read_along)
      : mode === "watch"
      ? story.similar_stories.filter((item) => item.has_video)
      : story.similar_stories;
  const storyDownloadMetadata = {
    slug: story.slug,
    title: story.title,
    cover_image: story.cover_image,
    author: story.author?.name,
    genres: story.genres.map((genre) => genre.name),
    story_type: story.story_type,
  };

  // Rendered twice below (mobile vs. desktop position) rather than moved,
  // since the two columns are independent stacks in the DOM — on mobile
  // (single column) that means this would otherwise land after everything
  // in the left column instead of right below the info card.
  const descriptionAndAuthorCard = (
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
              <Link to={`/authors/${story.author.id}`} className="group mb-3 flex w-fit items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={story.author.image || ""} />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium transition-colors group-hover:text-primary group-hover:underline">{story.author.name}</p>
                  <p className="text-sm text-muted-foreground">{story.author.stories_count} stories</p>
                </div>
              </Link>
              <p className="text-sm text-muted-foreground">{story.author.bio || "No author bio available."}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pb-8 pt-0 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="relative -mx-4 mb-8 overflow-hidden border-y border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-card p-4 shadow-sm sm:mx-0 sm:rounded-sm sm:border-x sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-primary/10 blur-3xl sm:block" />

              <div className="relative grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
              {/* aspect-ratio only applies on mobile, where the image sits
                  stacked above the info column with nothing to match. From
                  md up (side-by-side), the grid row already stretches both
                  columns to equal height, so h-full here makes the image
                  match however tall the info content actually is, rather
                  than the other way around. */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm shadow-lg md:aspect-auto md:h-full md:min-h-[360px]">
                <CoverImage
                  src={story.cover_image}
                  alt={story.title}
                  author={story.author?.name}
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex h-full flex-col justify-center space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge>{story.story_type}</Badge>
                    <Badge variant="secondary">{MODE_LABEL[mode]}</Badge>
                    <Badge variant="outline">{story.is_completed ? "Complete" : "Ongoing"}</Badge>
                    {story.is_original && (
                      <Link
                        to="/originals"
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                      >
                        <Sparkles className="h-3 w-3" /> WorldStories Original
                      </Link>
                    )}
                  </div>
                  <h1 className="text-4xl font-bold mb-2">{story.title}</h1>
                  {story.author && (
                    <div className="flex items-center gap-2 mb-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={story.author.image || ""} />
                        <AvatarFallback>SC</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        by{" "}
                        <Link to={`/authors/${story.author.id}`} className="font-medium text-foreground transition-colors hover:text-primary hover:underline">
                          {story.author.name}
                        </Link>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-foreground sm:gap-x-6 sm:text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 sm:h-4 sm:w-4" />
                    <span className="font-semibold text-amber-600">{story.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-sky-500 sm:h-4 sm:w-4" />
                    <span className="font-semibold text-sky-600">{story.views}</span>
                  </div>
                  {mode === "read" &&
                    (story.chapter_count > 0 ? (
                      <div className="flex items-center gap-1">
                        <BookMarked className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4" />
                        <span className="font-semibold text-emerald-600">{story.chapter_count} chapters</span>
                      </div>
                    ) : story.epub_file || story.pdf_file ? (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4" />
                        <span className="font-semibold text-emerald-600">{story.epub_file ? "EPUB" : "PDF"}</span>
                      </div>
                    ) : null)}
                  {mode === "read" && story.reading_time_minutes != null && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-500 sm:h-4 sm:w-4" />
                      <span className="font-semibold text-amber-600">{formatDurationMinutes(story.reading_time_minutes)} read</span>
                    </div>
                  )}
                  {(mode === "listen" || mode === "read-along") && story.listening_time_minutes != null && (
                    <div className="flex items-center gap-1">
                      <Headphones className="h-3.5 w-3.5 text-rose-500 sm:h-4 sm:w-4" />
                      <span className="font-semibold text-rose-600">{formatDurationMinutes(story.listening_time_minutes)} listen</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Heart
                      className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isFavorite ? "fill-pink-500 text-pink-500" : "text-pink-400"}`}
                    />
                    <span className="font-semibold text-pink-600">{favoritesCount}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {story.genres.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag.name}</Badge>
                  ))}
                </div>

                {/* Primary action — one CTA, scoped to this page's mode only. */}
                <div className="flex flex-wrap gap-1.5">
                  {mode === "read" && primaryReadHref && (
                    <Link to={primaryReadHref}>
                      <Button size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
                        <BookMarked className="h-4 w-4 mr-2 shrink-0" />
                        {readLabel}
                      </Button>
                    </Link>
                  )}
                  {mode === "listen" && listenAudioSlug && (
                    <Link to={`/listen/${story.slug}/${listenAudioSlug}`}>
                      <Button size="lg" className="bg-rose-600 text-white hover:bg-rose-700">
                        <Headphones className="h-4 w-4 mr-2 shrink-0" />
                        {listenLabel}
                      </Button>
                    </Link>
                  )}
                  {mode === "read-along" && readAlongStartSlug && (
                    <Link to={`/read-along/${story.slug}/${readAlongStartSlug}`}>
                      <Button size="lg" className="bg-sky-600 text-white hover:bg-sky-700">
                        <Captions className="h-4 w-4 mr-2 shrink-0" />
                        {readAlongLabel}
                      </Button>
                    </Link>
                  )}
                  {mode === "watch" && story.videos.length > 0 && (
                    <Button
                      size="lg"
                      className="bg-indigo-600 text-white hover:bg-indigo-700"
                      onClick={() => {
                        setWatchStartSlug(watchVideoSlug || null);
                        setWatchOpen(true);
                      }}
                    >
                      <Youtube className="h-4 w-4 mr-2 shrink-0" />
                      {watchLabel}
                    </Button>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 w-11 px-0"
                    onClick={toggleFavorite}
                    disabled={favoriteLoading}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="lg" variant="outline" className="h-11 w-11 px-0" aria-label="Share this story">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => shareToFacebook(storyPath)}>
                        <Facebook className="h-4 w-4" />
                        Share on Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareToTwitter(storyPath, story.title)}>
                        <Share2 className="h-4 w-4" />
                        Share on X (Twitter)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyShareLink(storyPath)}>
                        <Link2 className="h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {mode === "read" && isAuthenticated && primaryReadHref && (
                  <p className="text-sm text-muted-foreground">Completion: {completionPercentage}%</p>
                )}
                {(mode === "listen" || mode === "read-along") && isAuthenticated && (
                  <p className="text-sm text-muted-foreground">Audio completion: {audioCompletionPercentage}%</p>
                )}
                {mode === "watch" && isAuthenticated && (
                  <p className="text-sm text-muted-foreground">Watch completion: {videoCompletionPercentage}%</p>
                )}
                {!isAuthenticated && (
                  <p className="text-sm text-muted-foreground">
                    <button type="button" onClick={openLoginModal} className="text-primary hover:underline">
                      Login
                    </button>{" "}
                    to track progress
                  </p>
                )}
                {favoriteError && <p className="text-sm text-red-500">{favoriteError}</p>}

                {(otherModes.length > 0 || hasQuickRead) && (
                  <div className="rounded-sm border border-dashed border-primary/30 bg-primary/5 p-3">
                    <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Also Available
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {otherModes.map(({ mode: otherMode, href, label, icon: Icon }) => {
                        const colors = MODE_PILL_COLORS[otherMode];
                        return (
                          <Link
                            key={otherMode}
                            to={href}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-all hover:scale-105 ${colors}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </Link>
                        );
                      })}
                      {hasQuickRead && (
                        <AuthGatedLink
                          to={`/quick-read/${story.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 shadow-sm transition-all hover:scale-105"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Quick Read
                        </AuthGatedLink>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>

            {/* Mobile-only: desktop shows this in the sidebar instead (below). */}
            <div className="mb-8 lg:hidden">{descriptionAndAuthorCard}</div>

            <AdSpace size="banner" className="mb-8" contentType="story" />

            {/* Mode-specific content list — the only list shown on this page.
                Skipped entirely when there's only one item: the primary
                button above already goes straight to it, so a one-row list
                repeating the same single option adds nothing. */}
            {mode === "read" && story.chapters.length > 1 && (
              <Card>
                <CardContent className="p-0">
                  <h3 className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground">
                    <BookMarked className="h-4 w-4 text-primary" />
                    Chapters
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {story.chapters.length}
                    </span>
                  </h3>
                  {story.chapters.length > 0 ? (
                    story.chapters.map((chapter, index) => {
                      const chapterProgress = chapterProgressMap[chapter.slug] || 0;
                      const isChapterCompleted = chapterProgress >= 1;
                      const downloadId = makeDownloadId(story.slug, "chapter", chapter.slug);
                      const isDownloaded = downloadedIds.has(downloadId);
                      const isPending = isDownloadPending(downloadId);
                      return (
                        <Link to={`/read/${slug}/${chapter.slug}`} key={index}>
                          <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-semibold text-muted-foreground w-8">{chapter.order}</span>
                              <h3 className="font-medium">{chapter.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {isAuthenticated &&
                                (isChapterCompleted ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Completed
                                  </span>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    <span>{Math.round(chapterProgress * 100)}%</span>
                                  </>
                                ))}
                              <button
                                type="button"
                                title={isDownloaded ? "Remove download" : "Download for offline reading"}
                                onClick={async (event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  if (isPending) return;
                                  if (isDownloaded) {
                                    await removeDownloadItem(downloadId);
                                  } else {
                                    await downloadChapter(storyDownloadMetadata, chapter.slug, chapter.title, chapter.order, chapter.read_along_available);
                                  }
                                  refreshDownloadedIds();
                                }}
                                className="rounded-full p-1.5 hover:bg-muted"
                              >
                                {isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isDownloaded ? (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          {index < story.chapters.length - 1 && <Separator />}
                        </Link>
                      );
                    })
                  ) : (
                    <p className="p-4 text-muted-foreground">No chapters available.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {mode === "listen" && story.audios.length > 1 && (
              <Card>
                <CardContent className="p-0">
                  <h3 className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground">
                    <Headphones className="h-4 w-4 text-primary" />
                    Audio Tracks
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {story.audios.length}
                    </span>
                  </h3>
                  {story.audios.length > 0 ? (
                    story.audios.map((audio, index) => {
                      const downloadId = makeDownloadId(story.slug, "audio", audio.slug);
                      const isDownloaded = downloadedIds.has(downloadId);
                      const isPending = isDownloadPending(downloadId);
                      return (
                        <Link to={`/listen/${slug}/${audio.slug}`} key={index}>
                          <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-semibold text-muted-foreground w-8">{audio.order}</span>
                              <h3 className="font-medium">{audio.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Headphones className="h-3 w-3" />
                              {isPending && getDownloadProgress(downloadId) != null && (
                                <span className="text-xs tabular-nums">
                                  {Math.round((getDownloadProgress(downloadId) || 0) * 100)}%
                                </span>
                              )}
                              <button
                                type="button"
                                title={isDownloaded ? "Remove download" : "Download for offline listening"}
                                onClick={async (event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  if (isPending) return;
                                  if (isDownloaded) {
                                    await removeDownloadItem(downloadId);
                                  } else {
                                    await downloadAudio(storyDownloadMetadata, audio.slug, audio.title, audio.order);
                                  }
                                  refreshDownloadedIds();
                                }}
                                className="rounded-full p-1.5 hover:bg-muted"
                              >
                                {isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isDownloaded ? (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          {index < story.audios.length - 1 && <Separator />}
                        </Link>
                      );
                    })
                  ) : (
                    <p className="p-4 text-muted-foreground">No audio available.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {mode === "read-along" && readAlongTracks.length > 1 && (
              <Card>
                <CardContent className="p-0">
                  <h3 className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground">
                    <Captions className="h-4 w-4 text-primary" />
                    Read Along Tracks
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {readAlongTracks.length}
                    </span>
                  </h3>
                  {readAlongTracks.length > 0 ? (
                    readAlongTracks.map((audio, index) => (
                      <Link to={`/read-along/${slug}/${audio.slug}`} key={index}>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-muted-foreground w-8">{audio.order}</span>
                            <h3 className="font-medium">{audio.title}</h3>
                          </div>
                          <Captions className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {index < readAlongTracks.length - 1 && <Separator />}
                      </Link>
                    ))
                  ) : (
                    <p className="p-4 text-muted-foreground">No read-along tracks available.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {mode === "watch" && story.videos.length > 1 && (
              <Card>
                <CardContent className="p-0">
                  <h3 className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground">
                    <Youtube className="h-4 w-4 text-primary" />
                    Videos
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {story.videos.length}
                    </span>
                  </h3>
                  {story.videos.length > 0 ? (
                    story.videos.map((video, index) => {
                      const watchProgress = videoProgressMap[video.slug] || 0;
                      const isVideoCompleted = watchProgress >= 0.995;
                      return (
                        <div key={video.slug}>
                          <button
                            type="button"
                            onClick={() => {
                              setWatchStartSlug(video.slug);
                              setWatchOpen(true);
                            }}
                            className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-semibold text-muted-foreground w-8">{video.order}</span>
                              <h3 className="font-medium">{video.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {isAuthenticated &&
                                (isVideoCompleted ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Watched
                                  </span>
                                ) : watchProgress > 0 ? (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    <span>{Math.round(watchProgress * 100)}%</span>
                                  </>
                                ) : null)}
                              <Youtube className="h-4 w-4" />
                            </div>
                          </button>
                          {index < story.videos.length - 1 && <Separator />}
                        </div>
                      );
                    })
                  ) : (
                    <p className="p-4 text-muted-foreground">No videos available.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Lives here, not after the two-column grid, so it fills the
                space the content list would otherwise take up when a story
                has no list to show (0 or 1 items — see above) instead of
                leaving the left column visibly shorter than the sidebar. */}
            <div className="mt-6">
              <StoryReactions storySlug={story.slug} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="hidden lg:block">{descriptionAndAuthorCard}</div>

            <AdSpace size="rectangle" contentType="story" />
          </div>
        </div>

        {similarStories.length > 0 && (
          <section className="mt-12 border-t pt-8" aria-labelledby="similar-titles-heading">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h2 id="similar-titles-heading" className="text-xl font-bold sm:text-2xl">
                  Similar {MODE_LABEL[mode]} Titles
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  More {MODE_LABEL[mode].toLowerCase()} titles selected from shared genres and related story traits.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {similarStories.map((similarStory) => (
                <StoryCard key={similarStory.id} {...similarStory} linkTo={`/${mode}/${similarStory.slug}`} />
              ))}
            </div>
          </section>
        )}
      </main>

      {mode === "watch" && story.videos.length > 0 && (
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

export default StoryDetailShell;
