import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { storyApi } from "@/api/story";
import {
  useAdminPuzzleCandidates,
  useCreateAdminPuzzle,
  useUpdateAdminPuzzle,
  type AdminPuzzleRow,
  type PuzzleDifficulty,
} from "@/lib/games/nameThatStory";
import { toast } from "@/components/ui/sonner";

interface PuzzleEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRow: AdminPuzzleRow | null;
  defaultDate: string;
}

export function PuzzleEditDrawer({ open, onOpenChange, editingRow, defaultDate }: PuzzleEditDrawerProps) {
  const isEditingExisting = Boolean(editingRow?.id);
  const [date, setDate] = useState(defaultDate);
  const [storyId, setStoryId] = useState<number | null>(null);
  const [storyTitle, setStoryTitle] = useState("");
  const [storySearch, setStorySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lineMode, setLineMode] = useState<"candidate" | "custom">("candidate");
  const [selectedLine, setSelectedLine] = useState("");
  const [customLine, setCustomLine] = useState("");
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>("");
  const [apiError, setApiError] = useState<string | null>(null);

  const createMutation = useCreateAdminPuzzle();
  const updateMutation = useUpdateAdminPuzzle();

  useEffect(() => {
    if (!open) return;
    setDate(editingRow?.date || defaultDate);
    setStoryId(editingRow?.story?.id ?? null);
    setStoryTitle(editingRow?.story?.title ?? "");
    setStorySearch("");
    setDebouncedSearch("");
    setSelectedLine(editingRow?.opening_line ?? "");
    setCustomLine(editingRow?.opening_line ?? "");
    setLineMode(editingRow?.id ? "custom" : "candidate");
    setDifficulty(editingRow?.difficulty ?? "");
    setApiError(null);
  }, [open, editingRow, defaultDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(storySearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [storySearch]);

  const { data: storyResults } = useQuery({
    queryKey: ["admin-nts-story-search", debouncedSearch],
    queryFn: () => storyApi.getAdminStories(1, debouncedSearch),
    enabled: open && debouncedSearch.length >= 2,
  });

  const { data: candidatesData, isLoading: candidatesLoading } = useAdminPuzzleCandidates(storyId);
  const candidates = useMemo(() => candidatesData?.candidates ?? [], [candidatesData]);
  const cluesPreview = candidatesData?.clues_preview ?? [];

  useEffect(() => {
    if (lineMode === "candidate" && candidates.length > 0 && !selectedLine) {
      setSelectedLine(candidates[0].text);
    }
  }, [candidates, lineMode, selectedLine]);

  const handleSave = async () => {
    setApiError(null);
    if (!date) {
      setApiError("Choose a date.");
      return;
    }
    if (!storyId) {
      setApiError("Select a story.");
      return;
    }
    const openingLine = (lineMode === "custom" ? customLine : selectedLine).trim();
    if (!openingLine) {
      setApiError("Select or write an opening line.");
      return;
    }

    const payload = {
      date,
      story_id: storyId,
      opening_line: openingLine,
      difficulty,
      allow_custom: lineMode === "custom",
    };

    try {
      if (isEditingExisting && editingRow?.id) {
        await updateMutation.mutateAsync({ id: editingRow.id, payload });
        toast.success("Puzzle updated.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Puzzle scheduled.");
      }
      onOpenChange(false);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Could not save puzzle.");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEditingExisting ? "Edit puzzle" : "New puzzle"}</SheetTitle>
          <SheetDescription>
            Pick a story and an opening line from its first chapter, or write a custom line.
          </SheetDescription>
        </SheetHeader>

        <div className="my-4 flex-1 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nts-date">Date (UTC)</Label>
              <Input id="nts-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nts-difficulty">Difficulty override</Label>
              <Select
                value={difficulty || "auto"}
                onValueChange={(v) => setDifficulty(v === "auto" ? "" : (v as PuzzleDifficulty))}
              >
                <SelectTrigger id="nts-difficulty" aria-label="Difficulty override">
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Story picker */}
          <div className="space-y-2">
            <Label htmlFor="nts-story-search">Story</Label>
            {storyId && storyTitle && (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="truncate font-medium text-foreground">{storyTitle}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setStoryId(null);
                    setStoryTitle("");
                    setSelectedLine("");
                  }}
                >
                  Change
                </Button>
              </div>
            )}
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="nts-story-search"
                value={storySearch}
                onChange={(e) => setStorySearch(e.target.value)}
                placeholder="Search stories by title..."
                className="pl-8"
              />
            </div>
            {debouncedSearch.length >= 2 && (
              <div className="max-h-40 divide-y overflow-y-auto rounded-md border bg-popover">
                {(storyResults?.results ?? []).length === 0 ? (
                  <p className="p-2.5 text-xs text-muted-foreground">No stories match.</p>
                ) : (
                  (storyResults?.results ?? []).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStoryId(s.id);
                        setStoryTitle(s.title);
                        setStorySearch("");
                        setSelectedLine("");
                        setLineMode("candidate");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted"
                    >
                      <span className="truncate font-medium text-foreground">{s.title}</span>
                      <span className="ml-2 shrink-0 text-muted-foreground">{s.author || "No author"}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Candidate opening lines */}
          {storyId && (
            <div className="space-y-2.5">
              <Label>Opening line</Label>
              {candidatesLoading ? (
                <div className="space-y-2">
                  <div className="h-12 animate-pulse rounded-md bg-muted" />
                  <div className="h-12 animate-pulse rounded-md bg-muted" />
                </div>
              ) : (
                <div className="space-y-2">
                  {candidates.map((cand) => {
                    const checked = lineMode === "candidate" && selectedLine === cand.text;
                    return (
                      <label
                        key={cand.index}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-xs transition-colors ${
                          checked ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="opening-line-choice"
                          checked={checked}
                          onChange={() => {
                            setLineMode("candidate");
                            setSelectedLine(cand.text);
                          }}
                          className="mt-0.5"
                        />
                        <span className="flex-1 leading-relaxed text-foreground">
                          {cand.text}
                          <span className="ml-1.5 text-[11px] text-muted-foreground">({cand.word_count} words)</span>
                        </span>
                      </label>
                    );
                  })}

                  <label
                    className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-xs transition-colors ${
                      lineMode === "custom" ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="opening-line-choice"
                      checked={lineMode === "custom"}
                      onChange={() => setLineMode("custom")}
                      className="mt-0.5"
                    />
                    <span className="font-medium text-foreground">Write my own line</span>
                  </label>

                  {lineMode === "custom" && (
                    <Textarea
                      rows={3}
                      value={customLine}
                      onChange={(e) => setCustomLine(e.target.value)}
                      placeholder="Enter a custom opening line..."
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Read-only clue preview */}
          {cluesPreview.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Clue preview</p>
                <p className="text-[11px] text-muted-foreground">Change genre, country or era on the story itself</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {cluesPreview
                  .filter((c) => c.key !== "cover")
                  .map((c) => (
                    <div key={c.key} className="rounded border bg-background px-2.5 py-1.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
                      <p className="truncate text-xs font-medium text-foreground">{c.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {apiError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            >
              {apiError}
            </p>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
