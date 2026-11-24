import { useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  FileAudio,
  FileText,
  GripVertical,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  ArrowRightLeft,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatClock } from "@/lib/formatDuration";
import type { AdminAudiobookTrack } from "@/api/types";

interface TrackRowProps {
  track: AdminAudiobookTrack;
  index: number;
  total: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (newTitle: string) => void;
  onReplaceFile: (file: File) => void;
  onRereadDuration: () => void;
  onOpenTranscript: () => void;
  onOpenMove: () => void;
  onDelete: () => void;
  isBusy?: boolean;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TrackRow({
  track,
  index,
  total,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onRename,
  onReplaceFile,
  onRereadDuration,
  onOpenTranscript,
  onOpenMove,
  onDelete,
  isBusy = false,
}: TrackRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(track.title);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const commitRename = () => {
    const cleaned = draftTitle.trim();
    if (!cleaned || cleaned === track.title) {
      setDraftTitle(track.title);
      setEditing(false);
      return;
    }
    onRename(cleaned);
    setEditing(false);
  };

  const hasDuration =
    typeof track.duration_seconds === "number" && Number.isFinite(track.duration_seconds) && track.duration_seconds > 0;

  const transcriptBadge =
    track.transcript_state === "synced"
      ? {
          label: "Synced",
          classes:
            "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
        }
      : track.transcript_state === "plain"
        ? {
            label: "Text only",
            classes:
              "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800",
          }
        : {
            label: "No transcript",
            classes:
              "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          };

  return (
    <div
      draggable={!editing && !isBusy}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2 transition-colors sm:flex-nowrap ${
        isDragging
          ? "opacity-50"
          : isDragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:bg-muted/30"
      }`}
    >
      {/* Drag handle + order */}
      <div className="flex items-center gap-1">
        <span
          className="cursor-grab text-muted-foreground hover:text-foreground"
          title="Drag to reorder"
          aria-hidden="true"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <span className="w-6 text-center text-xs font-medium tabular-nums text-muted-foreground">{track.order}</span>
      </div>

      {/* Title + file info */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === "Escape") {
                  setDraftTitle(track.title);
                  setEditing(false);
                }
              }}
              className="h-8 text-sm"
              autoFocus
              aria-label="Track title"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={commitRename}
              aria-label="Save track title"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setDraftTitle(track.title);
                setEditing(false);
              }}
              aria-label="Cancel rename"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                setDraftTitle(track.title);
                setEditing(true);
              }}
              className="max-w-full truncate text-left text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Click to rename"
            >
              {track.title}
            </button>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {track.audio_file_name && (
                <span className="inline-flex max-w-[220px] items-center gap-1 truncate">
                  <FileAudio className="h-3 w-3 shrink-0" />
                  <span className="truncate">{track.audio_file_name}</span>
                </span>
              )}
              {track.file_size_bytes > 0 && (
                <span className="tabular-nums">{formatFileSize(track.file_size_bytes)}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="shrink-0 text-right">
        {hasDuration ? (
          <span className="text-xs font-medium tabular-nums text-foreground">
            {formatClock(track.duration_seconds)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
            <AlertTriangle className="h-3 w-3" />
            Missing
          </span>
        )}
      </div>

      {/* Transcript badge */}
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${transcriptBadge.classes}`}>
        {transcriptBadge.label}
      </span>

      {/* Keyboard reorder buttons */}
      <div className="flex items-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={index === 0 || isBusy}
          onClick={onMoveUp}
          aria-label={`Move ${track.title} up`}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={index === total - 1 || isBusy}
          onClick={onMoveDown}
          aria-label={`Move ${track.title} down`}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Hidden file input for Replace audio file */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".mp3,audio/mpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onReplaceFile(file);
          e.target.value = "";
        }}
      />

      {/* Row menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Actions for ${track.title}`}
            disabled={isBusy}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setDraftTitle(track.title);
              setEditing(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => replaceInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Replace audio file
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRereadDuration}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-read length
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onOpenTranscript}>
            <FileText className="mr-2 h-4 w-4" />
            {track.has_cues ? "Edit read-along cues" : "Import transcript"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenMove}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Move to another audiobook
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete track
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
