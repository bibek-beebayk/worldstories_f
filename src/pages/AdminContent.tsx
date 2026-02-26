import FullScreenLoader from "@/components/FullScreenLoader";
import { storyApi } from "@/api/story";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Loader2, Plus, Search, Underline, X } from "lucide-react";

const storyTypes = ["Short Story", "Novel", "Poetry", "Non Fiction"];
const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const AdminContent = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [storiesList, setStoriesList] = useState<
    Array<{ id: number; title: string; slug: string; is_published: boolean; source: "admin" | "submission" }>
  >([]);
  const [hasMoreStories, setHasMoreStories] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [about, setAbout] = useState("");
  const [authorId, setAuthorId] = useState<string>("none");
  const [storyType, setStoryType] = useState("Short Story");
  const [publishedDate, setPublishedDate] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [coverImage, setCoverImage] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [selectedGenreNames, setSelectedGenreNames] = useState<string[]>([]);
  const [genreQuery, setGenreQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorBio, setNewAuthorBio] = useState("");
  const [newAuthorImage, setNewAuthorImage] = useState("");
  const [creatingAuthor, setCreatingAuthor] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const [creatingGenre, setCreatingGenre] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterSlug, setNewChapterSlug] = useState("");
  const [newChapterOrder, setNewChapterOrder] = useState(1);
  const [newChapterContent, setNewChapterContent] = useState("");
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [pendingDeleteChapterId, setPendingDeleteChapterId] = useState<number | null>(null);
  const [deletingChapter, setDeletingChapter] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [editingAudioId, setEditingAudioId] = useState<number | null>(null);
  const [newAudioTitle, setNewAudioTitle] = useState("");
  const [newAudioSlug, setNewAudioSlug] = useState("");
  const [newAudioOrder, setNewAudioOrder] = useState(1);
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [creatingAudio, setCreatingAudio] = useState(false);
  const [pendingDeleteAudioId, setPendingDeleteAudioId] = useState<number | null>(null);
  const [deletingAudio, setDeletingAudio] = useState(false);
  const [fileActionLoading, setFileActionLoading] = useState<string | null>(null);
  const chapterEditorRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isAutoLoadingRef = useRef(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);
  const epubFileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });

  const { data: genres } = useQuery({
    queryKey: ["admin-genres"],
    queryFn: storyApi.getAdminGenres,
    enabled: isAuthenticated && Boolean(me?.is_superuser),
  });
  const { data: authors } = useQuery({
    queryKey: ["admin-authors"],
    queryFn: storyApi.getAdminAuthors,
    enabled: isAuthenticated && Boolean(me?.is_superuser),
  });

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ["admin-stories", page, search],
    queryFn: () => storyApi.getAdminStories(page, search),
    enabled: isAuthenticated && Boolean(me?.is_superuser),
  });

  const { data: selectedStory, isLoading: selectedLoading } = useQuery({
    queryKey: ["admin-story", selectedStoryId],
    queryFn: () => storyApi.getAdminStory(selectedStoryId!),
    enabled: isAuthenticated && Boolean(me?.is_superuser) && selectedStoryId !== null,
  });

  const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
    queryKey: ["admin-chapters", selectedStoryId],
    queryFn: () => storyApi.getAdminChapters(selectedStoryId!),
    enabled: isAuthenticated && Boolean(me?.is_superuser) && selectedStoryId !== null,
  });

  const { data: audiosData, isLoading: audiosLoading } = useQuery({
    queryKey: ["admin-audios", selectedStoryId],
    queryFn: () => storyApi.getAdminAudios(selectedStoryId!),
    enabled: isAuthenticated && Boolean(me?.is_superuser) && selectedStoryId !== null,
  });

  const mode = selectedStoryId ? "edit" : "create";
  const authorNameById = useMemo(
    () => new Map((authors || []).map((author) => [author.id, author.name])),
    [authors]
  );
  const genreNameById = useMemo(
    () => new Map((genres || []).map((genre) => [genre.id, genre.name])),
    [genres]
  );

  const resetForm = () => {
    setSelectedStoryId(null);
    setTitle("");
    setSlug("");
    setAbout("");
    setAuthorId("none");
    setStoryType("Short Story");
    setPublishedDate("");
    setIsCompleted(false);
    setIsPublished(false);
    setCoverImage("");
    setCoverImageFile(null);
    setPdfFile(null);
    setEpubFile(null);
    setSelectedGenreNames([]);
    setGenreQuery("");
  };

  const openNewStoryForm = () => {
    resetForm();
    setShowChapterModal(false);
    setShowStoryForm(true);
  };

  const createAuthor = async (event: FormEvent) => {
    event.preventDefault();
    if (!newAuthorName.trim()) return;
    try {
      setCreatingAuthor(true);
      const created = await storyApi.createAdminAuthor({
        name: newAuthorName.trim(),
        bio: newAuthorBio.trim() || undefined,
        image: newAuthorImage.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-authors"] });
      setAuthorId(String(created.id));
      setShowAuthorModal(false);
      setNewAuthorName("");
      setNewAuthorBio("");
      setNewAuthorImage("");
      toast.success("Author created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create author.");
    } finally {
      setCreatingAuthor(false);
    }
  };

  const createGenre = async (event: FormEvent) => {
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

  const openCreateChapterModal = () => {
    setEditingChapterId(null);
    setNewChapterTitle("");
    setNewChapterSlug("");
    setNewChapterOrder((chaptersData?.results?.length || 0) + 1);
    setNewChapterContent("");
    setShowChapterModal(true);
    setShowStoryForm(false);
  };

  const openEditChapterModal = (chapter: {
    id: number;
    title: string;
    slug: string;
    order: number;
    content: string;
  }) => {
    setEditingChapterId(chapter.id);
    setNewChapterTitle(chapter.title || "");
    setNewChapterSlug(chapter.slug || "");
    setNewChapterOrder(chapter.order || 1);
    setNewChapterContent(chapter.content || "");
    setShowChapterModal(true);
    setShowStoryForm(false);
  };

  const createChapter = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStoryId || !newChapterTitle.trim()) return;
    try {
      setCreatingChapter(true);
      if (editingChapterId) {
        await storyApi.updateAdminChapter(editingChapterId, {
          title: newChapterTitle.trim(),
          slug: newChapterSlug.trim() || undefined,
          order: newChapterOrder,
          content: newChapterContent,
        });
      } else {
        await storyApi.createAdminChapter({
          story: selectedStoryId,
          title: newChapterTitle.trim(),
          slug: newChapterSlug.trim() || undefined,
          order: newChapterOrder,
          content: newChapterContent,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-chapters", selectedStoryId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      setShowChapterModal(false);
      setEditingChapterId(null);
      toast.success(editingChapterId ? "Chapter updated." : "Chapter created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${editingChapterId ? "update" : "create"} chapter.`);
    } finally {
      setCreatingChapter(false);
    }
  };

  const deleteChapter = async (chapterId: number) => {
    if (!selectedStoryId) return;
    try {
      setDeletingChapter(true);
      const deleteResponse = await storyApi.deleteAdminChapter(chapterId);
      queryClient.setQueryData(
        ["admin-chapters", selectedStoryId],
        (current: { pagination?: { count?: number }; results?: Array<{ id: number }> } | undefined) => {
          if (!current?.results) return current;
          const nextResults = current.results.filter((chapter) => chapter.id !== chapterId);
          const nextCount = typeof current.pagination?.count === "number"
            ? Math.max(0, current.pagination.count - 1)
            : current.pagination?.count;
          return {
            ...current,
            pagination: current.pagination ? { ...current.pagination, count: nextCount } : current.pagination,
            results: nextResults,
          };
        }
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-chapters", selectedStoryId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      if (deleteResponse === undefined) {
        toast.success("Chapter deleted.");
      }
      setPendingDeleteChapterId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete chapter.");
    } finally {
      setDeletingChapter(false);
    }
  };

  const openCreateAudioModal = () => {
    setEditingAudioId(null);
    setNewAudioTitle("");
    setNewAudioSlug("");
    setNewAudioOrder((audiosData?.results?.length || 0) + 1);
    setNewAudioFile(null);
    setShowAudioModal(true);
  };

  const openEditAudioModal = (audio: {
    id: number;
    title: string;
    slug: string;
    order: number;
  }) => {
    setEditingAudioId(audio.id);
    setNewAudioTitle(audio.title || "");
    setNewAudioSlug(audio.slug || "");
    setNewAudioOrder(audio.order || 1);
    setNewAudioFile(null);
    setShowAudioModal(true);
  };

  const saveAudio = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStoryId || !newAudioTitle.trim()) return;
    if (!editingAudioId && !newAudioFile) {
      toast.error("Audio file is required.");
      return;
    }
    try {
      setCreatingAudio(true);
      const formData = new FormData();
      formData.append("story", String(selectedStoryId));
      formData.append("title", newAudioTitle.trim());
      formData.append("order", String(newAudioOrder));
      if (newAudioSlug.trim()) formData.append("slug", newAudioSlug.trim());
      if (newAudioFile) formData.append("audio_file", newAudioFile);

      if (editingAudioId) {
        await storyApi.updateAdminAudio(editingAudioId, formData);
      } else {
        await storyApi.createAdminAudio(formData);
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-audios", selectedStoryId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      setShowAudioModal(false);
      setEditingAudioId(null);
      toast.success(editingAudioId ? "Audio updated." : "Audio created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${editingAudioId ? "update" : "create"} audio.`);
    } finally {
      setCreatingAudio(false);
    }
  };

  const deleteAudio = async (audioId: number) => {
    if (!selectedStoryId) return;
    try {
      setDeletingAudio(true);
      const deleteResponse = await storyApi.deleteAdminAudio(audioId);
      queryClient.setQueryData(
        ["admin-audios", selectedStoryId],
        (current: { pagination?: { count?: number }; results?: Array<{ id: number }> } | undefined) => {
          if (!current?.results) return current;
          const nextResults = current.results.filter((audio) => audio.id !== audioId);
          const nextCount = typeof current.pagination?.count === "number"
            ? Math.max(0, current.pagination.count - 1)
            : current.pagination?.count;
          return {
            ...current,
            pagination: current.pagination ? { ...current.pagination, count: nextCount } : current.pagination,
            results: nextResults,
          };
        }
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-audios", selectedStoryId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      if (deleteResponse === undefined) {
        toast.success("Audio deleted.");
      }
      setPendingDeleteAudioId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete audio.");
    } finally {
      setDeletingAudio(false);
    }
  };

  const syncChapterEditorContent = () => {
    setNewChapterContent(chapterEditorRef.current?.innerHTML || "");
  };

  const runChapterEditorCommand = (command: string, value?: string) => {
    chapterEditorRef.current?.focus();
    document.execCommand(command, false, value);
    syncChapterEditorContent();
  };

  const addChapterLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runChapterEditorCommand("createLink", url);
  };

  useEffect(() => {
    if (!selectedStory) return;
    setTitle(selectedStory.title || "");
    setSlug(selectedStory.slug || "");
    setAbout(selectedStory.about || "");
    setAuthorId(selectedStory.author ? String(selectedStory.author) : "none");
    setStoryType(selectedStory.story_type || "Short Story");
    setPublishedDate(selectedStory.published_date || "");
    setIsCompleted(Boolean(selectedStory.is_completed));
    setIsPublished(Boolean(selectedStory.is_published));
    setCoverImage(selectedStory.cover_image || "");
    setSelectedGenreNames(
      (selectedStory.genres || [])
        .map((genreId) => genreNameById.get(genreId))
        .filter((name): name is string => Boolean(name))
    );
    setGenreQuery("");
    setCoverImageFile(null);
    setPdfFile(null);
    setEpubFile(null);
  }, [selectedStory, genreNameById]);

  useEffect(() => {
    if (!storiesData) return;
    const incoming = storiesData.results || [];
    if (page === 1) {
      setStoriesList(incoming);
    } else {
      setStoriesList((previous) => {
        const existingIds = new Set(previous.map((item) => item.id));
        const nextItems = incoming.filter((item) => !existingIds.has(item.id));
        return [...previous, ...nextItems];
      });
    }
    const currentPage = storiesData.pagination?.page || 1;
    const totalPages = storiesData.pagination?.pages || 1;
    setHasMoreStories(currentPage < totalPages);
    if (!storiesLoading) {
      isAutoLoadingRef.current = false;
    }
  }, [storiesData, page, storiesLoading]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (!hasMoreStories || storiesLoading || isAutoLoadingRef.current) return;
        isAutoLoadingRef.current = true;
        setPage((prev) => prev + 1);
      },
      { root: null, rootMargin: "140px", threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreStories, storiesLoading, search]);

  useEffect(() => {
    if (!showChapterModal || !chapterEditorRef.current) return;
    chapterEditorRef.current.innerHTML = newChapterContent || "";
  }, [showChapterModal]);

  const canSave = useMemo(() => title.trim().length > 2, [title]);
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

  const persistStory = async (forceDraft = false) => {
    if (!canSave) return;

    const formData = new FormData();
    formData.append("title", title.trim());
    if (slug.trim()) formData.append("slug", slug.trim());
    formData.append("about", about.trim());
    formData.append("story_type", storyType);
    if (authorId !== "none") {
      formData.append("author", authorId);
    } else if (mode === "edit") {
      formData.append("author", "");
    }
    formData.append("is_completed", String(isCompleted));
    const publishValue = forceDraft ? false : isPublished;
    formData.append("is_published", String(publishValue));
    if (publishValue && publishedDate) {
      formData.append("published_date", publishedDate);
    } else if (mode === "edit") {
      formData.append("published_date", "");
    }
    if (coverImage.trim()) formData.append("cover_image", coverImage.trim());
    if (coverImageFile) formData.append("cover_image_file", coverImageFile);
    if (pdfFile) formData.append("pdf_file", pdfFile);
    if (epubFile) formData.append("epub_file", epubFile);

    try {
      setIsSubmitting(true);
      const selectedGenreMap = new Map<string, string>();
      selectedGenreNames
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => {
          const key = name.toLowerCase();
          if (!selectedGenreMap.has(key)) {
            selectedGenreMap.set(key, name);
          }
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
      if (createdAnyGenre) {
        await queryClient.invalidateQueries({ queryKey: ["admin-genres"] });
      }
      genreIdsToSubmit.forEach((genreId) => formData.append("genres", String(genreId)));

      if (mode === "edit" && selectedStoryId) {
        await storyApi.updateAdminStory(selectedStoryId, formData);
        toast.success("Story updated.");
        setShowStoryForm(false);
      } else {
        const created = await storyApi.createAdminStory(formData);
        toast.success("Story created.");
        setSelectedStoryId(created.id);
        setShowStoryForm(false);
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      if (selectedStoryId) {
        await queryClient.invalidateQueries({ queryKey: ["admin-story", selectedStoryId] });
        await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      }
      if (mode === "create") {
        await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save story.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveStory = async (event: FormEvent) => {
    event.preventDefault();
    await persistStory(false);
  };

  const saveStoryAsDraft = async () => {
    await persistStory(true);
  };

  const updateStoryFile = async (field: "cover_image_file" | "pdf_file" | "epub_file", file: File) => {
    if (!selectedStoryId) return;
    try {
      setFileActionLoading(field);
      const formData = new FormData();
      formData.append(field, file);
      await storyApi.updateAdminStory(selectedStoryId, formData);
      await queryClient.invalidateQueries({ queryKey: ["admin-story", selectedStoryId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      toast.success("File updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update file.");
    } finally {
      setFileActionLoading(null);
    }
  };

  const removeStoryFile = async (field: "remove_cover_image_file" | "remove_pdf_file" | "remove_epub_file") => {
    if (!selectedStoryId) return;
    try {
      setFileActionLoading(field);
      const formData = new FormData();
      formData.append(field, "true");
      await storyApi.updateAdminStory(selectedStoryId, formData);
      await queryClient.invalidateQueries({ queryKey: ["admin-story", selectedStoryId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      toast.success("File removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove file.");
    } finally {
      setFileActionLoading(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              <Link to="/admin/login" className="text-primary hover:underline">Admin login</Link> required to access content admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (meLoading) return <FullScreenLoader />;

  if (!me?.is_superuser) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6 text-center">
            <p className="text-red-500">Access denied. Superuser privileges required.</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/")}>Back to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="h-full w-full overflow-hidden px-0 py-0">
      <div className="grid h-full min-h-0 gap-6 overflow-hidden lg:grid-cols-[320px_1fr]">
        <Card className="h-full min-h-0">
          <CardContent className="flex h-full flex-col space-y-3 p-3">
            <div className="flex gap-2">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setPage(1);
                    setSearch(searchInput.trim());
                  }
                }}
                placeholder="Search title or slug"
              />
              <Button size="sm" onClick={() => { setPage(1); setSearch(searchInput.trim()); }}>
                <Search className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={openNewStoryForm}
                aria-label="Create new story"
                title="Create new story"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Total stories: <span className="font-medium text-foreground">{storiesData?.pagination?.count ?? 0}</span>
            </p>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {storiesLoading && page === 1 && <p className="text-sm text-muted-foreground">Loading stories...</p>}
              {storiesList.map((item) => (
                <button
                  key={item.id}
                  className={`w-full rounded-md border px-3 py-2 text-left hover:bg-muted ${selectedStoryId === item.id ? "border-primary" : ""}`}
                  onClick={() => {
                    setSelectedStoryId(item.id);
                    setShowStoryForm(false);
                    setShowChapterModal(false);
                  }}
                >
                  <p className="text-sm font-medium leading-5 whitespace-normal break-words">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">/{item.slug}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        item.source === "submission"
                          ? "border-blue-200 bg-blue-100 text-blue-700"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.source === "submission" ? "Submission" : "Admin"}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        item.is_published
                          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                          : "border-amber-200 bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </button>
              ))}
              {storiesList.length === 0 && !storiesLoading && (
                <p className="text-sm text-muted-foreground">No stories found.</p>
              )}
              <div ref={loadMoreRef} className="h-1" />
              {storiesLoading && page > 1 && (
                <p className="text-center text-xs text-muted-foreground">Loading more...</p>
              )}
              {!hasMoreStories && storiesList.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">End of list</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pr-1">
          {showStoryForm ? (
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardHeader>
                <CardTitle className="text-base">{mode === "edit" ? "Edit Story" : "Create Story"}</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto">
                {(mode === "edit" && selectedLoading) ? (
                  <p className="text-sm text-muted-foreground">Loading story details...</p>
                ) : (
                  <form className="space-y-4" onSubmit={saveStory}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="admin-title">Title *</Label>
                    <Input id="admin-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="admin-slug">Slug</Label>
                    <Input id="admin-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated if empty" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="admin-about">About</Label>
                  <Textarea id="admin-about" value={about} onChange={(e) => setAbout(e.target.value)} className="min-h-28" />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Story Type</Label>
                    <Select value={storyType} onValueChange={setStoryType}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {storyTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Author</Label>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAuthorModal(true)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select value={authorId} onValueChange={setAuthorId}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Select author" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No author</SelectItem>
                        {(authors || []).map((author) => (
                          <SelectItem key={author.id} value={String(author.id)}>
                            {author.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="admin-published-date">Published Date</Label>
                    <Input id="admin-published-date" type="date" value={publishedDate || ""} onChange={(e) => setPublishedDate(e.target.value)} className="mt-2" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={isCompleted} onCheckedChange={(value) => setIsCompleted(Boolean(value))} />
                      Completed
                    </label>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={isPublished} onCheckedChange={(value) => setIsPublished(Boolean(value))} />
                      Published
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="admin-cover-url">Cover Image URL</Label>
                  <Input id="admin-cover-url" type="url" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="mt-2" />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="admin-cover-file">Cover Upload</Label>
                    <Input id="admin-cover-file" type="file" accept="image/*" className="mt-2" onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label htmlFor="admin-pdf-file">PDF File</Label>
                    <Input id="admin-pdf-file" type="file" accept="application/pdf,.pdf" className="mt-2" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label htmlFor="admin-epub-file">EPUB File</Label>
                    <Input id="admin-epub-file" type="file" accept=".epub,application/epub+zip" className="mt-2" onChange={(e) => setEpubFile(e.target.files?.[0] || null)} />
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addGenreName(genreQuery)}
                        disabled={!genreQuery.trim()}
                      >
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
                          <span
                            key={name.toLowerCase()}
                            className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1 text-xs"
                          >
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

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting || !canSave}>
                    {isSubmitting ? "Saving..." : mode === "edit" ? "Update Story" : "Create Story"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || !canSave}
                    onClick={() => {
                      void saveStoryAsDraft();
                    }}
                  >
                    {isSubmitting ? "Saving..." : "Save as Draft"}
                  </Button>
                  {mode === "edit" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowStoryForm(false)}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  {mode === "create" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setShowStoryForm(false);
                      }}
                    >
                      Close
                    </Button>
                  )}
                </div>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : showChapterModal && selectedStoryId ? (
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{editingChapterId ? "Edit Chapter" : "Add New Chapter"}</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowChapterModal(false);
                    setEditingChapterId(null);
                  }}
                >
                  Back to Details
                </Button>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto">
                <form className="space-y-3" onSubmit={createChapter}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label htmlFor="new-chapter-title">Title *</Label>
                      <Input id="new-chapter-title" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="new-chapter-order">Order *</Label>
                      <Input id="new-chapter-order" type="number" min={1} value={newChapterOrder} onChange={(e) => setNewChapterOrder(Number(e.target.value || 1))} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new-chapter-slug">Slug (optional)</Label>
                    <Input id="new-chapter-slug" value={newChapterSlug} onChange={(e) => setNewChapterSlug(e.target.value)} placeholder="auto if blank" />
                  </div>
                  <div>
                    <Label htmlFor="new-chapter-content">Content</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2 rounded-md border p-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => runChapterEditorCommand("bold")}><Bold className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => runChapterEditorCommand("italic")}><Italic className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => runChapterEditorCommand("underline")}><Underline className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => runChapterEditorCommand("formatBlock", "h2")}><Heading2 className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => runChapterEditorCommand("insertUnorderedList")}><List className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => runChapterEditorCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="sm" onClick={addChapterLink}><Link2 className="h-4 w-4" /></Button>
                      </div>
                      <div
                        id="new-chapter-content"
                        ref={chapterEditorRef}
                        contentEditable
                        dir="ltr"
                        style={{ direction: "ltr", unicodeBidi: "isolate", writingMode: "horizontal-tb" }}
                        suppressContentEditableWarning
                        onInput={syncChapterEditorContent}
                        className="min-h-40 rounded-md border px-3 py-2 text-left text-sm [unicode-bidi:isolate] [&_*]:text-left focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowChapterModal(false);
                        setEditingChapterId(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creatingChapter || !newChapterTitle.trim()}>
                      {creatingChapter ? (editingChapterId ? "Updating..." : "Creating...") : (editingChapterId ? "Update Chapter" : "Create Chapter")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : !selectedStoryId ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Select a story to edit, or click <span className="font-medium text-foreground">New Story</span> to create one.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {!showStoryForm && !showChapterModal && selectedStoryId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Story Details</CardTitle>
                <Button size="sm" onClick={() => setShowStoryForm(true)}>
                  Edit Story
                </Button>
              </CardHeader>
              <CardContent>
                {selectedLoading ? (
                  <p className="text-sm text-muted-foreground">Loading story details...</p>
                ) : selectedStory ? (
                  <div className="space-y-3 text-sm">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p><span className="text-muted-foreground">Title:</span> {selectedStory.title}</p>
                      <p><span className="text-muted-foreground">Slug:</span> /{selectedStory.slug}</p>
                      <p><span className="text-muted-foreground">Type:</span> {selectedStory.story_type}</p>
                      <p><span className="text-muted-foreground">Author:</span> {selectedStory.author ? (authorNameById.get(selectedStory.author) || "-") : "-"}</p>
                      <p>
                        <span className="text-muted-foreground">Submitted By:</span>{" "}
                        {selectedStory?.submitted_by
                          ? (selectedStory.submitted_by.display_name || selectedStory.submitted_by.username || selectedStory.submitted_by.email)
                          : "-"}
                      </p>
                      <p><span className="text-muted-foreground">Published:</span> {selectedStory.published_date || "-"}</p>
                      <p><span className="text-muted-foreground">Completed:</span> {selectedStory.is_completed ? "Yes" : "No"}</p>
                      <p><span className="text-muted-foreground">Published:</span> {selectedStory.is_published ? "Yes" : "No"}</p>
                      <p><span className="text-muted-foreground">Rating:</span> {selectedStory.rating.toFixed(1)}</p>
                      <p><span className="text-muted-foreground">Views:</span> {selectedStory.views}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-muted-foreground">Genres</p>
                      {(selectedStory.genres || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedStory.genres.map((genreId) => (
                            <span key={genreId} className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
                              {toTitleCase(genreNameById.get(genreId) || `Genre #${genreId}`)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-md border bg-muted/30 px-3 py-2">-</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-muted-foreground">About</p>
                      <p className="rounded-md border bg-muted/30 px-3 py-2">{selectedStory.about || "-"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No story selected.</p>
                )}
              </CardContent>
            </Card>
          )}

          {!showStoryForm && !showChapterModal && selectedStoryId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Chapters</CardTitle>
                <Button size="sm" variant="outline" onClick={openCreateChapterModal}>
                  Add New Chapter
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-md border p-2">
                  {chaptersLoading && <p className="text-sm text-muted-foreground">Loading chapters...</p>}
                  {(chaptersData?.results || []).map((chapter) => (
                    <div key={chapter.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">#{chapter.order} {chapter.title}</p>
                        <p className="text-xs text-muted-foreground">/{chapter.slug}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditChapterModal(chapter)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPendingDeleteChapterId(chapter.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(chaptersData?.results?.length || 0) === 0 && !chaptersLoading && (
                    <p className="text-sm text-muted-foreground">No chapters yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!showStoryForm && !showChapterModal && selectedStoryId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Audio List</CardTitle>
                <Button size="sm" variant="outline" onClick={openCreateAudioModal}>
                  Add New Audio
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 rounded-md border p-2">
                  {audiosLoading && <p className="text-sm text-muted-foreground">Loading audios...</p>}
                  {(audiosData?.results || []).map((audio) => (
                    <div key={audio.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">#{audio.order} {audio.title}</p>
                        <p className="text-xs text-muted-foreground">/{audio.slug}</p>
                        <p className="truncate text-xs text-muted-foreground">{audio.audio_file || "-"}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditAudioModal(audio)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPendingDeleteAudioId(audio.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(audiosData?.results?.length || 0) === 0 && !audiosLoading && (
                    <p className="text-sm text-muted-foreground">No audio uploaded.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!showStoryForm && !showChapterModal && selectedStoryId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="rounded-md border px-3 py-2">
                  <p className="mb-2 text-muted-foreground">Cover</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedStory?.cover_image_url ? (
                      <a href={selectedStory.cover_image_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Open cover image
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) updateStoryFile("cover_image_file", file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={fileActionLoading !== null}
                      onClick={() => coverFileInputRef.current?.click()}
                    >
                      {fileActionLoading === "cover_image_file"
                        ? "Uploading..."
                        : selectedStory?.cover_image_url
                          ? "Change"
                          : "Upload"}
                    </Button>
                    {selectedStory?.cover_image_file && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={fileActionLoading !== null}
                        onClick={() => removeStoryFile("remove_cover_image_file")}
                      >
                        {fileActionLoading === "remove_cover_image_file" ? "Removing..." : "Remove"}
                      </Button>
                    )}
                  </div>
                  {fileActionLoading === "cover_image_file" && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading cover image...
                    </div>
                  )}
                </div>
                <div className="rounded-md border px-3 py-2">
                  <p className="mb-2 text-muted-foreground">PDF</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedStory?.pdf_file_url ? (
                      <a href={selectedStory.pdf_file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Open PDF
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                    <input
                      ref={pdfFileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) updateStoryFile("pdf_file", file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={fileActionLoading !== null}
                      onClick={() => pdfFileInputRef.current?.click()}
                    >
                      {fileActionLoading === "pdf_file"
                        ? "Uploading..."
                        : selectedStory?.pdf_file_url
                          ? "Change"
                          : "Upload"}
                    </Button>
                    {selectedStory?.pdf_file && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={fileActionLoading !== null}
                        onClick={() => removeStoryFile("remove_pdf_file")}
                      >
                        {fileActionLoading === "remove_pdf_file" ? "Removing..." : "Remove"}
                      </Button>
                    )}
                  </div>
                  {fileActionLoading === "pdf_file" && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading PDF...
                    </div>
                  )}
                </div>
                <div className="rounded-md border px-3 py-2">
                  <p className="mb-2 text-muted-foreground">EPUB</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedStory?.epub_file_url ? (
                      <a href={selectedStory.epub_file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Open EPUB
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                    <input
                      ref={epubFileInputRef}
                      type="file"
                      accept=".epub,application/epub+zip"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) updateStoryFile("epub_file", file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={fileActionLoading !== null}
                      onClick={() => epubFileInputRef.current?.click()}
                    >
                      {fileActionLoading === "epub_file"
                        ? "Uploading..."
                        : selectedStory?.epub_file_url
                          ? "Change"
                          : "Upload"}
                    </Button>
                    {selectedStory?.epub_file && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={fileActionLoading !== null}
                        onClick={() => removeStoryFile("remove_epub_file")}
                      >
                        {fileActionLoading === "remove_epub_file" ? "Removing..." : "Remove"}
                      </Button>
                    )}
                  </div>
                  {fileActionLoading === "epub_file" && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading EPUB...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {pendingDeleteChapterId !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setPendingDeleteChapterId(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Chapter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this chapter? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteChapterId(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deletingChapter} onClick={() => deleteChapter(pendingDeleteChapterId)}>
                  {deletingChapter ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAudioModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowAudioModal(false)}>
          <Card className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{editingAudioId ? "Edit Audio" : "Add New Audio"}</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAudioModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveAudio}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label htmlFor="new-audio-title">Title *</Label>
                    <Input id="new-audio-title" value={newAudioTitle} onChange={(e) => setNewAudioTitle(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="new-audio-order">Order *</Label>
                    <Input id="new-audio-order" type="number" min={1} value={newAudioOrder} onChange={(e) => setNewAudioOrder(Number(e.target.value || 1))} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-audio-slug">Slug (optional)</Label>
                  <Input id="new-audio-slug" value={newAudioSlug} onChange={(e) => setNewAudioSlug(e.target.value)} placeholder="auto if blank" />
                </div>
                <div>
                  <Label htmlFor="new-audio-file">Audio File {!editingAudioId && "*"}</Label>
                  <Input
                    id="new-audio-file"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setNewAudioFile(e.target.files?.[0] || null)}
                    required={!editingAudioId}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAudioModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={creatingAudio || !newAudioTitle.trim()}>
                    {creatingAudio ? (editingAudioId ? "Updating..." : "Creating...") : (editingAudioId ? "Update Audio" : "Create Audio")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {pendingDeleteAudioId !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setPendingDeleteAudioId(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Audio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this audio? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteAudioId(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deletingAudio} onClick={() => deleteAudio(pendingDeleteAudioId)}>
                  {deletingAudio ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAuthorModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowAuthorModal(false)}>
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Create Author</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAuthorModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createAuthor}>
                <div>
                  <Label htmlFor="new-author-name">Name *</Label>
                  <Input id="new-author-name" value={newAuthorName} onChange={(e) => setNewAuthorName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="new-author-bio">Bio</Label>
                  <Textarea id="new-author-bio" value={newAuthorBio} onChange={(e) => setNewAuthorBio(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="new-author-image">Image URL</Label>
                  <Input id="new-author-image" type="url" value={newAuthorImage} onChange={(e) => setNewAuthorImage(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAuthorModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={creatingAuthor || !newAuthorName.trim()}>
                    {creatingAuthor ? "Creating..." : "Create Author"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showGenreModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowGenreModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Create Genre</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowGenreModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createGenre}>
                <div>
                  <Label htmlFor="new-genre-name">Name *</Label>
                  <Input id="new-genre-name" value={newGenreName} onChange={(e) => setNewGenreName(e.target.value)} required />
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
    </main>
  );
};

export default AdminContent;
