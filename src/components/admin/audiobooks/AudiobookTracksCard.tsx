import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  adminAudiobookKeys,
  useDeleteAudiobookTrack,
  useMoveAudiobookTrack,
  useReorderAudiobookTracks,
  useRereadAudiobookTrackDuration,
  useUpdateAudiobookTrack,
  useUploadAudiobookTracks,
} from "@/hooks/useAdminAudiobooks";
import { TrackRow } from "@/components/admin/audiobooks/TrackRow";
import { MoveTrackDialog } from "@/components/admin/audiobooks/MoveTrackDialog";
import { AudioTranscriptImportPanel } from "@/components/admin/AudioTranscriptImportPanel";
import { formatLong } from "@/lib/formatDuration";
import type { AdminAudiobookDetail, AdminAudiobookTrack } from "@/api/types";

interface AudiobookTracksCardProps {
  audiobook: AdminAudiobookDetail;
}

interface UploadRow {
  filename: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

const INITIAL_VISIBLE_TRACKS = 6;

export function AudiobookTracksCard({ audiobook }: AudiobookTracksCardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showAll, setShowAll] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([]);

  const [transcriptTrack, setTranscriptTrack] = useState<AdminAudiobookTrack | null>(null);
  const [moveTrack, setMoveTrack] = useState<AdminAudiobookTrack | null>(null);
  const [deleteTrack, setDeleteTrack] = useState<AdminAudiobookTrack | null>(null);

  const uploadMutation = useUploadAudiobookTracks(audiobook.id);
  const reorderMutation = useReorderAudiobookTracks(audiobook.id);
  const updateTrackMutation = useUpdateAudiobookTrack(audiobook.id);
  const deleteTrackMutation = useDeleteAudiobookTrack(audiobook.id);
  const rereadMutation = useRereadAudiobookTrackDuration(audiobook.id);
  const moveMutation = useMoveAudiobookTrack(audiobook.id);

  const tracks = audiobook.tracks ?? [];
  const visibleTracks = showAll ? tracks : tracks.slice(0, INITIAL_VISIBLE_TRACKS);
  const hiddenCount = Math.max(0, tracks.length - INITIAL_VISIBLE_TRACKS);
  const totalDurationLabel = formatLong(audiobook.total_duration_seconds);

  const commitReorder = async (nextTracks: AdminAudiobookTrack[]) => {
    try {
      await reorderMutation.mutateAsync(nextTracks.map((t) => t.id));
    } catch (err) {
      toast({
        title: "Could not reorder tracks",
        description: err instanceof Error ? err.message : "Track order was restored to its previous state.",
        variant: "destructive",
      });
    }
  };

