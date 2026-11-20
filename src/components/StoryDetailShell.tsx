import { Captions, Link2, SquareArrowOutUpRight, Zap } from "lucide-react";
import { Link, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { StoryDetail } from "@/api/types";
import { ApiError } from "@/api/client";
import AdSpace from "@/components/AdSpace";
import AuthGatedLink from "@/components/AuthGatedLink";
import FullScreenLoader from "@/components/FullScreenLoader";
import NotFoundBody from "@/components/NotFoundBody";
import StoryReactions from "@/components/StoryReactions";
import WatchModal from "@/components/WatchModal";
import SimilarTitles from "@/components/story/SimilarTitles";
import StoryContentList from "@/components/story/StoryContentList";
import StoryHeader from "@/components/story/StoryHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuthModal } from "@/context/AuthModalContext";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { useStory } from "@/hooks/useStory";
import { useStoryProgress, type StoryProgressMode } from "@/hooks/useStoryProgress";
import { useStoryViewBeacon } from "@/hooks/useStoryViewBeacon";
import { useState } from "react";

export type StoryDetailMode = StoryProgressMode;
const modeLabels: Record<StoryDetailMode, string> = { read: "Read", listen: "Listen", "read-along": "Read Along", watch: "Watch" };

const StoryDetailShell = ({ mode, loaderData }: { mode: StoryDetailMode; loaderData?: StoryDetail }) => {
  const { slug } = useParams();
  const { data: story, isLoading, error, refetch } = useStory(slug!, loaderData);
  useStoryViewBeacon(story?.slug);
  const queryClient = useQueryClient();
  const { openLoginModal } = useAuthModal();
  const { isFavorite, favoritesCount, favoriteLoading, favoriteError, toggleFavorite } = useFavoriteToggle(slug, story);
  const progress = useStoryProgress(slug, story, { modes: [mode] });
  const [watchOpen, setWatchOpen] = useState(false);
  const [watchStartSlug, setWatchStartSlug] = useState<string | null>(null);

  if (isLoading) return <FullScreenLoader />;
  if (!story && error instanceof ApiError && error.status === 404) return <NotFoundBody />;
  if (!story) return <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center"><p>We couldn’t load this story. Check your connection and try again.</p><Button onClick={() => refetch()}>Retry</Button></div>;

  const savedChapterSlug = progress.readingProgress?.chapter_slug;
  const hasSavedChapter = !!savedChapterSlug && story.chapters.some((chapter) => chapter.slug === savedChapterSlug);
  const readChapterSlug = hasSavedChapter ? savedChapterSlug : story.chapters[0]?.slug;
  const chapterProgressMap = Object.fromEntries((progress.readingProgress?.chapter_progresses || []).map((item) => [item.chapter_slug, item.progress]));
  const primaryReadHref = story.chapters.length > 0 ? `/read/${story.slug}/${readChapterSlug}` : story.epub_file ? `/story/${story.slug}/epub` : story.pdf_file ? `/story/${story.slug}/pdf` : null;
  const latestGuestAudio = (progress.guestAudioProgress || []).filter((item) => item.kind === "audio").sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const savedAudioSlug = progress.audioProgress?.audio_slug ?? latestGuestAudio?.item_slug;
  const hasSavedAudio = !!savedAudioSlug && story.audios.some((audio) => audio.slug === savedAudioSlug);
  const listenAudioSlug = hasSavedAudio ? savedAudioSlug : story.audios[0]?.slug;
  const readAlongTracks = story.audios.filter((audio) => audio.read_along_available).sort((a, b) => a.order - b.order);
  const readAlongResumeSlug = savedAudioSlug && readAlongTracks.some((audio) => audio.slug === savedAudioSlug) ? savedAudioSlug : null;
  const readAlongStartSlug = readAlongResumeSlug ?? readAlongTracks[0]?.slug;
  const savedVideoSlug = progress.videoProgress?.video_slug;
  const hasSavedVideo = !!savedVideoSlug && story.videos.some((video) => video.slug === savedVideoSlug);
  const watchVideoSlug = hasSavedVideo ? savedVideoSlug : story.videos[0]?.slug;
  const videoProgressMap = Object.fromEntries((progress.videoProgress?.video_progresses || []).map((item) => [item.video_slug, item.progress]));
  const guestAudioBySlug = Object.fromEntries((progress.guestAudioProgress || []).filter((item) => item.kind === "audio").map((item) => [item.item_slug, item.progress]));
  const guestAudioOverall = story.audios.length ? story.audios.reduce((sum, audio) => sum + (guestAudioBySlug[audio.slug] || 0), 0) / story.audios.length : 0;
  const completion = Math.round((progress.readingProgress?.overall_progress || 0) * 100);
  const audioCompletion = Math.round((progress.audioProgress?.overall_progress ?? guestAudioOverall) * 100);
  const videoCompletion = Math.round((progress.videoProgress?.overall_progress || 0) * 100);

  const actions = <>
    {mode === "read" && primaryReadHref && <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700"><Link to={primaryReadHref}>{hasSavedChapter ? "Continue Reading" : "Start Reading"}</Link></Button>}
    {mode === "listen" && listenAudioSlug && <Button asChild size="lg" className="bg-rose-600 text-white hover:bg-rose-700"><Link to={`/listen/${story.slug}/${listenAudioSlug}`}>{hasSavedAudio ? "Continue Listening" : "Listen to Audio"}</Link></Button>}
    {mode === "read-along" && readAlongStartSlug && <Button asChild size="lg" className="bg-sky-600 text-white hover:bg-sky-700"><Link to={`/read-along/${story.slug}/${readAlongStartSlug}`}><Captions className="mr-2 h-4 w-4" />{readAlongResumeSlug ? "Continue Read Along" : "Start Read Along"}</Link></Button>}
    {mode === "watch" && story.videos.length > 0 && <Button size="lg" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => { setWatchStartSlug(watchVideoSlug || null); setWatchOpen(true); }}>{hasSavedVideo ? "Continue Watching" : "Watch"}</Button>}
  </>;
  const progressText = <>
    {progress.isAuthenticated ? <p className="text-sm text-muted-foreground">{mode === "read" ? `Completion: ${completion}%` : mode === "watch" ? `Watch completion: ${videoCompletion}%` : `Audio completion: ${audioCompletion}%`}</p> : <p className="text-sm text-muted-foreground"><button type="button" onClick={openLoginModal} className="text-primary hover:underline">Login</button> to track progress</p>}
    {story.summary && <AuthGatedLink to={`/quick-read/${story.slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Zap className="h-3.5 w-3.5" />Quick Read</AuthGatedLink>}
    <div className="flex flex-wrap gap-2 text-sm">
      {mode !== "read" && primaryReadHref && <Link className="rounded-full border px-3 py-1.5 hover:border-primary" to={`/read/${story.slug}`}>Read</Link>}
      {mode !== "listen" && story.audios.length > 0 && <Link className="rounded-full border px-3 py-1.5 hover:border-primary" to={`/listen/${story.slug}`}>Listen</Link>}
      {mode !== "read-along" && readAlongTracks.length > 0 && <Link className="rounded-full border px-3 py-1.5 hover:border-primary" to={`/read-along/${story.slug}`}>Read Along</Link>}
      {mode !== "watch" && story.videos.length > 0 && <Link className="rounded-full border px-3 py-1.5 hover:border-primary" to={`/watch/${story.slug}`}>Watch</Link>}
    </div>
  </>;

  const descriptionCard = <Card><CardContent className="p-6 space-y-4"><div><h3 className="font-semibold mb-2">Story Description</h3><p className="text-muted-foreground">{story.about || "No description available."}</p></div>{story.author && <><Separator /><div><h3 className="font-semibold mb-2">About the Author</h3><Link to={`/authors/${story.author.slug}`} className="group mb-3 flex w-fit items-center gap-3"><Avatar className="h-12 w-12"><AvatarImage src={story.author.image || ""} /><AvatarFallback>SC</AvatarFallback></Avatar><div><p className="font-medium transition-colors group-hover:text-primary group-hover:underline">{story.author.name}</p><p className="text-sm text-muted-foreground">{story.author.stories_count} stories</p></div></Link><p className="text-sm text-muted-foreground">{story.author.bio || "No author bio available."}</p></div></>}</CardContent></Card>;
  const externalLink = story.external_link?.trim();
  const externalCard = externalLink || story.link_note?.trim() ? <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card"><CardContent className="flex items-start gap-4 p-6"><Link2 className="mt-2 h-5 w-5 text-amber-600" /><div><p className="whitespace-pre-line font-semibold">{story.link_note || "Also available elsewhere"}</p>{externalLink && <Button asChild size="sm" className="mt-3 bg-amber-500 text-black hover:bg-amber-400"><a href={externalLink} target="_blank" rel="noopener noreferrer">{story.link_label || "Visit link"}<SquareArrowOutUpRight className="ml-1.5 h-3.5 w-3.5" /></a></Button>}</div></CardContent></Card> : null;
  const similar = mode === "listen" ? story.similar_stories.filter((item) => item.has_audio) : mode === "read-along" ? story.similar_stories.filter((item) => item.has_read_along) : mode === "watch" ? story.similar_stories.filter((item) => item.has_video) : story.similar_stories;

  return <div className="min-h-screen bg-background"><main className="container mx-auto px-4 pb-8 pt-0 sm:pt-8"><div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2">
    <StoryHeader story={story} mode={mode} isFavorite={isFavorite} favoritesCount={favoritesCount} favoriteLoading={favoriteLoading} favoriteError={favoriteError} onToggleFavorite={toggleFavorite} actions={actions} progress={progressText} />
    <div className="mb-8 lg:hidden">{descriptionCard}</div>{externalCard && <div className="mb-8 lg:hidden">{externalCard}</div>}<AdSpace size="banner" className="mb-8" contentType="story" />
    {(mode === "read" ? story.chapters : mode === "listen" ? story.audios : mode === "read-along" ? readAlongTracks : story.videos).length > 1 && <StoryContentList story={story} mode={mode} isAuthenticated={!!progress.isAuthenticated} chapterProgressMap={chapterProgressMap} videoProgressMap={videoProgressMap} onWatch={(videoSlug) => { setWatchStartSlug(videoSlug); setWatchOpen(true); }} />}
    <div className="mt-6"><StoryReactions storySlug={story.slug} /></div></div><div className="space-y-6"><div className="hidden lg:block">{descriptionCard}</div>{externalCard && <div className="hidden lg:block">{externalCard}</div>}<AdSpace size="rectangle" contentType="story" /></div></div>
    <SimilarTitles stories={similar} linkTo={(item) => `/${mode}/${item.slug}`} title={`Similar ${modeLabels[mode]} Titles`} description={`More ${modeLabels[mode].toLowerCase()} titles selected from shared genres and related story traits.`} />
  </main>{mode === "watch" && story.videos.length > 0 && <WatchModal storySlug={story.slug} storyTitle={story.title} videos={story.videos} initialVideoSlug={watchStartSlug || watchVideoSlug} open={watchOpen} onOpenChange={setWatchOpen} isAuthenticated={!!progress.isAuthenticated} onProgressSaved={() => queryClient.invalidateQueries({ queryKey: ["video-progress", slug] })} />}</div>;
};

export default StoryDetailShell;
