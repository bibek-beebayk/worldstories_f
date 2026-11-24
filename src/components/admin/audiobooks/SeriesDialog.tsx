import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { AdminAudiobookSeries } from "@/api/types";

interface SeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSeries?: AdminAudiobookSeries | null;
  isSaving?: boolean;
  onSubmit: (values: { title: string; slug: string; description: string }) => void;
}

export function SeriesDialog({
  open,
  onOpenChange,
  editingSeries = null,
  isSaving = false,
  onSubmit,
}: SeriesDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(editingSeries?.title ?? "");
      setSlug(editingSeries?.slug ?? "");
      setDescription(editingSeries?.description ?? "");
      setError("");
    }
  }, [open, editingSeries]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Series title is required.");
      return;
    }
    setError("");
    onSubmit({ title: title.trim(), slug: slug.trim(), description: description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingSeries ? "Edit series" : "New series"}</DialogTitle>
            <DialogDescription>Group related audiobooks together in an ordered series.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="series-title">Title</Label>
              <Input
                id="series-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sherlock Holmes Collection"
                required
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="series-slug">Slug (optional)</Label>
              <Input
                id="series-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Auto-generated from title if left blank"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="series-description">Description</Label>
              <Textarea
                id="series-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Short description of the series"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : editingSeries ? "Save series" : "Create series"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
