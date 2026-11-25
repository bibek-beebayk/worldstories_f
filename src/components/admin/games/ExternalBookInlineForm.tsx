import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { storyApi } from "@/api/story";
import { useCreateAdminPuzzleBook, type AdminPuzzleBook, type PuzzleBookLength } from "@/lib/games/nameThatStory";

interface ExternalBookInlineFormProps {
  onCreated: (book: AdminPuzzleBook) => void;
  onCancel: () => void;
}

export function ExternalBookInlineForm({ onCreated, onCancel }: ExternalBookInlineFormProps) {
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");
  const [lengthLabel, setLengthLabel] = useState<PuzzleBookLength>("Novel");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: genres = [] } = useQuery({
    queryKey: ["admin-genres"],
    queryFn: () => storyApi.getAdminGenres(),
  });

  const createBookMutation = useCreateAdminPuzzleBook();

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim() || !authorName.trim()) {
      setError("Title and author name are required.");
      return;
    }
    if (selectedGenres.length === 0) {
      setError("Select at least one genre.");
      return;
    }

    let payload: FormData | Record<string, unknown>;
    if (coverFile) {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("author_name", authorName.trim());
      selectedGenres.forEach((gid) => fd.append("genres", String(gid)));
      if (country.trim()) fd.append("country", country.trim().toUpperCase());
      if (year.trim()) fd.append("original_published_year", year.trim());
      fd.append("length_label", lengthLabel);
      fd.append("cover_image_file", coverFile);
      payload = fd;
    } else {
      payload = {
        title: title.trim(),
        author_name: authorName.trim(),
        genres: selectedGenres,
        country: country.trim().toUpperCase(),
        original_published_year: year.trim() ? Number(year.trim()) : null,
        length_label: lengthLabel,
        cover_image: coverUrl.trim() || null,
      };
    }

    try {
      const created = await createBookMutation.mutateAsync(payload);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create external book.");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
      <p className="text-xs font-semibold text-foreground">Create external book</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ext-book-title" className="text-xs">
            Title *
          </Label>
          <Input
            id="ext-book-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dune"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ext-book-author" className="text-xs">
            Author *
          </Label>
          <Input
            id="ext-book-author"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="e.g. Frank Herbert"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Genres * (select at least one)</Label>
        <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto rounded border bg-background p-2">
          {genres.map((g) => {
            const active = selectedGenres.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGenre(g.id)}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="ext-book-country" className="text-xs">
            Country (2-letter)
          </Label>
          <Input
            id="ext-book-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={2}
            placeholder="US"
            className="h-8 text-xs uppercase"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ext-book-year" className="text-xs">
            Published year
          </Label>
          <Input
            id="ext-book-year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="1965"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ext-book-length" className="text-xs">
            Length
          </Label>
          <Select value={lengthLabel} onValueChange={(v) => setLengthLabel(v as PuzzleBookLength)}>
            <SelectTrigger id="ext-book-length" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Short story">Short story</SelectItem>
              <SelectItem value="Novella">Novella</SelectItem>
              <SelectItem value="Novel">Novel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ext-book-cover-url" className="text-xs">
            Cover URL (optional)
          </Label>
          <Input
            id="ext-book-cover-url"
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://..."
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ext-book-cover-file" className="text-xs">
            Or upload cover
          </Label>
          <Input
            id="ext-book-cover-file"
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={createBookMutation.isPending} onClick={() => void handleSubmit()}>
          {createBookMutation.isPending ? "Creating..." : "Create & select"}
        </Button>
      </div>
    </div>
  );
}
