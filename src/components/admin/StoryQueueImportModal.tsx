import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { storyApi } from "@/api/story";
import { StoryQueueImportDuplicateReason, StoryQueueImportPreview } from "@/api/types";
import { X } from "lucide-react";

const REASON_LABELS: Record<StoryQueueImportDuplicateReason, string> = {
  already_a_story: "Already a story",
  already_in_queue: "Already in the queue",
  duplicate_in_file: "Duplicate within this file",
  missing_title: "Missing title",
};

interface StoryQueueImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

const StoryQueueImportModal = ({ onClose, onImported }: StoryQueueImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<StoryQueueImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const runPreview = async () => {
    if (!file) return;
    try {
      setPreviewing(true);
      const result = await storyApi.previewStoryQueueImport(file);
      setPreview(result);
      setSelected(new Set(result.to_add.map((_, index) => index)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to preview the file.");
    } finally {
      setPreviewing(false);
    }
  };

  const toggleSelected = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const backToFileSelect = () => {
    setPreview(null);
    setFile(null);
    setSelected(new Set());
  };

  const confirmImport = async () => {
    if (!preview) return;
    const records = preview.to_add.filter((_, index) => selected.has(index));
    if (records.length === 0) return;
    try {
      setConfirming(true);
      const result = await storyApi.confirmStoryQueueImport(records);
      toast.success(
        `Added ${result.created_count} book${result.created_count === 1 ? "" : "s"} to the queue` +
          (result.skipped_count ? ` (${result.skipped_count} skipped as duplicates).` : ".")
      );
      onImported();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import the selected books.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Import Book Data</CardTitle>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!preview ? (
            <>
              <p className="text-xs text-muted-foreground">
                Upload a CSV or Excel (.xlsx) file. Expected columns: title, author_name, about, story_type,
                country, language, genres, categories, tags, themes, original_published_year,
                original_published_month, original_published_day, epub_link, pdf_link, cover_image_link. Only
                "title" is required — genres, categories, tags, and themes can each hold multiple values
                separated by commas or semicolons.
              </p>
              <div>
                <Label htmlFor="import-file">File</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx"
                  className="mt-2"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" disabled={!file || previewing} onClick={runPreview}>
                  {previewing ? "Reading file..." : "Preview"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-medium">{preview.to_add_count}</span> to add ·{" "}
                <span className="font-medium">{preview.duplicate_count}</span> duplicates ·{" "}
                <span className="font-medium">{preview.error_count}</span> errors
              </p>

              {preview.to_add.length > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {preview.to_add.map((record, index) => (
                    <label key={index} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selected.has(index)} onChange={() => toggleSelected(index)} />
                      <span className="truncate">
                        {record.title}
                        {record.author_name ? ` — ${record.author_name}` : ""}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {preview.to_add.length === 0 && (
                <p className="text-xs text-muted-foreground">Nothing new to add from this file.</p>
              )}

              {preview.duplicates.length > 0 && (
                <details className="rounded-md border p-2 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">
                    {preview.duplicate_count} duplicate{preview.duplicate_count === 1 ? "" : "s"} (not addable)
                  </summary>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {preview.duplicates.map((duplicate, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {duplicate.title}
                        {duplicate.author_name ? ` — ${duplicate.author_name}` : ""} ·{" "}
                        {REASON_LABELS[duplicate.reason] || duplicate.reason}
                      </p>
                    ))}
                  </div>
                </details>
              )}

              {preview.errors.length > 0 && (
                <details className="rounded-md border border-destructive/30 p-2 text-sm">
                  <summary className="cursor-pointer text-destructive">
                    {preview.error_count} row error{preview.error_count === 1 ? "" : "s"}
                  </summary>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {preview.errors.map((message, index) => (
                      <p key={index} className="text-xs text-destructive">
                        {message}
                      </p>
                    ))}
                  </div>
                </details>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={backToFileSelect}>
                  Back
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" disabled={selected.size === 0 || confirming} onClick={confirmImport}>
                  {confirming ? "Adding..." : `Add ${selected.size} Book${selected.size === 1 ? "" : "s"}`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StoryQueueImportModal;
