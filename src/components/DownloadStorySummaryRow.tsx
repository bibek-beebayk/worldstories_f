import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { DownloadStorySummary } from "@/lib/offlineDb";
import { formatBytes } from "@/lib/utils";
import CoverImage from "@/components/CoverImage";
import { BookOpenText, ChevronRight, FileText, Headphones } from "lucide-react";
import { usePendingProgress } from "@/hooks/usePendingProgress";

interface DownloadStorySummaryRowProps {
  summary: DownloadStorySummary;
  onClick: () => void;
}

export default function DownloadStorySummaryRow({ summary, onClick }: DownloadStorySummaryRowProps) {
  const localProgress = usePendingProgress(summary.story_slug);
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
  if (summary.chapterCount > 0) {
    const localValues = Object.values(localProgress.chapterProgress);
    const localAverage = localValues.length
      ? localValues.reduce((sum, progress) => sum + progress, 0) / localValues.length
      : 0;
    progressLabels.push(`Reading ${Math.round(Math.max(readingProgress?.overall_progress || 0, localAverage) * 100)}%`);
  }
  if (summary.audioCount > 0) {
    const localValues = Object.values(localProgress.audioProgress);
    const localAverage = localValues.length
      ? localValues.reduce((sum, progress) => sum + progress, 0) / localValues.length
      : 0;
    progressLabels.push(`Listening ${Math.round(Math.max(audioProgress?.overall_progress || 0, localAverage) * 100)}%`);
  }
  if (summary.fileType) {
    const mergedFileProgress = Math.max(fileProgress?.progress || 0, localProgress.fileProgress || 0);
    progressLabels.push(`Reading ${Math.round(mergedFileProgress * 100)}%`);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <CoverImage
          src={summary.story_cover_image}
          alt={`${summary.story_title} cover`}
          title={summary.story_title}
          author={summary.story_author}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" />
        <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
          {formatBytes(summary.totalBytes)}
        </span>
      </div>
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <p className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold transition-colors group-hover:text-primary sm:text-base">
            {summary.story_title}
          </p>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
          {summary.chapterCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <BookOpenText className="h-3.5 w-3.5" /> {summary.chapterCount}
            </span>
          )}
          {summary.audioCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Headphones className="h-3.5 w-3.5" /> {summary.audioCount}
            </span>
          )}
          {summary.fileType && (
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {summary.fileType.toUpperCase()}
            </span>
          )}
        </div>
        {progressLabels.length > 0 && (
          <p className="mt-2 line-clamp-1 text-xs font-medium text-primary">{progressLabels.join(" · ")}</p>
        )}
      </div>
    </button>
  );
}
