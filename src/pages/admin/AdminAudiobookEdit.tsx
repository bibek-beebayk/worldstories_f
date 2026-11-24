import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, ExternalLink, ImagePlus, Link2Off, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { storyApi } from "@/api/story";
import {
  useAdminAudiobook,
  useAdminAudiobookSeries,
  useCreateAdminAudiobookSeries,
  useDeleteAdminAudiobook,
  useUpdateAdminAudiobook,
} from "@/hooks/useAdminAudiobooks";
import { StatusChip } from "@/components/admin/audiobooks/StatusChip";
import { StoryPicker } from "@/components/admin/audiobooks/StoryPicker";
import { DeleteAudiobookDialog } from "@/components/admin/audiobooks/DeleteAudiobookDialog";
import { SeriesDialog } from "@/components/admin/audiobooks/SeriesDialog";
import { SeriesMultiSelect, type SeriesItemDraft } from "@/components/admin/audiobooks/SeriesMultiSelect";
import { AudiobookTracksCard } from "@/components/admin/audiobooks/AudiobookTracksCard";
import { AudiobookCard } from "@/components/audiobooks/AudiobookCard";
import { LANGUAGE_OPTIONS, getLanguageLabel } from "@/lib/languages";
import { isoToLocalInput, localInputToIso } from "@/lib/datetimeLocal";
import { audiobookUrl } from "@/lib/urls";
import type { AdminAudiobookDetail, Story } from "@/api/types";

interface FormState {
  title: string;
  display_title: string;
  slug: string;
  author: string;
  narrator: string;
  language: string;
  about: string;
  genres: number[];
  story: number | null;
  series_items: SeriesItemDraft[];
  is_published: boolean;
  publish_at: string;
  remove_cover: boolean;
}

function buildInitialForm(ab: AdminAudiobookDetail): FormState {
  return {
    title: ab.title ?? "",
    display_title: ab.display_title ?? "",
    slug: ab.slug ?? "",
    author: ab.author ? String(ab.author) : "",
    narrator: ab.narrator ?? "",
    language: ab.language ?? "",
    about: ab.about ?? "",
    genres: ab.genres ?? [],
    story: ab.story,
    series_items: (ab.series ?? []).map((s) => ({ series_id: s.id, order: s.order })),
    is_published: ab.is_published,
    publish_at: isoToLocalInput(ab.publish_at),
    remove_cover: false,
  };
}

