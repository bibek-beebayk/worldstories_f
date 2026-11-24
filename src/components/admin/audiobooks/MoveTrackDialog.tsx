import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAudiobooks } from "@/hooks/useAdminAudiobooks";

interface MoveTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAudiobookId: number;
  trackTitle: string;
  isMoving?: boolean;
  onConfirm: (targetAudiobookId: number) => void;
}

export function MoveTrackDialog({
  open,
  onOpenChange,
  currentAudiobookId,
  trackTitle,
  isMoving = false,
  onConfirm,
}: MoveTrackDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data, isLoading } = useAdminAudiobooks({ q: search, page: 1 });
  const options = (data?.results ?? []).filter((ab) => ab.id !== currentAudiobookId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move track to another audiobook</DialogTitle>
          <DialogDescription>
            Move <strong className="text-foreground">{trackTitle}</strong> (with its transcript and timed cues) to the
            end of another audiobook. Listener progress is preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destination audiobook..."
            aria-label="Search destination audiobook"
          />

          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1.5">
            {isLoading ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">Loading audiobooks...</p>
            ) : options.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">No other audiobooks match your search.</p>
            ) : (
              options.map((ab) => {
                const isSelected = selectedId === ab.id;
                return (
                  <button
                    key={ab.id}
                    type="button"
                    onClick={() => setSelectedId(ab.id)}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-sm transition-colors ${
                      isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <span className="truncate font-medium">{ab.effective_title || ab.title}</span>
                    <span
                      className={`ml-2 shrink-0 text-xs ${
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {ab.track_count} {ab.track_count === 1 ? "track" : "tracks"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedId || isMoving}
            onClick={() => {
              if (selectedId) onConfirm(selectedId);
            }}
          >
            {isMoving ? "Moving..." : "Move track"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
