import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { storyApi } from "@/api/story";
import { BookFetchJob, StoryQueueItem, StoryQueueItemPayload } from "@/api/types";
import { COUNTRY_OPTIONS, getCountryLabel } from "@/lib/countries";
import { LANGUAGE_OPTIONS, getLanguageLabel } from "@/lib/languages";
import { AlertTriangle, Check, Eye, Loader2, Plus, X } from "lucide-react";

const STORY_TYPES = ["Short Story", "Novel", "Novella", "Poetry", "Non Fiction", "Religious Text", "Summary"];
type AddedFilter = "all" | "true" | "false";
// Kept in sync with book_fetch.MAX_BOOK_FETCH_COUNT on the backend.
const MAX_BOOK_FETCH_COUNT = 14;

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const EMPTY_FORM = {
  title: "",
  authorName: "",
  about: "",
  storyType: "",
  country: "",
  language: "en",
  publishedYear: "",
  publishedMonth: "",
  publishedDay: "",
  epubLink: "",
  pdfLink: "",
  coverImageLink: "",
};

const StoryQueueManager = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addedFilter, setAddedFilter] = useState<AddedFilter>("all");
  const [detailsItem, setDetailsItem] = useState<StoryQueueItem | null>(null);
  const [selectedGenreNames, setSelectedGenreNames] = useState<string[]>([]);
  const [genreQuery, setGenreQuery] = useState("");
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const [creatingGenre, setCreatingGenre] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [debouncedTitle, setDebouncedTitle] = useState("");
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [fetchCount, setFetchCount] = useState("10");
  const [starting, setStarting] = useState(false);
  const [fetchJob, setFetchJob] = useState<BookFetchJob | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTitle(form.title.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form.title]);

  const { data: titleCheck } = useQuery({
    queryKey: ["story-queue-title-check", debouncedTitle],
    queryFn: () => storyApi.checkStoryQueueTitle(debouncedTitle),
    enabled: showAddModal && debouncedTitle.length >= 2,
  });
  const titleMatches =
    debouncedTitle && debouncedTitle === form.title.trim()
      ? [...(titleCheck?.story_matches || []), ...(titleCheck?.queue_matches || [])].length
      : 0;

  useEffect(() => {
    if (!fetchJob) return;
    if (fetchJob.status === "completed" || fetchJob.status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const latest = await storyApi.getStoryQueueFetchBooksStatus(fetchJob.id);
        setFetchJob(latest);
        if (latest.status === "completed") {
          await queryClient.invalidateQueries({ queryKey: ["admin-story-queue"] });
          toast.success(
            `Added ${latest.created_count} new book${latest.created_count === 1 ? "" : "s"} to the queue` +
              (latest.skipped_count ? ` (${latest.skipped_count} skipped as duplicates).` : ".")
          );
        }
        if (latest.status === "failed") {
          toast.error(latest.error_message || "Fetching book data failed.");
        }
      } catch {
        // Transient poll failure — try again on the next tick.
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchJob, queryClient]);

  const { data: queueData, isLoading } = useQuery({
    queryKey: ["admin-story-queue", page, addedFilter],
    queryFn: () => storyApi.getStoryQueue(page, addedFilter === "all" ? undefined : addedFilter === "true"),
  });
  const { data: authors } = useQuery({ queryKey: ["admin-authors"], queryFn: storyApi.getAdminAuthors });
  const { data: genres } = useQuery({ queryKey: ["admin-genres"], queryFn: storyApi.getAdminGenres });
  const { data: categories } = useQuery({ queryKey: ["admin-categories"], queryFn: storyApi.getAdminCategories });
  const genreNameById = useMemo(
    () => new Map((genres || []).map((genre) => [genre.id, genre.name])),
    [genres]
  );
  const categoryNameById = useMemo(
    () => new Map((categories || []).map((category) => [category.id, category.name])),
    [categories]
  );

  const filteredAuthorSuggestions = useMemo(() => {
    const query = form.authorName.trim().toLowerCase();
    if (!query) return [];
    return (authors || [])
      .filter((author) => author.name.toLowerCase().startsWith(query))
      .filter((author) => author.name.toLowerCase() !== query)
      .slice(0, 8);
  }, [authors, form.authorName]);

  const handleCountryQueryChange = (value: string) => {
    setCountryQuery(value);
    const match = COUNTRY_OPTIONS.find((option) => option.label.toLowerCase() === value.trim().toLowerCase());
    setForm((f) => ({ ...f, country: match ? match.code : "" }));
  };

  const availableGenresByLowerName = useMemo(
    () => new Map((genres || []).map((genre) => [genre.name.trim().toLowerCase(), genre])),
    [genres]
  );
  const filteredGenreSuggestions = useMemo(() => {
    const query = genreQuery.trim().toLowerCase();
    if (!query) return [];
    return (genres || [])
      .filter((genre) => genre.name.toLowerCase().startsWith(query))
      .filter((genre) => !selectedGenreNames.some((name) => name.toLowerCase() === genre.name.toLowerCase()))
      .slice(0, 8);
  }, [genreQuery, genres, selectedGenreNames]);
  const addGenreName = (rawName: string) => {
    const name = toTitleCase(rawName);
    if (!name) return;
    setSelectedGenreNames((current) => {
      if (current.some((item) => item.toLowerCase() === name.toLowerCase())) return current;
      return [...current, name];
    });
    setGenreQuery("");
  };
  const removeGenreName = (nameToRemove: string) => {
    setSelectedGenreNames((current) =>
      current.filter((name) => name.toLowerCase() !== nameToRemove.toLowerCase())
    );
  };

  const availableCategoriesByLowerName = useMemo(
    () => new Map((categories || []).map((category) => [category.name.trim().toLowerCase(), category])),
    [categories]
  );
  const filteredCategorySuggestions = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return [];
    return (categories || [])
      .filter((category) => category.name.toLowerCase().startsWith(query))
      .filter(
        (category) => !selectedCategoryNames.some((name) => name.toLowerCase() === category.name.toLowerCase())
      )
      .slice(0, 8);
  }, [categoryQuery, categories, selectedCategoryNames]);
  const addCategoryName = (rawName: string) => {
    const name = toTitleCase(rawName);
    if (!name) return;
    setSelectedCategoryNames((current) => {
      if (current.some((item) => item.toLowerCase() === name.toLowerCase())) return current;
      return [...current, name];
    });
    setCategoryQuery("");
  };
  const removeCategoryName = (nameToRemove: string) => {
    setSelectedCategoryNames((current) =>
      current.filter((name) => name.toLowerCase() !== nameToRemove.toLowerCase())
    );
  };

  const createGenre = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newGenreName.trim()) return;
    try {
      setCreatingGenre(true);
      const created = await storyApi.createAdminGenre(toTitleCase(newGenreName));
      await queryClient.invalidateQueries({ queryKey: ["admin-genres"] });
      setSelectedGenreNames((current) =>
        current.some((name) => name.toLowerCase() === created.name.toLowerCase())
          ? current
          : [...current, created.name]
      );
      setShowGenreModal(false);
      setNewGenreName("");
      toast.success("Genre created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create genre.");
    } finally {
      setCreatingGenre(false);
    }
  };

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setCreatingCategory(true);
      const created = await storyApi.createAdminCategory(toTitleCase(newCategoryName));
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setSelectedCategoryNames((current) =>
        current.some((name) => name.toLowerCase() === created.name.toLowerCase())
          ? current
          : [...current, created.name]
      );
      setShowCategoryModal(false);
      setNewCategoryName("");
      toast.success("Category created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create category.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const addBook = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    try {
      setCreating(true);

      const selectedGenreMap = new Map<string, string>();
      selectedGenreNames
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => {
          const key = name.toLowerCase();
          if (!selectedGenreMap.has(key)) selectedGenreMap.set(key, name);
        });
      const genreIdsToSubmit: number[] = [];
      let createdAnyGenre = false;
      for (const [lowerName, originalName] of selectedGenreMap.entries()) {
        const existing = availableGenresByLowerName.get(lowerName);
        if (existing) {
          genreIdsToSubmit.push(existing.id);
          continue;
        }
        const created = await storyApi.createAdminGenre(toTitleCase(originalName));
        genreIdsToSubmit.push(created.id);
        createdAnyGenre = true;
      }
      if (createdAnyGenre) await queryClient.invalidateQueries({ queryKey: ["admin-genres"] });

      const selectedCategoryMap = new Map<string, string>();
      selectedCategoryNames
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => {
          const key = name.toLowerCase();
          if (!selectedCategoryMap.has(key)) selectedCategoryMap.set(key, name);
        });
      const categoryIdsToSubmit: number[] = [];
      let createdAnyCategory = false;
      for (const [lowerName, originalName] of selectedCategoryMap.entries()) {
        const existing = availableCategoriesByLowerName.get(lowerName);
        if (existing) {
          categoryIdsToSubmit.push(existing.id);
          continue;
        }
        const created = await storyApi.createAdminCategory(toTitleCase(originalName));
        categoryIdsToSubmit.push(created.id);
        createdAnyCategory = true;
      }
      if (createdAnyCategory) await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

      const payload: StoryQueueItemPayload = {
        title: form.title.trim(),
        author_name: form.authorName.trim(),
        about: form.about.trim(),
        story_type: form.storyType,
        country: form.country,
        language: form.language,
        genres: genreIdsToSubmit,
        categories: categoryIdsToSubmit,
        original_published_year: form.publishedYear ? Number(form.publishedYear) : null,
        original_published_month: form.publishedMonth ? Number(form.publishedMonth) : null,
        original_published_day: form.publishedDay ? Number(form.publishedDay) : null,
        epub_link: form.epubLink.trim(),
        pdf_link: form.pdfLink.trim(),
        cover_image_link: form.coverImageLink.trim(),
      };
      await storyApi.createStoryQueueItem(payload);
      setForm(EMPTY_FORM);
      setCountryQuery("");
      setSelectedGenreNames([]);
      setGenreQuery("");
      setSelectedCategoryNames([]);
      setCategoryQuery("");
      setPage(1);
      setShowAddModal(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-story-queue"] });
      toast.success("Added to the queue.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add book to the queue.");
    } finally {
      setCreating(false);
    }
  };

  const startFetchBooks = async (event: React.FormEvent) => {
    event.preventDefault();
    const count = Number(fetchCount);
    if (!Number.isInteger(count) || count < 1 || count > MAX_BOOK_FETCH_COUNT) return;
    try {
      setStarting(true);
      const job = await storyApi.fetchStoryQueueBooks(count);
      setFetchJob(job);
      setShowFetchModal(false);
      toast.success("Fetching book suggestions from Claude...");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start fetching book data.");
    } finally {
      setStarting(false);
    }
  };

  const addToStories = async (id: number) => {
    try {
      setAddingId(id);
      await storyApi.addStoryQueueItem(id);
      toast.success("Story created as a draft.");
      await queryClient.invalidateQueries({ queryKey: ["admin-story-queue"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add this book.");
    } finally {
      setAddingId(null);
    }
  };

  const changeAddedFilter = (value: string) => {
    setPage(1);
    setAddedFilter(value as AddedFilter);
  };

  const removeItem = async (id: number) => {
    try {
      await storyApi.deleteStoryQueueItem(id);
      await queryClient.invalidateQueries({ queryKey: ["admin-story-queue"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove this entry.");
    }
  };

  const pagination = queueData?.pagination;
  const startSerial = ((pagination?.page || 1) - 1) * (pagination?.size || 20);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {fetchJob && (fetchJob.status === "pending" || fetchJob.status === "processing") && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Fetching book data...
          </span>
        )}
        {fetchJob?.status === "completed" && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" /> Added {fetchJob.created_count}
          </span>
        )}
        {fetchJob?.status === "failed" && (
          <span
            className="flex items-center gap-1 text-xs text-destructive"
            title={fetchJob.error_message || "Fetch failed."}
          >
            <X className="h-3 w-3" /> Fetch failed
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={fetchJob?.status === "pending" || fetchJob?.status === "processing"}
          onClick={() => setShowFetchModal(true)}
        >
          Fetch Book Data
        </Button>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          Add to Queue
        </Button>
      </div>

      {showFetchModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowFetchModal(false)}
        >
          <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Fetch Book Data</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowFetchModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={startFetchBooks}>
                <p className="text-xs text-muted-foreground">
                  Asks Claude to suggest public-domain books not already in your catalog and adds them to
                  the queue.
                </p>
                <div>
                  <Label htmlFor="fetch-count">How many books?</Label>
                  <Input
                    id="fetch-count"
                    type="number"
                    min={1}
                    max={MAX_BOOK_FETCH_COUNT}
                    value={fetchCount}
                    onChange={(e) => setFetchCount(e.target.value)}
                    className="mt-2"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowFetchModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={starting}>
                    {starting ? "Starting..." : "Fetch"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <Card
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Add to Queue</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowAddModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={addBook} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="queue-title">Title *</Label>
                <Input
                  id="queue-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="queue-author">Author</Label>
                <Input
                  id="queue-author"
                  value={form.authorName}
                  onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                  className="mt-2"
                  autoComplete="off"
                />
                {filteredAuthorSuggestions.length > 0 && (
                  <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                    {filteredAuthorSuggestions.map((author) => (
                      <button
                        key={author.id}
                        type="button"
                        className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                        onClick={() => setForm((f) => ({ ...f, authorName: author.name }))}
                      >
                        {author.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {titleMatches > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">This title may already exist:</p>
                  {(titleCheck?.story_matches || []).map((match) => (
                    <p key={`story-${match.id}`}>
                      "{match.title}" — already a {match.is_published ? "published" : "draft"} story
                    </p>
                  ))}
                  {(titleCheck?.queue_matches || []).map((match) => (
                    <p key={`queue-${match.id}`}>
                      "{match.title}" — already in the queue{match.author_name ? ` (by ${match.author_name})` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="queue-about">About</Label>
              <Textarea
                id="queue-about"
                value={form.about}
                onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                className="mt-2 min-h-20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label htmlFor="queue-story-type">Story Type</Label>
                <Select
                  value={form.storyType || undefined}
                  onValueChange={(value) => setForm((f) => ({ ...f, storyType: value }))}
                >
                  <SelectTrigger id="queue-story-type" className="mt-2">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    {STORY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="queue-language">Language</Label>
                <Select
                  value={form.language}
                  onValueChange={(value) => setForm((f) => ({ ...f, language: value }))}
                >
                  <SelectTrigger id="queue-language" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="queue-country">Country</Label>
                <Input
                  id="queue-country"
                  value={countryQuery}
                  onChange={(e) => handleCountryQueryChange(e.target.value)}
                  placeholder="Start typing a country"
                  className="mt-2"
                  list="queue-country-suggestions"
                  autoComplete="off"
                />
                <datalist id="queue-country-suggestions">
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option.code} value={option.label} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Publication Date</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Year"
                    value={form.publishedYear}
                    onChange={(e) => setForm((f) => ({ ...f, publishedYear: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Month"
                    min={1}
                    max={12}
                    value={form.publishedMonth}
                    onChange={(e) => setForm((f) => ({ ...f, publishedMonth: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Day"
                    min={1}
                    max={31}
                    value={form.publishedDay}
                    onChange={(e) => setForm((f) => ({ ...f, publishedDay: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Genres</Label>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowGenreModal(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 space-y-2 rounded-md border p-3">
                <div className="flex gap-2">
                  <Input
                    value={genreQuery}
                    onChange={(e) => setGenreQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addGenreName(genreQuery);
                      }
                    }}
                    placeholder="Type genre name (e.g. Fan...)"
                  />
                  <Button type="button" variant="outline" onClick={() => addGenreName(genreQuery)} disabled={!genreQuery.trim()}>
                    Add
                  </Button>
                </div>
                {filteredGenreSuggestions.length > 0 && (
                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                    {filteredGenreSuggestions.map((genre) => (
                      <button
                        key={genre.id}
                        type="button"
                        className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                        onClick={() => addGenreName(genre.name)}
                      >
                        {toTitleCase(genre.name)}
                      </button>
                    ))}
                  </div>
                )}
                {selectedGenreNames.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedGenreNames.map((name) => (
                      <span key={name.toLowerCase()} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1 text-xs">
                        {toTitleCase(name)}
                        <button
                          type="button"
                          className="rounded p-0.5 hover:bg-background"
                          onClick={() => removeGenreName(name)}
                          aria-label={`Remove ${name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Type to search genres by starting letters. If a genre does not exist, it will be created when you save.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Categories</Label>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCategoryModal(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 space-y-2 rounded-md border p-3">
                <div className="flex gap-2">
                  <Input
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCategoryName(categoryQuery);
                      }
                    }}
                    placeholder="Type category name (e.g. Class...)"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addCategoryName(categoryQuery)}
                    disabled={!categoryQuery.trim()}
                  >
                    Add
                  </Button>
                </div>
                {filteredCategorySuggestions.length > 0 && (
                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                    {filteredCategorySuggestions.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                        onClick={() => addCategoryName(category.name)}
                      >
                        {toTitleCase(category.name)}
                      </button>
                    ))}
                  </div>
                )}
                {selectedCategoryNames.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCategoryNames.map((name) => (
                      <span key={name.toLowerCase()} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1 text-xs">
                        {toTitleCase(name)}
                        <button
                          type="button"
                          className="rounded p-0.5 hover:bg-background"
                          onClick={() => removeCategoryName(name)}
                          aria-label={`Remove ${name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Type to search categories by starting letters. If a category does not exist, it will be created when you save.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="queue-cover-link">Cover Image Link</Label>
                <Input
                  id="queue-cover-link"
                  type="url"
                  placeholder="https://..."
                  value={form.coverImageLink}
                  onChange={(e) => setForm((f) => ({ ...f, coverImageLink: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="queue-epub-link">EPUB Link (public domain)</Label>
                <Input
                  id="queue-epub-link"
                  type="url"
                  placeholder="https://..."
                  value={form.epubLink}
                  onChange={(e) => setForm((f) => ({ ...f, epubLink: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="queue-pdf-link">PDF Link (public domain)</Label>
                <Input
                  id="queue-pdf-link"
                  type="url"
                  placeholder="https://..."
                  value={form.pdfLink}
                  onChange={(e) => setForm((f) => ({ ...f, pdfLink: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={creating || !form.title.trim()}>
                    {creating ? "Adding..." : "Add to Queue"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap gap-2">
            <Select value={addedFilter} onValueChange={changeAddedFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="true">Added</SelectItem>
                <SelectItem value="false">Not Added</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading queue...</p>
          ) : (queueData?.results?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">The queue is empty. Add a book above to get started.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Author</th>
                    <th className="px-3 py-2">Language</th>
                    <th className="px-3 py-2">Publication Date</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(queueData?.results || []).map((item, index) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{startSerial + index + 1}</td>
                      <td className="max-w-64 truncate px-3 py-2 font-medium">{item.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.author_name || "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.language ? getLanguageLabel(item.language) : "-"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{item.published_date_label || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`View details for ${item.title}`}
                            onClick={() => setDetailsItem(item)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {item.is_added ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Added
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={addingId === item.id}
                              onClick={() => addToStories(item.id)}
                            >
                              {addingId === item.id ? "Adding..." : "Add"}
                            </Button>
                          )}
                          {!item.is_added && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              aria-label={`Remove ${item.title}`}
                              onClick={() => removeItem(item.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                disabled={(pagination.page || 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {pagination.page} / {pagination.pages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={(pagination.page || 1) >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {detailsItem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setDetailsItem(null)}
        >
          <Card
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{detailsItem.title}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setDetailsItem(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Author</p>
                <p>{detailsItem.author_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p>{detailsItem.is_added ? "Added" : "Not Added"}</p>
              </div>
              {detailsItem.story_type && (
                <div>
                  <p className="text-xs text-muted-foreground">Story Type</p>
                  <p>{detailsItem.story_type}</p>
                </div>
              )}
              {detailsItem.country && (
                <div>
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p>{getCountryLabel(detailsItem.country)}</p>
                </div>
              )}
              {detailsItem.language && (
                <div>
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p>{getLanguageLabel(detailsItem.language)}</p>
                </div>
              )}
              {detailsItem.published_date_label && (
                <div>
                  <p className="text-xs text-muted-foreground">Publication Date</p>
                  <p>{detailsItem.published_date_label}</p>
                </div>
              )}
              {detailsItem.about && (
                <div>
                  <p className="text-xs text-muted-foreground">About</p>
                  <p className="whitespace-pre-wrap">{detailsItem.about}</p>
                </div>
              )}
              {detailsItem.genres.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Genres</p>
                  <p>{detailsItem.genres.map((id) => genreNameById.get(id) || "-").join(", ")}</p>
                </div>
              )}
              {detailsItem.categories.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Categories</p>
                  <p>{detailsItem.categories.map((id) => categoryNameById.get(id) || "-").join(", ")}</p>
                </div>
              )}
              {detailsItem.cover_image_link && (
                <div>
                  <p className="text-xs text-muted-foreground">Cover Image Link</p>
                  <a
                    href={detailsItem.cover_image_link}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary hover:underline"
                  >
                    {detailsItem.cover_image_link}
                  </a>
                </div>
              )}
              {detailsItem.epub_link && (
                <div>
                  <p className="text-xs text-muted-foreground">EPUB Link</p>
                  <a
                    href={detailsItem.epub_link}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary hover:underline"
                  >
                    {detailsItem.epub_link}
                  </a>
                </div>
              )}
              {detailsItem.pdf_link && (
                <div>
                  <p className="text-xs text-muted-foreground">PDF Link</p>
                  <a
                    href={detailsItem.pdf_link}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary hover:underline"
                  >
                    {detailsItem.pdf_link}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showGenreModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowGenreModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Create Genre</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowGenreModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createGenre}>
                <div>
                  <Label htmlFor="new-queue-genre-name">Name *</Label>
                  <Input id="new-queue-genre-name" value={newGenreName} onChange={(e) => setNewGenreName(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowGenreModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={creatingGenre || !newGenreName.trim()}>
                    {creatingGenre ? "Creating..." : "Create Genre"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Create Category</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCategoryModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createCategory}>
                <div>
                  <Label htmlFor="new-queue-category-name">Name *</Label>
                  <Input id="new-queue-category-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={creatingCategory || !newCategoryName.trim()}>
                    {creatingCategory ? "Creating..." : "Create Category"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StoryQueueManager;