export default function AdminAudiobookEdit() {
  const { id } = useParams();
  const audiobookId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const { data: audiobook, isLoading, isError, refetch } = useAdminAudiobook(audiobookId);
  const { data: authors = [] } = useQuery({
    queryKey: ["admin-authors"],
    queryFn: () => storyApi.getAdminAuthors(),
  });
  const { data: genres = [] } = useQuery({
    queryKey: ["admin-genres"],
    queryFn: () => storyApi.getAdminGenres(),
  });
  const { data: seriesList = [] } = useAdminAudiobookSeries();

  const updateMutation = useUpdateAdminAudiobook(audiobookId);
  const deleteMutation = useDeleteAdminAudiobook();
  const createSeriesMutation = useCreateAdminAudiobookSeries();

  const [form, setForm] = useState<FormState | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [unlinkError, setUnlinkError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);

  const initialSnapshot = useMemo(() => (audiobook ? JSON.stringify(buildInitialForm(audiobook)) : ""), [audiobook]);

  useEffect(() => {
    if (audiobook) {
      setForm(buildInitialForm(audiobook));
      setCoverFile(null);
      setCoverPreviewUrl(null);
      setUnlinkError("");
    }
  }, [audiobook]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const isDirty = useMemo(() => {
    if (!form || !initialSnapshot) return false;
    return coverFile !== null || JSON.stringify(form) !== initialSnapshot;
  }, [form, initialSnapshot, coverFile]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const previewStory: Story | null = useMemo(() => {
    if (!audiobook || !form) return null;
    const selectedAuthor = authors.find((a) => String(a.id) === form.author);
    const effectiveTitle = form.display_title.trim() || form.title.trim() || audiobook.effective.title;
    const effectiveAuthorName = selectedAuthor?.name || (form.story ? audiobook.effective.author_name : "");
    const effectiveCover =
      coverPreviewUrl ||
      (form.remove_cover
        ? form.story
          ? audiobook.effective.cover
          : null
        : audiobook.own_cover || audiobook.effective.cover);
    const chosenGenreNames =
      form.genres.length > 0
        ? genres.filter((g) => form.genres.includes(g.id)).map((g) => g.name)
        : audiobook.effective.genres.map((g) => g.name);

    return {
      id: audiobook.id,
      title: effectiveTitle || "Untitled audiobook",
      slug: audiobook.story_detail?.slug || form.slug || audiobook.slug,
      author: effectiveAuthorName,
      cover_image: effectiveCover || "",
      genres: chosenGenreNames,
      audio_minutes: audiobook.total_duration_seconds
        ? Math.max(1, Math.round(audiobook.total_duration_seconds / 60))
        : null,
      has_read_along: audiobook.tracks.some((t) => t.has_cues),
      has_video: false,
    } as Story;
  }, [audiobook, form, authors, genres, coverPreviewUrl]);

  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-[1fr_340px]">
          <div className="h-96 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-96 w-full animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || !audiobook) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-sm font-medium text-foreground">Could not load this audiobook.</p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/audiobooks">Back to list</Link>
            </Button>
            <Button type="button" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLinked = form.story !== null;

  const handleUnlink = () => {
    const missing: string[] = [];
    if (!form.author) missing.push("author");
    if (!form.language.trim()) missing.push("language");
    if (!form.about.trim()) missing.push("about");
    if (missing.length > 0) {
      setUnlinkError(
        `Fill in ${missing.join(", ")} before unlinking from the story so this audiobook can stand on its own.`,
      );
      return;
    }
    setUnlinkError("");
    setForm((prev) => (prev ? { ...prev, story: null } : prev));
  };

  const handleSave = async () => {
    if (!isLinked) {
      if (!form.title.trim() || !form.author || !form.language.trim() || !form.about.trim()) {
        toast({
          title: "Required fields missing",
          description: "Standalone audiobooks require title, author, language, and about.",
          variant: "destructive",
        });
        return;
      }
    }

    const publishIso = localInputToIso(form.publish_at);
    let payload: FormData | Record<string, unknown>;

    if (coverFile) {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("display_title", form.display_title.trim());
      formData.append("slug", form.slug.trim());
      if (form.author) formData.append("author", form.author);
      formData.append("narrator", form.narrator.trim());
      formData.append("language", form.language);
      formData.append("about", form.about);
      if (form.story) formData.append("story", String(form.story));
      formData.append("series_items", JSON.stringify(form.series_items));
      formData.append("is_published", String(form.is_published));
      if (publishIso) formData.append("publish_at", publishIso);
      formData.append("cover_image_file", coverFile);
      form.genres.forEach((g) => formData.append("genres", String(g)));
      payload = formData;
    } else {
      payload = {
        title: form.title.trim(),
        display_title: form.display_title.trim(),
        slug: form.slug.trim(),
        author: form.author ? Number(form.author) : null,
        narrator: form.narrator.trim(),
        language: form.language,
        about: form.about,
        story: form.story,
        series_items: form.series_items,
        is_published: form.is_published,
        publish_at: publishIso,
        remove_cover: form.remove_cover,
        genres: form.genres,
      };
    }

    try {
      await updateMutation.mutateAsync(payload);
      toast({ title: "Changes saved" });
    } catch (err) {
      toast({
        title: "Could not save changes",
        description: err instanceof Error ? err.message : "Please check the fields and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(audiobook.id);
      toast({ title: "Audiobook deleted" });
      navigate("/admin/audiobooks");
    } catch (err) {
      toast({
        title: "Could not delete audiobook",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSeries = async (values: { title: string; slug: string; description: string }) => {
    try {
      const created = await createSeriesMutation.mutateAsync(values);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              series_items: prev.series_items.some((item) => item.series_id === created.id)
                ? prev.series_items
                : [...prev.series_items, { series_id: created.id, order: null }],
            }
          : prev,
      );
      setSeriesDialogOpen(false);
      toast({ title: "Series created and added" });
    } catch (err) {
      toast({
        title: "Could not create series",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const publicUrl = audiobookUrl(audiobook.slug);

  const displayedCover = coverPreviewUrl || (form.remove_cover ? audiobook.effective.cover : audiobook.cover);

  return (
    <div className="h-full overflow-y-auto space-y-6 pr-1 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/admin/audiobooks" className="hover:text-foreground hover:underline">
              Audiobooks
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate text-foreground">{audiobook.effective_title}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {audiobook.effective_title || audiobook.title}
            </h1>
            <StatusChip status={audiobook.status} />
            {isLinked && (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                Linked to a story
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button asChild variant="outline">
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View on site
            </a>
          </Button>
          <Button type="button" disabled={!isDirty || updateMutation.isPending} onClick={() => void handleSave()}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Two-column layout collapsing below 1100px */}
      <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title">Title {!isLinked && "*"}</Label>
                  <Input
                    id="edit-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={isLinked ? "Leave empty to use the story's title" : "Audiobook title"}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-display-title">Display title</Label>
                  <Input
                    id="edit-display-title"
                    value={form.display_title}
                    onChange={(e) => setForm({ ...form, display_title: e.target.value })}
                    placeholder="Optional public display title"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-slug">Slug</Label>
                  <Input
                    id="edit-slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-narrator">Narrator</Label>
                  <Input
                    id="edit-narrator"
                    value={form.narrator}
                    onChange={(e) => setForm({ ...form, narrator: e.target.value })}
                    placeholder="Narrator name"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-author">Author {!isLinked && "*"}</Label>
                  <Select
                    value={form.author || "inherit"}
                    onValueChange={(v) => setForm({ ...form, author: v === "inherit" ? "" : v })}
                  >
                    <SelectTrigger id="edit-author" aria-label="Author">
                      <SelectValue
                        placeholder={isLinked ? "Leave empty to use the story's author" : "Select an author"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {isLinked && <SelectItem value="inherit">Use story&apos;s author</SelectItem>}
                      {authors.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isLinked && !form.author && audiobook.effective.author_name && (
                    <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                      From story: {audiobook.effective.author_name}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-language">Language {!isLinked && "*"}</Label>
                  <Select
                    value={form.language || "inherit"}
                    onValueChange={(v) => setForm({ ...form, language: v === "inherit" ? "" : v })}
                  >
                    <SelectTrigger id="edit-language" aria-label="Language">
                      <SelectValue
                        placeholder={isLinked ? "Leave empty to use the story's language" : "Select language"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {isLinked && <SelectItem value="inherit">Use story&apos;s language</SelectItem>}
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.code} value={opt.code}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isLinked && !form.language && audiobook.effective.language && (
                    <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                      From story: {getLanguageLabel(audiobook.effective.language)}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-about">About {!isLinked && "*"}</Label>
                <Textarea
                  id="edit-about"
                  value={form.about}
                  onChange={(e) => setForm({ ...form, about: e.target.value })}
                  rows={4}
                  placeholder={isLinked ? "Leave empty to use the story's about text" : "Describe this audiobook..."}
                />
                {isLinked && !form.about.trim() && audiobook.effective.about && (
                  <p className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                    From story: {audiobook.effective.about.slice(0, 140)}
                    {audiobook.effective.about.length > 140 ? "..." : ""}
                  </p>
                )}
              </div>

              {genres.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Genres</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {genres.map((g) => {
                      const active = form.genres.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              genres: active ? form.genres.filter((gid) => gid !== g.id) : [...form.genres, g.id],
                            })
                          }
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
                  {isLinked && form.genres.length === 0 && audiobook.effective.genres.length > 0 && (
                    <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                      From story: {audiobook.effective.genres.map((g) => g.name).join(", ")}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <AudiobookTracksCard audiobook={audiobook} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Linked story card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked story</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLinked ? (
                <>
                  <div className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {audiobook.story_detail?.title || `Story #${form.story}`}
                      </p>
                      {audiobook.story_detail?.slug && (
                        <p className="truncate text-xs text-muted-foreground">/{audiobook.story_detail.slug}</p>
                      )}
                    </div>
                    <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={handleUnlink}>
                    <Link2Off className="mr-2 h-4 w-4" />
                    Unlink from story
                  </Button>
                  {unlinkError && (
                    <p role="alert" className="text-xs text-destructive">
                      {unlinkError}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    This is a standalone audiobook. Link a story if you want to inherit its metadata.
                  </p>
                  <StoryPicker
                    value={null}
                    placeholder="Link a story..."
                    onSelect={(story) => {
                      setUnlinkError("");
                      setForm({ ...form, story: story.id });
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cover card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayedCover ? (
                <img src={displayedCover} alt="" className="aspect-square w-full rounded-md border object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                  No cover image
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) {
                    setCoverFile(file);
                    setForm({ ...form, remove_cover: false });
                  }
                  e.target.value = "";
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Upload cover
                </Button>
                {(audiobook.own_cover || coverFile) && !form.remove_cover && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCoverFile(null);
                      setForm({ ...form, remove_cover: true });
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Series card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Series</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSeriesDialogOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <SeriesMultiSelect
                seriesList={seriesList}
                value={form.series_items}
                onChange={(next) => setForm({ ...form, series_items: next })}
                onRequestCreateSeries={() => setSeriesDialogOpen(true)}
              />
            </CardContent>
          </Card>

          {/* Publishing card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="edit-published" className="cursor-pointer">
                  Published
                </Label>
                <Switch
                  id="edit-published"
                  checked={form.is_published}
                  onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-publish-at" className="text-xs">
                  Schedule publish date (optional)
                </Label>
                <Input
                  id="edit-publish-at"
                  type="datetime-local"
                  value={form.publish_at}
                  onChange={(e) => setForm({ ...form, publish_at: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave empty to publish immediately when Published is on.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Live Preview card */}
          {previewStory && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Card preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mx-auto max-w-[200px] pointer-events-none">
                  <AudiobookCard story={previewStory} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Audiobook Dialog */}
      <DeleteAudiobookDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={audiobook.effective_title || audiobook.title}
        trackCount={audiobook.track_count}
        hasLinkedStory={Boolean(audiobook.story)}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
      />

      {/* New Series Dialog */}
      <SeriesDialog
        open={seriesDialogOpen}
        onOpenChange={setSeriesDialogOpen}
        isSaving={createSeriesMutation.isPending}
        onSubmit={(values) => void handleCreateSeries(values)}
      />
    </div>
  );
}
