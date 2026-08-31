import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { storyApi } from "@/api/story";
import type { AudioTranscriptImportResult, AudioTranscriptState } from "@/api/types";

type EditableCue = { start_ms: number; end_ms: number; text: string };

interface AudioTranscriptImportPanelProps {
  audioId: number;
  storyId: number;
  storySlug: string;
  audioSlug: string;
  transcriptState: AudioTranscriptState;
  cueCount: number;
  onTranscriptChange: (result: AudioTranscriptImportResult) => void;
}

const STATE_LABEL: Record<AudioTranscriptState, string> = {
  empty: "Empty",
  unsynchronized: "Unsynchronized",
  synchronized: "Synchronized",
};

const STATE_CLASS: Record<AudioTranscriptState, string> = {
  empty: "bg-muted text-muted-foreground",
  unsynchronized: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  synchronized: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

const formatMs = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
};

export function AudioTranscriptImportPanel({
  audioId,
  storyId,
  storySlug,
  audioSlug,
  transcriptState,
  cueCount,
  onTranscriptChange,
}: AudioTranscriptImportPanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<AudioTranscriptState>(transcriptState);
  const [localCueCount, setLocalCueCount] = useState(cueCount);
  const [busy, setBusy] = useState<"import" | "clear" | "save" | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableCues, setEditableCues] = useState<EditableCue[]>([]);

  const { data: cuesData, isLoading: cuesLoading } = useQuery({
    queryKey: ["admin-audio-cues", audioId],
    queryFn: () => storyApi.getAudioTranscriptCues(audioId),
    enabled: audioId > 0,
  });

  const refresh = (result: AudioTranscriptImportResult) => {
    setState(result.transcript_state);
    setLocalCueCount(result.cue_count);
    queryClient.invalidateQueries({ queryKey: ["admin-audios", storyId] });
    queryClient.invalidateQueries({ queryKey: ["admin-audio-cues", audioId] });
    onTranscriptChange(result);
  };

  useEffect(() => {
    setState(transcriptState);
    setLocalCueCount(cueCount);
  }, [cueCount, transcriptState]);

  useEffect(() => {
    if (!isEditing && cuesData) {
      setEditableCues(
        cuesData.cues.map(({ start_ms, end_ms, text }) => ({ start_ms, end_ms, text }))
      );
    }
  }, [cuesData, isEditing]);

  const handleFile = async (file: File) => {
    if (localCueCount > 0 && !window.confirm("Replace the existing timed cues with this file?")) {
      return;
    }
    try {
      setBusy("import");
      const formData = new FormData();
      formData.append("file", file);
      refresh(await storyApi.importAudioTranscript(audioId, formData));
      toast.success("Transcript imported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import transcript.");
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Remove this transcript and all timed cues? This cannot be undone.")) return;
    try {
      setBusy("clear");
      refresh(await storyApi.clearAudioTranscript(audioId));
      toast.success("Transcript cleared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear transcript.");
    } finally {
      setBusy(null);
    }
  };

  const beginEditing = () => {
    setEditableCues(
      cuesData?.cues.map(({ start_ms, end_ms, text }) => ({ start_ms, end_ms, text })) ?? []
    );
    setIsEditing(true);
  };

  const updateCue = (index: number, field: keyof EditableCue, value: string) => {
    setEditableCues((current) =>
      current.map((cue, cueIndex) =>
        cueIndex === index
          ? { ...cue, [field]: field === "text" ? value : Number(value) }
          : cue
      )
    );
  };

  const handleSaveCues = async () => {
    if (localCueCount > 0 && !window.confirm("Replace the existing timed cues with these edits?")) {
      return;
    }
    try {
      setBusy("save");
      const result = await storyApi.replaceAudioTranscriptCues(
        audioId,
        editableCues.map((cue, index) => ({ ...cue, order: index + 1 }))
      );
      refresh(result);
      setIsEditing(false);
      toast.success(result.cue_count > 0 ? "Timed cues saved." : "Timed cues removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save timed cues.");
    } finally {
      setBusy(null);
    }
  };

  const cues = cuesData?.cues ?? [];

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          Timed transcript
          <Badge className={STATE_CLASS[state]}>{STATE_LABEL[state]}</Badge>
        </div>
        {state !== "empty" && (
          <a
            href={`/read-along/${storySlug}/${audioSlug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            Preview in Read Along
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".vtt,.srt,.txt"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => fileInputRef.current?.click()}
        >
          {busy === "import" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Import .vtt / .srt / .txt
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={busy !== null || state === "empty"}
          onClick={handleClear}
        >
          {busy === "clear" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Clear transcript &amp; cues
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        VTT/SRT files replace the timed cues (and seed the transcript text only when it is empty).
        Plain text imports as an unsynchronized transcript.
      </p>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {localCueCount > 0 ? `${localCueCount} timed cue${localCueCount === 1 ? "" : "s"}` : "No timed cues"}
          </p>
          {!cuesLoading && !isEditing && state !== "empty" && (
            <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={beginEditing}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit cues
            </Button>
          )}
        </div>
        {cuesLoading ? (
          <p className="text-xs text-muted-foreground">Loading cues…</p>
        ) : isEditing ? (
          <div className="space-y-3">
            <div className="max-h-80 space-y-2 overflow-y-auto rounded border bg-muted/30 p-2">
              {editableCues.length === 0 && (
                <p className="text-xs text-muted-foreground">Add the first timed cue below.</p>
              )}
              {editableCues.map((cue, index) => (
                <div key={index} className="grid gap-2 rounded border bg-background p-2 sm:grid-cols-[8rem_8rem_1fr_auto]">
                  <label className="text-[11px] text-muted-foreground">
                    Start (ms)
                    <input
                      type="number"
                      min={0}
                      value={cue.start_ms}
                      onChange={(event) => updateCue(index, "start_ms", event.target.value)}
                      className="mt-1 h-8 w-full rounded border bg-background px-2 text-xs text-foreground"
                    />
                  </label>
                  <label className="text-[11px] text-muted-foreground">
                    End (ms)
                    <input
                      type="number"
                      min={0}
                      value={cue.end_ms}
                      onChange={(event) => updateCue(index, "end_ms", event.target.value)}
                      className="mt-1 h-8 w-full rounded border bg-background px-2 text-xs text-foreground"
                    />
                  </label>
                  <label className="text-[11px] text-muted-foreground">
                    Cue text
                    <input
                      type="text"
                      value={cue.text}
                      onChange={(event) => updateCue(index, "text", event.target.value)}
                      className="mt-1 h-8 w-full rounded border bg-background px-2 text-xs text-foreground"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    aria-label={`Remove cue ${index + 1}`}
                    onClick={() => setEditableCues((current) => current.filter((_, cueIndex) => cueIndex !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => setEditableCues((current) => [...current, { start_ms: current.at(-1)?.end_ms ?? 0, end_ms: (current.at(-1)?.end_ms ?? 0) + 1000, text: "" }])}
              >
                <Plus className="mr-2 h-3.5 w-3.5" /> Add cue
              </Button>
              <Button type="button" size="sm" disabled={busy !== null} onClick={handleSaveCues}>
                {busy === "save" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                Save cues
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : cues.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Import a .vtt or .srt file to synchronize the transcript with the audio.
          </p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded border bg-muted/30 p-2">
            {cues.map((cue) => (
              <div key={cue.id} className="flex gap-2 text-xs">
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatMs(cue.start_ms)} → {formatMs(cue.end_ms)}
                </span>
                <span className="min-w-0">{cue.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
