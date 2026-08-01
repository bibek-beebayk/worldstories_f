import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { DownloadStorySummary } from "@/lib/offlineDb";
import { formatBytes } from "@/lib/utils";

interface DownloadStorySummaryRowProps {
  summary: DownloadStorySummary;
  onClick: () => void;
}

export default function DownloadStorySummaryRow({ summary, onClick }: DownloadStorySummaryRowProps) {
  const { data: readingProgress } = useQuery({
    queryKey: ["download-summary-reading-progress", summary.story_slug],
    queryFn: () => storyApi.getReadingProgress(summary.story_slug),
    enabled: summary.chapterCount > 0,
    retry: false,
  });

  const { data: audioProgress } = useQuery({
    queryKey: ["download-summary-audio-progress", summary.story_slug],
    queryFn: () => storyApi.getAudioProgress(summary.story_slug),
    enabled: summary.audioCount > 0,
    retry: false,
  });

  const { data: fileProgress } = useQuery({
    queryKey: ["download-summary-file-progress", summary.story_slug, summary.fileType],
    queryFn: () => storyApi.getFileReadingProgress(summary.story_slug, summary.fileType as "epub" | "pdf"),
    enabled: !!summary.fileType,
    retry: false,
  });

  const progressLabels: string[] = [];
  if (summary.chapterCount > 0 && readingProgress?.overall_progress != null) {
    progressLabels.push(`Reading ${Math.round(readingProgress.overall_progress * 100)}%`);
  }
  if (summary.audioCount > 0 && audioProgress?.overall_progress != null) {
    progressLabels.push(`Listening ${Math.round(audioProgress.overall_progress * 100)}%`);
  }
  if (summary.fileType && fileProgress?.progress != null) {
    progressLabels.push(`${Math.round(fileProgress.progress * 100)}% complete`);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md border p-3 text-left transition hover:bg-muted/50"
    >
      <img src={summary.story_cover_image} alt="" className="h-16 w-12 shrink-0 rounded object-cover" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-medium">{summary.story_title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {summary.chapterCount > 0 && <span>{summary.chapterCount} chapters</span>}
          {summary.audioCount > 0 && <span>{summary.audioCount} audios</span>}
          {summary.fileType && <span>{summary.fileType.toUpperCase()}</span>}
          <span>{formatBytes(summary.totalBytes)}</span>
        </div>
        {progressLabels.length > 0 && (
          <p className="mt-1 text-xs font-medium text-primary">{progressLabels.join(" · ")}</p>
        )}
      </div>
    </button>
  );
}
