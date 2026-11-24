import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";

interface DeleteAudiobookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trackCount: number;
  hasLinkedStory: boolean;
  isDeleting?: boolean;
  onConfirm: () => void;
}

export function DeleteAudiobookDialog({
  open,
  onOpenChange,
  title,
  trackCount,
  hasLinkedStory,
  isDeleting = false,
  onConfirm,
}: DeleteAudiobookDialogProps) {
  const [typedTitle, setTypedTitle] = useState("");

  useEffect(() => {
    if (!open) {
      setTypedTitle("");
    }
  }, [open]);

  const matches = typedTitle.trim() === title.trim() && title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete audiobook</DialogTitle>
          <DialogDescription>
            This permanently deletes <strong className="text-foreground">{title}</strong>, its {trackCount}{" "}
            {trackCount === 1 ? "track" : "tracks"}, transcripts, timed cues, and listener progress.
            {hasLinkedStory ? " The linked story itself will not be affected." : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="delete-audiobook-confirm">
            Type <span className="font-semibold text-foreground">{title}</span> to confirm
          </Label>
          <Input
            id="delete-audiobook-confirm"
            value={typedTitle}
            onChange={(e) => setTypedTitle(e.target.value)}
            placeholder={title}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={!matches || isDeleting} onClick={onConfirm}>
            {isDeleting ? "Deleting..." : "Delete audiobook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
