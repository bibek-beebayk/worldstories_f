import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpenText, CirclePlay, FileText, HardDrive, Headphones, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { storyApi } from "@/api/story";
import { DownloadRecord, deleteDownload, deleteDownloadsForStory } from "@/lib/offlineDb";
import { formatBytes } from "@/lib/utils";
import CoverImage from "@/components/CoverImage";
import { usePendingProgress } from "@/hooks/usePendingProgress";
import { toast } from "@/components/ui/sonner";

interface ProfileDownloadedStoryProps {
  storySlug: string;
  storyTitle: string;
  downloads: DownloadRecord[];
  onBack: () => void;
  onChange: () => void;
}

export default function ProfileDownloadedStory({
  storySlug,
  storyTitle,
  downloads,
  onBack,
  onChange,
}: ProfileDownloadedStoryProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const chapters = downloads.filter((item) => item.type === "chapter").sort((a, b) => a.order - b.order);
  const audios = downloads.filter((item) => item.type === "audio").sort((a, b) => a.order - b.order);
  const fileDownload = downloads.find((item) => item.type === "epub" || item.type === "pdf") || null;
  const coverImage = downloads[0]?.story_cover_image;
  const totalBytes = downloads.reduce((sum, item) => sum + item.size_bytes, 0);
  const pendingProgress = usePendingProgress(storySlug);
  const { data: storyDetails } = useQuery({
    queryKey: ["download-story-details", storySlug],
    queryFn: () => storyApi.getStory(storySlug),
    retry: false,
  });
  const authorName =
    downloads[0]?.story_author ||
    storyDetails?.author?.name ||
    storyDetails?.submitted_by?.display_name ||
    storyDetails?.submitted_by?.username;
  const storyType = downloads[0]?.story_type || storyDetails?.story_type;
  const genres = downloads[0]?.story_genres || storyDetails?.genres?.map((genre) => genre.name) || [];

  const { data: chapterProgress } = useQuery({
    queryKey: ["download-chapter-progress", storySlug],
    queryFn: () => storyApi.getReadingProgress(storySlug),
    enabled: chapters.length > 0,
    retry: false,
  });
  const chapterProgressMap: Record<string, number> = {};
  (chapterProgress?.chapter_progresses || []).forEach((item) => {
    chapterProgressMap[item.chapter_slug] = item.progress;
  });
  Object.assign(chapterProgressMap, pendingProgress.chapterProgress);

  const { data: audioProgress } = useQuery({
    queryKey: ["download-audio-progress", storySlug],
    queryFn: () => storyApi.getAudioProgress(storySlug),
    enabled: audios.length > 0,
    retry: false,
  });
  const audioProgressMap: Record<string, number> = {};
  (audioProgress?.audio_progresses || []).forEach((item) => {
    audioProgressMap[item.audio_slug] = item.progress;
  });
  Object.assign(audioProgressMap, pendingProgress.audioProgress);

  const { data: fileProgress } = useQuery({
    queryKey: ["download-file-progress", storySlug, fileDownload?.type],
    queryFn: () => storyApi.getFileReadingProgress(storySlug, fileDownload!.type as "epub" | "pdf"),
    enabled: !!fileDownload,
    retry: false,
  });

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await deleteDownload(id);
      onChange();
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await deleteDownloadsForStory(storySlug);
      onChange();
      toast.success("Downloaded title deleted.");
      onBack();
    } catch {
      toast.error("The downloaded title could not be deleted. Please try again.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const defaultTab = chapters.length > 0 ? "chapters" : "audios";
  const backTo = `/downloads?story=${storySlug}`;

  const overallProgressLabels: string[] = [];
  if (chapters.length > 0 && chapterProgress?.overall_progress != null) {
    overallProgressLabels.push(`Reading ${Math.round(chapterProgress.overall_progress * 100)}%`);
  } else if (chapters.length > 0) {
    const downloadedChapterProgress = chapters.reduce(
      (sum, item) => sum + (chapterProgressMap[item.item_slug] || 0),
      0
    ) / chapters.length;
    overallProgressLabels.push(`Reading ${Math.round(downloadedChapterProgress * 100)}%`);
  }
  if (audios.length > 0) {
    const downloadedAudioProgress = audios.reduce(
      (sum, item) => sum + (audioProgressMap[item.item_slug] || 0),
      0
    ) / audios.length;
    const listeningProgress = Math.max(audioProgress?.overall_progress || 0, downloadedAudioProgress);
    overallProgressLabels.push(`Listening ${Math.round(listeningProgress * 100)}%`);
  }
  if (fileDownload) {
    const savedFileProgress = Math.max(fileProgress?.progress || 0, pendingProgress.fileProgress || 0);
    overallProgressLabels.push(`Reading ${Math.round(savedFileProgress * 100)}%`);
  }

  const renderRow = (item: DownloadRecord, progress: number, readHref: string) => (
    <Link
      key={item.id}
      to={readHref}
      state={{ backTo }}
      className="group flex items-center gap-3 rounded-xl border border-transparent bg-muted/40 p-3 transition-all hover:border-primary/20 hover:bg-primary/5 sm:p-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border">
        {item.type === "audio" ? <Headphones className="h-4 w-4" /> : <BookOpenText className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="line-clamp-1 text-sm font-semibold group-hover:text-primary">{item.title}</p>
          <span className="shrink-0 text-xs font-medium text-primary">{Math.round(progress * 100)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{formatBytes(item.size_bytes)}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9 shrink-0 hover:bg-destructive/10"
        disabled={removingId === item.id}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleRemove(item.id);
        }}
        aria-label="Delete download"
      >
        {removingId === item.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4 text-destructive" />
        )}
      </Button>
    </Link>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button size="sm" variant="ghost" className="-ml-2 gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          All downloads
        </Button>
        {downloads.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteAllConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete all
          </Button>
        )}
      </div>

      <Card className="overflow-hidden border-cyan-200/60 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 sm:hidden">
            <div className="flex items-start gap-4">
              <CoverImage
                src={coverImage}
                alt={`${storyTitle} cover`}
                className="aspect-[3/4] w-24 shrink-0 rounded-xl object-cover shadow-lg"
              />
              <div className="min-w-0 flex-1 pt-1">
                <span className="mb-2 inline-flex rounded-full border border-cyan-300 bg-white/75 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-cyan-700">
                  Available offline
                </span>
                <h2 className="line-clamp-3 text-xl font-bold leading-tight tracking-tight text-slate-900">
                  {storyTitle}
                </h2>
                {authorName && <p className="mt-1 text-sm font-medium text-slate-600">by {authorName}</p>}
              </div>
            </div>

            {(storyType || genres.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-cyan-200/60 pt-4">
                {storyType && <Badge variant="secondary" className="bg-white/75">{storyType}</Badge>}
                {genres.map((genre) => (
                  <Badge key={genre} variant="outline" className="border-cyan-200 bg-white/60 text-slate-700">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
              {chapters.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-white/65 p-2.5"><BookOpenText className="h-4 w-4 text-primary" />{chapters.length} chapters</div>
              )}
              {audios.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-white/65 p-2.5"><Headphones className="h-4 w-4 text-primary" />{audios.length} audios</div>
              )}
              {fileDownload && (
                <div className="flex items-center gap-2 rounded-lg bg-white/65 p-2.5"><FileText className="h-4 w-4 text-primary" />{fileDownload.type.toUpperCase()}</div>
              )}
              <div className="flex items-center gap-2 rounded-lg bg-white/65 p-2.5"><HardDrive className="h-4 w-4 text-primary" />{formatBytes(totalBytes)}</div>
            </div>

            {overallProgressLabels.length > 0 && (
              <div className="mt-3 rounded-lg border border-cyan-200/70 bg-white/70 px-3 py-2.5 text-xs font-semibold text-primary">
                {overallProgressLabels.join(" · ")}
              </div>
            )}

            {fileDownload && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild size="sm" className="gap-2">
                  <Link to={`/story/${storySlug}/${fileDownload.type}`} state={{ backTo }}>
                    <CirclePlay className="h-4 w-4" /> Open {fileDownload.type.toUpperCase()}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={removingId === fileDownload.id}
                  onClick={() => handleRemove(fileDownload.id)}
                >
                  {removingId === fileDownload.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Remove
                </Button>
              </div>
            )}
          </div>

          <div className="hidden gap-6 p-6 sm:flex">
            <CoverImage
              src={coverImage}
              alt={`${storyTitle} cover`}
              className="aspect-[3/4] w-24 shrink-0 rounded-xl object-cover shadow-lg sm:w-32"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <span className="mb-2 w-fit rounded-full border border-cyan-300 bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
                Available offline
              </span>
              <h2 className="line-clamp-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {storyTitle}
              </h2>
              {authorName && <p className="mt-1 text-sm font-medium text-slate-600">by {authorName}</p>}
              {(storyType || genres.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {storyType && <Badge variant="secondary" className="bg-white/75">{storyType}</Badge>}
                  {genres.map((genre) => (
                    <Badge key={genre} variant="outline" className="border-cyan-200 bg-white/60 text-slate-700">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 sm:text-sm">
                {chapters.length > 0 && (
                  <span className="inline-flex items-center gap-1.5"><BookOpenText className="h-4 w-4" />{chapters.length} chapters</span>
                )}
                {audios.length > 0 && (
                  <span className="inline-flex items-center gap-1.5"><Headphones className="h-4 w-4" />{audios.length} audios</span>
                )}
                {fileDownload && (
                  <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4" />{fileDownload.type.toUpperCase()}</span>
                )}
                <span className="inline-flex items-center gap-1.5"><HardDrive className="h-4 w-4" />{formatBytes(totalBytes)}</span>
              </div>
              {overallProgressLabels.length > 0 && (
                <p className="mt-3 text-xs font-semibold text-primary sm:text-sm">{overallProgressLabels.join(" · ")}</p>
              )}
              {fileDownload && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" className="gap-2">
                    <Link to={`/story/${storySlug}/${fileDownload.type}`} state={{ backTo }}>
                      <CirclePlay className="h-4 w-4" />
                      Open {fileDownload.type.toUpperCase()}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={removingId === fileDownload.id}
                    onClick={() => handleRemove(fileDownload.id)}
                  >
                    {removingId === fileDownload.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove download
                  </Button>
                </div>
              )}
            </div>
          </div>

          {fileDownload && audios.length > 0 && (
            <div className="border-t border-cyan-200/70 bg-white/45 p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Headphones className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-slate-900">Downloaded audios</h3>
                <span className="text-xs text-muted-foreground">({audios.length})</span>
              </div>
              <div className="space-y-2">
                {audios.map((item) =>
                  renderRow(item, audioProgressMap[item.item_slug] || 0, `/listen/${storySlug}/${item.item_slug}`)
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!fileDownload && <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <Tabs defaultValue={defaultTab}>
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
                {chapters.length > 0 && (
                  <TabsTrigger value="chapters" className="gap-2 rounded-lg py-2.5">
                    <BookOpenText className="h-4 w-4" /> Chapters ({chapters.length})
                  </TabsTrigger>
                )}
                {audios.length > 0 && (
                  <TabsTrigger value="audios" className="gap-2 rounded-lg py-2.5">
                    <Headphones className="h-4 w-4" /> Audios ({audios.length})
                  </TabsTrigger>
                )}
              </TabsList>

              {chapters.length > 0 && (
                <TabsContent value="chapters" className="mt-4 space-y-2">
                  {chapters.map((item) =>
                    renderRow(item, chapterProgressMap[item.item_slug] || 0, `/read/${storySlug}/${item.item_slug}`)
                  )}
                </TabsContent>
              )}

              {audios.length > 0 && (
                <TabsContent value="audios" className="mt-4 space-y-2">
                  {audios.map((item) =>
                    renderRow(item, audioProgressMap[item.item_slug] || 0, `/listen/${storySlug}/${item.item_slug}`)
                  )}
                </TabsContent>
              )}
          </Tabs>
        </CardContent>
      </Card>}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="delete-all-title" aria-describedby="delete-all-description">
            <CardContent className="p-5 sm:p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h2 id="delete-all-title" className="mt-4 text-xl font-bold">Delete all downloads?</h2>
              <p id="delete-all-description" className="mt-2 text-sm text-muted-foreground">
                This will remove all {downloads.length} downloaded {downloads.length === 1 ? "item" : "items"} for “{storyTitle}” from this device.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" disabled={isDeletingAll} onClick={() => setShowDeleteAllConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" disabled={isDeletingAll} onClick={handleDeleteAll}>
                  {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  {isDeletingAll ? "Deleting…" : "Delete all"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
