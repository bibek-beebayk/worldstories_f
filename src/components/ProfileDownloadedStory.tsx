import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { storyApi } from "@/api/story";
import { DownloadRecord, deleteDownload } from "@/lib/offlineDb";
import { formatBytes } from "@/lib/utils";

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

  const chapters = downloads.filter((item) => item.type === "chapter").sort((a, b) => a.order - b.order);
  const audios = downloads.filter((item) => item.type === "audio").sort((a, b) => a.order - b.order);
  const fileDownload = downloads.find((item) => item.type === "epub" || item.type === "pdf") || null;

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

  const defaultTab = chapters.length > 0 ? "chapters" : "audios";
  const backTo = `/profile?section=downloads&story=${storySlug}`;

  const overallProgressLabels: string[] = [];
  if (chapters.length > 0 && chapterProgress?.overall_progress != null) {
    overallProgressLabels.push(`Reading ${Math.round(chapterProgress.overall_progress * 100)}%`);
  }
  if (audios.length > 0 && audioProgress?.overall_progress != null) {
    overallProgressLabels.push(`Listening ${Math.round(audioProgress.overall_progress * 100)}%`);
  }
  if (fileDownload && fileProgress?.progress != null) {
    overallProgressLabels.push(`${Math.round(fileProgress.progress * 100)}% complete`);
  }

  const renderRow = (item: DownloadRecord, progress: number, readHref: string) => (
    <Link
      key={item.id}
      to={readHref}
      state={{ backTo }}
      className="flex items-center justify-between gap-3 rounded-md border p-3 transition hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {Math.round(progress * 100)}% complete · {formatBytes(item.size_bytes)}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
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
    <Card className="shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{storyTitle}</h3>
            {overallProgressLabels.length > 0 && (
              <p className="text-xs font-medium text-primary">{overallProgressLabels.join(" · ")}</p>
            )}
          </div>
        </div>

        {fileDownload ? (
          <Link
            to={`/story/${storySlug}/${fileDownload.type}`}
            state={{ backTo }}
            className="flex items-center justify-between gap-3 rounded-md border p-4 transition hover:bg-muted/50"
          >
            <div className="min-w-0">
              <p className="line-clamp-1 flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                {storyTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {fileDownload.type.toUpperCase()} · {formatBytes(fileDownload.size_bytes)}
                {fileProgress?.progress != null && ` · ${Math.round(fileProgress.progress * 100)}% complete`}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={removingId === fileDownload.id}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleRemove(fileDownload.id);
              }}
              aria-label="Delete download"
            >
              {removingId === fileDownload.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </Link>
        ) : (
          <Tabs defaultValue={defaultTab}>
            <TabsList>
              {chapters.length > 0 && <TabsTrigger value="chapters">Chapters ({chapters.length})</TabsTrigger>}
              {audios.length > 0 && <TabsTrigger value="audios">Audios ({audios.length})</TabsTrigger>}
            </TabsList>

            {chapters.length > 0 && (
              <TabsContent value="chapters" className="mt-3 space-y-2">
                {chapters.map((item) =>
                  renderRow(item, chapterProgressMap[item.item_slug] || 0, `/read/${storySlug}/${item.item_slug}`)
                )}
              </TabsContent>
            )}

            {audios.length > 0 && (
              <TabsContent value="audios" className="mt-3 space-y-2">
                {audios.map((item) =>
                  renderRow(item, audioProgressMap[item.item_slug] || 0, `/listen/${storySlug}/${item.item_slug}`)
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
