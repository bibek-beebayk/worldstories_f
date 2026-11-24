import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileAudio, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { storyApi } from "@/api/story";
import { useAdminAudiobookSeries, useCreateAdminAudiobook } from "@/hooks/useAdminAudiobooks";
import { StoryPicker } from "@/components/admin/audiobooks/StoryPicker";
import { SeriesMultiSelect, type SeriesItemDraft } from "@/components/admin/audiobooks/SeriesMultiSelect";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import type { AdminStorySearchItem } from "@/api/types";

type CreateMode = "standalone" | "linked";

export default function AdminAudiobookCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const trackInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<CreateMode>("standalone");
  const [selectedStory, setSelectedStory] = useState<AdminStorySearchItem | null>(null);
  const [title, setTitle] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [language, setLanguage] = useState("en");
  const [about, setAbout] = useState("");
  const [narrator, setNarrator] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [seriesItems, setSeriesItems] = useState<SeriesItemDraft[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [trackFiles, setTrackFiles] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: authors = [] } = useQuery({
    queryKey: ["admin-authors"],
    queryFn: () => storyApi.getAdminAuthors(),
  });
  const { data: genres = [] } = useQuery({
    queryKey: ["admin-genres"],
    queryFn: () => storyApi.getAdminGenres(),
  });
  const { data: seriesList = [] } = useAdminAudiobookSeries();
  const createMutation = useCreateAdminAudiobook();

  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const addTracks = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const files = Array.from(incoming).filter((f) => f.name.toLowerCase().endsWith(".mp3"));
    if (files.length < incoming.length) {
      toast({
        title: "Some files were skipped",
        description: "Only .mp3 audio files are supported.",
        variant: "destructive",
      });
    }
    if (files.length > 0) {
      setTrackFiles((prev) => [...prev, ...files]);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.tracks;
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (mode === "standalone") {
      if (!title.trim()) errors.title = "Title is required.";
      if (!authorId) errors.author = "Author is required for standalone audiobooks.";
      if (!language.trim()) errors.language = "Language is required for standalone audiobooks.";
      if (!about.trim()) errors.about = "About is required for standalone audiobooks.";
    } else if (!selectedStory) {
      errors.story = "Select a story to link this audiobook to.";
    }
    if (trackFiles.length === 0) {
      errors.tracks = "Add at least one .mp3 track file.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (mode === "linked" && selectedStory) {
        formData.append("story", String(selectedStory.id));
        if (title.trim()) formData.append("title", title.trim());
      } else {
        formData.append("title", title.trim());
        formData.append("author", authorId);
        formData.append("language", language);
        formData.append("about", about.trim());
      }
      if (displayTitle.trim()) formData.append("display_title", displayTitle.trim());
      if (narrator.trim()) formData.append("narrator", narrator.trim());
      if (seriesItems.length > 0) {
        formData.append("series_items", JSON.stringify(seriesItems));
      }
      selectedGenres.forEach((g) => formData.append("genres", String(g)));
      if (coverFile) formData.append("cover_image_file", coverFile);

      const created = await createMutation.mutateAsync(formData);

      try {
        const uploadRes = await storyApi.uploadAdminAudiobookTracks(created.id, trackFiles);
        if (uploadRes.errors.length > 0) {
          toast({
            title: "Audiobook created with track warnings",
            description: `${uploadRes.created.length} uploaded, ${uploadRes.errors.length} failed.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Audiobook created",
            description: `Uploaded ${uploadRes.created.length} track(s).`,
          });
        }
      } catch (uploadErr) {
        toast({
          title: "Audiobook created, but track upload failed",
          description: uploadErr instanceof Error ? uploadErr.message : "You can upload tracks on the edit screen.",
          variant: "destructive",
        });
      }

      navigate(`/admin/audiobooks/${created.id}`);
    } catch (err) {
      toast({
        title: "Could not create audiobook",
        description: err instanceof Error ? err.message : "Please check the form fields.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto pr-1 pb-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Back to audiobooks">
            <Link to="/admin/audiobooks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">New audiobook</h1>
            <p className="text-sm text-muted-foreground">
              Create a standalone audiobook or link one to an existing story.
            </p>
          </div>
        </div>

        {/* Mode segmented toggle */}
        <div
          role="tablist"
          aria-label="Audiobook type"
          className="inline-grid grid-cols-2 rounded-lg border bg-muted p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "standalone"}
            onClick={() => {
              setMode("standalone");
              setFieldErrors({});
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "standalone"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Standalone
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "linked"}
            onClick={() => {
              setMode("linked");
              setFieldErrors({});
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === "linked"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Linked to a story
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>
                {mode === "standalone"
                  ? "Standalone audiobooks require title, author, language, and about."
                  : "Linked audiobooks inherit metadata from their story unless you override it."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "linked" && (
                <div className="space-y-1.5">
                  <Label>Story *</Label>
                  <StoryPicker
                    value={selectedStory}
                    onSelect={(story) => {
                      setSelectedStory(story);
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.story;
                        return next;
                      });
                    }}
                    onClear={() => setSelectedStory(null)}
                  />
                  {fieldErrors.story && <p className="text-xs text-destructive">{fieldErrors.story}</p>}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ab-title">Title {mode === "standalone" ? "*" : "(optional override)"}</Label>
                  <Input
                    id="ab-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={mode === "linked" ? "Leave empty to use the story's title" : "Enter audiobook title"}
                  />
                  {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ab-display-title">Display title (optional)</Label>
                  <Input
                    id="ab-display-title"
                    value={displayTitle}
                    onChange={(e) => setDisplayTitle(e.target.value)}
                    placeholder="Optional public display title"
                  />
                </div>
              </div>

              {mode === "standalone" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ab-author">Author *</Label>
                    <Select value={authorId} onValueChange={setAuthorId}>
                      <SelectTrigger id="ab-author" aria-label="Author">
                        <SelectValue placeholder="Select an author" />
                      </SelectTrigger>
                      <SelectContent>
                        {authors.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.author && <p className="text-xs text-destructive">{fieldErrors.author}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ab-language">Language *</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="ab-language" aria-label="Language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.language && <p className="text-xs text-destructive">{fieldErrors.language}</p>}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ab-narrator">Narrator (optional)</Label>
                  <Input
                    id="ab-narrator"
                    value={narrator}
                    onChange={(e) => setNarrator(e.target.value)}
                    placeholder="Narrator name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Series (optional)</Label>
                  <SeriesMultiSelect seriesList={seriesList} value={seriesItems} onChange={setSeriesItems} />
                </div>
              </div>

              {mode === "standalone" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="ab-about">About *</Label>
                    <Textarea
                      id="ab-about"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      rows={4}
                      placeholder="Describe this audiobook for listeners..."
                    />
                    {fieldErrors.about && <p className="text-xs text-destructive">{fieldErrors.about}</p>}
                  </div>

                  {genres.length > 0 && (
                    <div className="space-y-1.5">
                      <Label>Genres (optional)</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {genres.map((g) => {
                          const active = selectedGenres.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => toggleGenre(g.id)}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-foreground hover:bg-accent"
                              }`}
                            >
                              {g.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="ab-cover">Cover image (optional)</Label>
                <Input
                  id="ab-cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tracks upload card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audio tracks *</CardTitle>
              <CardDescription>
                Upload one or more .mp3 files. Track titles are inferred from filenames and can be reordered or renamed
                afterwards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addTracks(e.dataTransfer.files);
                }}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop .mp3 files here, or browse from your computer
                </p>
                <input
                  ref={trackInputRef}
                  type="file"
                  accept=".mp3,audio/mpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addTracks(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => trackInputRef.current?.click()}>
                  Choose audio files
                </Button>
              </div>

              {fieldErrors.tracks && <p className="text-xs text-destructive">{fieldErrors.tracks}</p>}

              {trackFiles.length > 0 && (
                <ul className="space-y-1.5">
                  {trackFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-5 text-xs tabular-nums text-muted-foreground">{idx + 1}.</span>
                        <FileAudio className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium text-foreground">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setTrackFiles((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button asChild type="button" variant="outline" disabled={isSubmitting}>
              <Link to="/admin/audiobooks">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating audiobook..." : "Create audiobook"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