  const handleDropAt = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...tracks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setDragOverIndex(null);
    void commitReorder(next);
  };

  const handleStepMove = (index: number, delta: -1 | 1) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= tracks.length) return;
    const next = [...tracks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    void commitReorder(next);
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploadRows(files.map((f) => ({ filename: f.name, status: "uploading" })));

    try {
      const res = await uploadMutation.mutateAsync(files);
      const errorByFile = new Map(res.errors.map((e) => [e.filename, e.error]));
      setUploadRows(
        files.map((f) =>
          errorByFile.has(f.name)
            ? { filename: f.name, status: "error", error: errorByFile.get(f.name) }
            : { filename: f.name, status: "done" },
        ),
      );
      if (res.errors.length > 0) {
        toast({
          title: "Some tracks failed to upload",
          description: `${res.created.length} uploaded, ${res.errors.length} skipped.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Tracks uploaded",
          description: `Added ${res.created.length} track(s).`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadRows(files.map((f) => ({ filename: f.name, status: "error", error: msg })));
      toast({ title: "Track upload failed", description: msg, variant: "destructive" });
    }
  };

  const handleRename = async (trackId: number, title: string) => {
    try {
      await updateTrackMutation.mutateAsync({ trackId, payload: { title } });
      toast({ title: "Track renamed" });
    } catch (err) {
      toast({
        title: "Could not rename track",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReplaceFile = async (trackId: number, file: File) => {
    const formData = new FormData();
    formData.append("audio_file", file);
    try {
      await updateTrackMutation.mutateAsync({ trackId, payload: formData });
      toast({ title: "Audio file replaced" });
    } catch (err) {
      toast({
        title: "Could not replace audio file",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReread = async (trackId: number) => {
    try {
      await rereadMutation.mutateAsync(trackId);
      toast({ title: "Track length updated" });
    } catch (err) {
      toast({
        title: "Could not re-read length",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMove = async (targetAudiobookId: number) => {
    if (!moveTrack) return;
    try {
      await moveMutation.mutateAsync({ trackId: moveTrack.id, targetAudiobookId });
      toast({ title: "Track moved" });
      setMoveTrack(null);
    } catch (err) {
      toast({
        title: "Could not move track",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTrack) return;
    try {
      await deleteTrackMutation.mutateAsync(deleteTrack.id);
      toast({ title: "Track deleted" });
      setDeleteTrack(null);
    } catch (err) {
      toast({
        title: "Could not delete track",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const isBusy =
    reorderMutation.isPending ||
    updateTrackMutation.isPending ||
    deleteTrackMutation.isPending ||
    rereadMutation.isPending ||
    moveMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Tracks</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
            {totalDurationLabel ? `, ${totalDurationLabel}` : ""}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,audio/mpeg"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleUploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Add tracks
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {tracks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tracks yet. Drop .mp3 files below to add audio.
          </p>
        ) : (
          <div className="space-y-2">
            {visibleTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                total={tracks.length}
                isDragging={dragIndex === idx}
                isDragOver={dragOverIndex === idx && dragIndex !== idx}
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIndex(idx);
                }}
                onDrop={() => handleDropAt(idx)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                onMoveUp={() => handleStepMove(idx, -1)}
                onMoveDown={() => handleStepMove(idx, 1)}
                onRename={(nextTitle) => void handleRename(track.id, nextTitle)}
                onReplaceFile={(file) => void handleReplaceFile(track.id, file)}
                onRereadDuration={() => void handleReread(track.id)}
                onOpenTranscript={() => setTranscriptTrack(track)}
                onOpenMove={() => setMoveTrack(track)}
                onDelete={() => setDeleteTrack(track)}
                isBusy={isBusy}
              />
            ))}

            {hiddenCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? "Show fewer tracks" : `${hiddenCount} more tracks, Show all`}
              </Button>
            )}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              void handleUploadFiles(e.dataTransfer.files);
            }
          }}
          className="rounded-lg border-2 border-dashed border-border px-4 py-5 text-center"
        >
          <p className="text-xs text-muted-foreground">Drop .mp3 files here to append tracks to this audiobook</p>
        </div>

        {/* Per-file upload progress rows */}
        {uploadRows.length > 0 && (
          <div className="space-y-1.5 rounded-md border bg-muted/20 p-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Recent upload</span>
              <button type="button" className="underline hover:text-foreground" onClick={() => setUploadRows([])}>
                Clear
              </button>
            </div>
            {uploadRows.map((row, idx) => (
              <div key={`${row.filename}-${idx}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-foreground">{row.filename}</span>
                {row.status === "uploading" ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading
                  </span>
                ) : row.status === "done" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Uploaded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <XCircle className="h-3.5 w-3.5" />
                    {row.error || "Failed"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Transcript & read-along cues dialog */}
      <Dialog
        open={Boolean(transcriptTrack)}
        onOpenChange={(open) => {
          if (!open) setTranscriptTrack(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transcript & read-along cues</DialogTitle>
            <DialogDescription>{transcriptTrack?.title}</DialogDescription>
          </DialogHeader>
          {transcriptTrack && (
            <AudioTranscriptImportPanel
              audioId={transcriptTrack.id}
              storyId={audiobook.story ?? 0}
              storySlug={audiobook.story_detail?.slug ?? audiobook.slug}
              audioSlug={transcriptTrack.slug}
              transcriptState={transcriptTrack.transcript_state}
              cueCount={transcriptTrack.cue_count}
              onTranscriptChange={() => {
                qc.invalidateQueries({ queryKey: adminAudiobookKeys.detail(audiobook.id) });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Move track dialog */}
      <MoveTrackDialog
        open={Boolean(moveTrack)}
        onOpenChange={(open) => {
          if (!open) setMoveTrack(null);
        }}
        currentAudiobookId={audiobook.id}
        trackTitle={moveTrack?.title ?? ""}
        isMoving={moveMutation.isPending}
        onConfirm={(targetId) => void handleMove(targetId)}
      />

      {/* Delete track confirm dialog */}
      <Dialog
        open={Boolean(deleteTrack)}
        onOpenChange={(open) => {
          if (!open) setDeleteTrack(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete track</DialogTitle>
            <DialogDescription>
              Delete <strong className="text-foreground">{deleteTrack?.title}</strong>? Its transcript, timed cues, and
              listener progress for this track will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTrack(null)}
              disabled={deleteTrackMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteTrackMutation.isPending}
            >
              {deleteTrackMutation.isPending ? "Deleting..." : "Delete track"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
