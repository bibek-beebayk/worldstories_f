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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Bold, Check, ChevronRight, Heading2, Italic, Link2, List, ListOrdered, Loader2, Plus, Search, Underline, X } from "lucide-react";
import { LANGUAGE_OPTIONS, getLanguageLabel } from "@/lib/languages";
import { EpubImportJob } from "@/api/types";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { handleRichTextPaste } from "@/lib/richTextPaste";

const storyTypes = ["Short Story", "Novel", "Novella", "Poetry", "Non Fiction", "Summary", "Religious Text"];

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time (no
// timezone suffix) — the backend gives back a UTC ISO string, so this
// converts between the two in both directions.
const toDatetimeLocalValue = (isoString: string | null | undefined) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromDatetimeLocalValue = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const numToStr = (n: number | null | undefined) => (n != null ? String(n) : "");

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

// A Card whose body can be collapsed — used for the Story Details page's
// heavier sections (Summary, Retrospective, Chapters, Audio List) so
// reaching a section further down doesn't mean scrolling past everything
// above it first. Starts collapsed by default for exactly that reason;
// pass defaultOpen to override for a section worth always showing.
const CollapsibleSection = ({
  title,
  titleBadge,
  headerAction,
  defaultOpen = false,
  children,
}: {
  title: string;
  titleBadge?: React.ReactNode;
  headerAction?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => (
  <Card>
    <Collapsible defaultOpen={defaultOpen}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CollapsibleTrigger asChild>
          <button type="button" className="group flex min-w-0 items-center gap-2 text-left">
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            <CardTitle className="text-base">{title}</CardTitle>
            {titleBadge}
          </button>
        </CollapsibleTrigger>
        {headerAction}
      </CardHeader>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  </Card>
);

// Small green-check / red-cross indicator for optional rich-text fields
// (Summary, Retrospective) — used both on the Story Details page and on
// each card in the story list, so whether a field has been filled in is
// visible without opening it.
const ExistenceIndicator = ({ exists, label }: { exists: boolean; label: string }) =>
  exists ? (
    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label={`${label}: present`} />
  ) : (
    <X className="h-3.5 w-3.5 shrink-0 text-red-500" aria-label={`${label}: missing`} />
  );

// Small pill showing a count next to a section title (Chapters, Audio
// List) — both on Story Details and each story-list card.
const CountBadge = ({ count, label }: { count: number; label: string }) => (
  <span
    className="rounded-full border bg-muted/50 px-1.5 py-0 text-[11px] font-medium text-muted-foreground"
    aria-label={`${count} ${label}`}
  >
    {count}
  </span>
);

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
    Array<{
      id: number;
      title: string;
      slug: string;
      is_published: boolean;
      publish_at: string | null;
      source: "admin" | "submission";
      chapter_count: number;
      audio_count: number;
      summary: string | null;
      retrospective: string | null;
    }>
  >([]);
  const [hasMoreStories, setHasMoreStories] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [about, setAbout] = useState("");
  const [summary, setSummary] = useState("");
  const [retrospective, setRetrospective] = useState("");
  const [authorId, setAuthorId] = useState<string>("none");
  const [storyType, setStoryType] = useState("Short Story");
  const [language, setLanguage] = useState("en");
  const [originalPublishedYear, setOriginalPublishedYear] = useState("");
  const [originalPublishedMonth, setOriginalPublishedMonth] = useState("");
  const [originalPublishedDay, setOriginalPublishedDay] = useState("");
  const [sitePublishedDate, setSitePublishedDate] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [selectedGenreNames, setSelectedGenreNames] = useState<string[]>([]);
  const [genreQuery, setGenreQuery] = useState("");
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorBio, setNewAuthorBio] = useState("");
  const [newAuthorImage, setNewAuthorImage] = useState("");
  const [creatingAuthor, setCreatingAuthor] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [newGenreName, setNewGenreName] = useState("");
  const [creatingGenre, setCreatingGenre] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
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
  const [epubImportJob, setEpubImportJob] = useState<EpubImportJob | null>(null);
  const chapterEditorRef = useRef<HTMLDivElement | null>(null);
  const summaryEditorRef = useRef<HTMLDivElement | null>(null);
  const retrospectiveEditorRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isAutoLoadingRef = useRef(false);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);
  const epubFileInputRef = useRef<HTMLInputElement | null>(null);
  const epubImportFileInputRef = useRef<HTMLInputElement | null>(null);

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
  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: storyApi.getAdminCategories,
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
  const categoryNameById = useMemo(
    () => new Map((categories || []).map((category) => [category.id, category.name])),
    [categories]
  );

  const resetForm = () => {
    setSelectedStoryId(null);
    setTitle("");
    setSlug("");
    setAbout("");
    setSummary("");
    setRetrospective("");
    setAuthorId("none");
    setStoryType("Short Story");
    setLanguage("en");
    setOriginalPublishedYear("");
    setOriginalPublishedMonth("");
    setOriginalPublishedDay("");
    setSitePublishedDate("");
    setIsCompleted(false);
    setIsPublished(false);
    setPublishAt("");
    setCoverImage("");
    setCoverImageFile(null);
    setPdfFile(null);
    setEpubFile(null);
    setSelectedGenreNames([]);
    setGenreQuery("");
    setSelectedCategoryNames([]);
    setCategoryQuery("");
    setPendingTranslationSourceId(null);
    setPendingTranslationSourceTitle("");
  };

  const openNewStoryForm = () => {
    resetForm();
    setShowChapterModal(false);
    setShowStoryForm(true);
  };

  const openAddTranslationForm = () => {
    if (!selectedStoryId || !selectedStory) return;
    const sourceId = selectedStoryId;
    resetForm();
    // Carry over the details that describe the same underlying work — title/about
    // still need to be written in the new language, so those stay blank.
    setStoryType(selectedStory.story_type || "Short Story");
    setOriginalPublishedYear(numToStr(selectedStory.original_published_year));
    setOriginalPublishedMonth(numToStr(selectedStory.original_published_month));
    setOriginalPublishedDay(numToStr(selectedStory.original_published_day));
    setIsCompleted(Boolean(selectedStory.is_completed));
    setCoverImage(selectedStory.cover_image || "");
    setSelectedGenreNames(
      (selectedStory.genres || [])
        .map((genreId) => genreNameById.get(genreId))
        .filter((name): name is string => Boolean(name))
    );
    setSelectedCategoryNames(
      (selectedStory.categories || [])
        .map((categoryId) => categoryNameById.get(categoryId))
        .filter((name): name is string => Boolean(name))
    );
    setPendingTranslationSourceId(sourceId);
    setPendingTranslationSourceTitle(selectedStory.title || "");
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

  const createCategory = async (event: FormEvent) => {
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

  const syncSummaryEditorContent = () => {
    setSummary(summaryEditorRef.current?.innerHTML || "");
  };

  const runSummaryEditorCommand = (command: string, value?: string) => {
    summaryEditorRef.current?.focus();
    document.execCommand(command, false, value);
    syncSummaryEditorContent();
  };

  const addSummaryLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runSummaryEditorCommand("createLink", url);
  };

  const syncRetrospectiveEditorContent = () => {
    setRetrospective(retrospectiveEditorRef.current?.innerHTML || "");
  };

  const runRetrospectiveEditorCommand = (command: string, value?: string) => {
    retrospectiveEditorRef.current?.focus();
    document.execCommand(command, false, value);
    syncRetrospectiveEditorContent();
  };

  const addRetrospectiveLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runRetrospectiveEditorCommand("createLink", url);
  };

  useEffect(() => {
    if (!selectedStory) return;
    setPendingTranslationSourceId(null);
    setPendingTranslationSourceTitle("");
    setTitle(selectedStory.title || "");
    setSlug(selectedStory.slug || "");
    setAbout(selectedStory.about || "");
    setSummary(selectedStory.summary || "");
    setRetrospective(selectedStory.retrospective || "");
    setAuthorId(selectedStory.author ? String(selectedStory.author) : "none");
    setStoryType(selectedStory.story_type || "Short Story");
    setLanguage(selectedStory.language || "en");
    setOriginalPublishedYear(numToStr(selectedStory.original_published_year));
    setOriginalPublishedMonth(numToStr(selectedStory.original_published_month));
    setOriginalPublishedDay(numToStr(selectedStory.original_published_day));
    setSitePublishedDate(selectedStory.site_published_date || "");
    setIsCompleted(Boolean(selectedStory.is_completed));
    setIsPublished(Boolean(selectedStory.is_published));
    setPublishAt(toDatetimeLocalValue(selectedStory.publish_at));
    setCoverImage(selectedStory.cover_image || "");
    setSelectedGenreNames(
      (selectedStory.genres || [])
        .map((genreId) => genreNameById.get(genreId))
        .filter((name): name is string => Boolean(name))
    );
    setGenreQuery("");
    setSelectedCategoryNames(
      (selectedStory.categories || [])
        .map((categoryId) => categoryNameById.get(categoryId))
        .filter((name): name is string => Boolean(name))
    );
    setCategoryQuery("");
    setCoverImageFile(null);
    setPdfFile(null);
    setEpubFile(null);
  }, [selectedStory, genreNameById, categoryNameById]);

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
    // Only seed the contenteditable when the modal opens; depending on the
    // mirrored state would reset the caret after every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChapterModal]);

  useEffect(() => {
    if (!showStoryForm || !summaryEditorRef.current) return;
    summaryEditorRef.current.innerHTML = summary || "";
    // Only seed the contenteditable when the form opens, same reasoning as
    // the chapter editor above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStoryForm]);

  useEffect(() => {
    if (!showStoryForm || !retrospectiveEditorRef.current) return;
    retrospectiveEditorRef.current.innerHTML = retrospective || "";
    // Only seed the contenteditable when the form opens, same reasoning as
    // the chapter editor above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStoryForm]);

  useEffect(() => {
    setEpubImportJob(null);
  }, [selectedStoryId]);

  useEffect(() => {
    if (!epubImportJob || !selectedStoryId) return;
    if (epubImportJob.status === "completed" || epubImportJob.status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const latest = await storyApi.getStoryEpubImportStatus(selectedStoryId, epubImportJob.id);
        setEpubImportJob(latest);
        if (latest.status === "completed") {
          await queryClient.invalidateQueries({ queryKey: ["admin-chapters", selectedStoryId] });
          await queryClient.invalidateQueries({ queryKey: ["admin-story", selectedStoryId] });
        }
      } catch {
        // Transient poll failure — try again on the next tick rather than
        // giving up on the whole import.
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [epubImportJob, selectedStoryId, queryClient]);

  const handleImportEpub = async (file?: File) => {
    if (!selectedStoryId) return;
    try {
      const job = await storyApi.importStoryEpub(selectedStoryId, file);
      setEpubImportJob(job);
      if (file) {
        // The upload also just set/replaced the story's epub_file.
        await queryClient.invalidateQueries({ queryKey: ["admin-story", selectedStoryId] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start EPUB import.");
    }
  };

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

  const persistStory = async (options?: { forceDraft?: boolean; forcePublish?: boolean }) => {
    const forceDraft = Boolean(options?.forceDraft);
    const forcePublish = Boolean(options?.forcePublish);
    if (!canSave) return;

    const formData = new FormData();
    formData.append("title", title.trim());
    if (slug.trim()) formData.append("slug", slug.trim());
    formData.append("about", about.trim());
    formData.append("summary", summary.trim());
    formData.append("retrospective", retrospective.trim());
    formData.append("story_type", storyType);
    formData.append("language", language);
    if (authorId !== "none") {
      formData.append("author", authorId);
    } else if (mode === "edit") {
      formData.append("author", "");
    }
    formData.append("is_completed", String(isCompleted));
    const publishValue = forceDraft ? false : forcePublish ? true : isPublished;
    formData.append("is_published", String(publishValue));
    if (originalPublishedYear) {
      formData.append("original_published_year", originalPublishedYear);
    } else if (mode === "edit") {
      formData.append("original_published_year", "");
    }
    if (originalPublishedMonth) {
      formData.append("original_published_month", originalPublishedMonth);
    } else if (mode === "edit") {
      formData.append("original_published_month", "");
    }
    if (originalPublishedDay) {
      formData.append("original_published_day", originalPublishedDay);
    } else if (mode === "edit") {
      formData.append("original_published_day", "");
    }
    if (publishValue && sitePublishedDate) {
      formData.append("site_published_date", sitePublishedDate);
    } else if (mode === "edit") {
      formData.append("site_published_date", "");
    }
    if (publishAt) {
      formData.append("publish_at", fromDatetimeLocalValue(publishAt));
    } else if (mode === "edit") {
      formData.append("publish_at", "");
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

      const selectedCategoryMap = new Map<string, string>();
      selectedCategoryNames
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => {
          const key = name.toLowerCase();
          if (!selectedCategoryMap.has(key)) {
            selectedCategoryMap.set(key, name);
          }
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
      if (createdAnyCategory) {
        await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      }
      categoryIdsToSubmit.forEach((categoryId) => formData.append("categories", String(categoryId)));

      if (mode === "edit" && selectedStoryId) {
        await storyApi.updateAdminStory(selectedStoryId, formData);
        toast.success("Story updated.");
        setShowStoryForm(false);
      } else {
        const created = await storyApi.createAdminStory(formData);
        if (pendingTranslationSourceId) {
          await storyApi.linkStoryTranslation(created.id, pendingTranslationSourceId);
          await queryClient.invalidateQueries({ queryKey: ["admin-story", pendingTranslationSourceId] });
          setPendingTranslationSourceId(null);
          setPendingTranslationSourceTitle("");
          toast.success("Story created and linked as a translation.");
        } else {
          toast.success("Story created.");
        }
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
    await persistStory();
  };

  const saveStoryAsDraft = async () => {
    await persistStory({ forceDraft: true });
  };
  const publishStory = async () => {
    await persistStory({ forcePublish: true });
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

  const [translationSearchQuery, setTranslationSearchQuery] = useState("");
  const [debouncedTranslationQuery, setDebouncedTranslationQuery] = useState("");
  const [translationActionId, setTranslationActionId] = useState<number | null>(null);
  const [pendingTranslationSourceId, setPendingTranslationSourceId] = useState<number | null>(null);
  const [pendingTranslationSourceTitle, setPendingTranslationSourceTitle] = useState<string>("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTranslationQuery(translationSearchQuery.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [translationSearchQuery]);

  const { data: translationSearchResults } = useQuery({
    queryKey: ["admin-stories-translation-search", debouncedTranslationQuery],
    queryFn: () => storyApi.getAdminStories(1, debouncedTranslationQuery),
    enabled: debouncedTranslationQuery.length >= 2,
  });

  const handleLinkTranslation = async (targetStoryId: number) => {
    if (!selectedStoryId) return;
    try {
      setTranslationActionId(targetStoryId);
      await storyApi.linkStoryTranslation(selectedStoryId, targetStoryId);
      setTranslationSearchQuery("");
      await queryClient.invalidateQueries({ queryKey: ["admin-story", selectedStoryId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      toast.success("Linked as a translation.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to link translation.");
    } finally {
      setTranslationActionId(null);
    }
  };

  const handleUnlinkTranslation = async (siblingId: number) => {
    try {
      setTranslationActionId(siblingId);
      await storyApi.unlinkStoryTranslation(siblingId);
      await queryClient.invalidateQueries({ queryKey: ["admin-story", selectedStoryId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-story"] });
      toast.success("Translation unlinked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unlink translation.");
    } finally {
      setTranslationActionId(null);
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

  // On mobile the list and detail panes can't sit side by side, so only one
  // is shown at a time (a "master-detail" pattern) instead of stacking both
  // full-height panes vertically, which wasted most of the screen on a
  // half-visible list. Both panes stay visible together at lg: and up.
  const isMobileDetailActive = showStoryForm || showChapterModal || selectedStoryId !== null;

  return (
    <main className="h-full w-full overflow-hidden px-0 py-0">
      {/* Below lg, this switches from a two-column grid to a stacked flex
          column — the story list gets a bounded height (with its own internal
          scroll) instead of fighting the detail pane for h-full inside an
          ambiguous implicit grid row, which is what made this unusable on
          mobile before. */}
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:grid lg:gap-6 lg:grid-cols-[320px_1fr]">
        <Card
          className={`min-h-0 lg:block lg:h-full lg:min-h-0 ${
            isMobileDetailActive ? "hidden" : "flex-1"
          }`}
        >
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
                    {(() => {
                      const isScheduled =
                        item.is_published && !!item.publish_at && new Date(item.publish_at) > new Date();
                      const label = isScheduled ? "Scheduled" : item.is_published ? "Published" : "Draft";
                      const colorClass = isScheduled
                        ? "border-violet-200 bg-violet-100 text-violet-700"
                        : item.is_published
                        ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                        : "border-amber-200 bg-amber-100 text-amber-700";
                      return (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${colorClass}`}
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CountBadge count={item.chapter_count} label="chapters" /> chapters
                    </span>
                    <span className="flex items-center gap-1">
                      <CountBadge count={item.audio_count} label="audio files" /> audio
                    </span>
                    <span className="flex items-center gap-1">
                      <ExistenceIndicator exists={Boolean(item.summary)} label="Summary" /> summary
                    </span>
                    <span className="flex items-center gap-1">
                      <ExistenceIndicator exists={Boolean(item.retrospective)} label="Retrospective" /> retro
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

        <div
          className={`min-h-0 flex-col gap-6 overflow-y-auto pr-1 lg:flex lg:h-full ${
            isMobileDetailActive ? "flex flex-1" : "hidden"
          }`}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit lg:hidden"
            onClick={() => {
              setSelectedStoryId(null);
              setShowStoryForm(false);
              setShowChapterModal(false);
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to List
          </Button>

          {showStoryForm ? (
            <Card className="flex min-h-0 flex-1 flex-col">
              <CardHeader>
                <CardTitle className="text-base">{mode === "edit" ? "Edit Story" : "Create Story"}</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-y-auto">
                {pendingTranslationSourceId && (
                  <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                    Adding a new translation of <span className="font-medium">{pendingTranslationSourceTitle}</span>.
                    It will be linked automatically once you save.
                  </div>
                )}
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

                <div>
                  <Label htmlFor="admin-summary">Summary</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2 rounded-md border p-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => runSummaryEditorCommand("bold")}><Bold className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runSummaryEditorCommand("italic")}><Italic className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runSummaryEditorCommand("underline")}><Underline className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runSummaryEditorCommand("formatBlock", "h2")}><Heading2 className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runSummaryEditorCommand("insertUnorderedList")}><List className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runSummaryEditorCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={addSummaryLink}><Link2 className="h-4 w-4" /></Button>
                    </div>
                    <div
                      id="admin-summary"
                      ref={summaryEditorRef}
                      contentEditable
                      dir="ltr"
                      style={{ direction: "ltr", unicodeBidi: "isolate", writingMode: "horizontal-tb" }}
                      suppressContentEditableWarning
                      onInput={syncSummaryEditorContent}
                      onPaste={(e) => handleRichTextPaste(e, syncSummaryEditorContent)}
                      className="prose prose-sm dark:prose-invert min-h-40 max-w-none rounded-md border px-3 py-2 text-left [unicode-bidi:isolate] [&_*]:text-left focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="admin-retrospective">Retrospective</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2 rounded-md border p-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => runRetrospectiveEditorCommand("bold")}><Bold className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runRetrospectiveEditorCommand("italic")}><Italic className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runRetrospectiveEditorCommand("underline")}><Underline className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runRetrospectiveEditorCommand("formatBlock", "h2")}><Heading2 className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runRetrospectiveEditorCommand("insertUnorderedList")}><List className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runRetrospectiveEditorCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={addRetrospectiveLink}><Link2 className="h-4 w-4" /></Button>
                    </div>
                    <div
                      id="admin-retrospective"
                      ref={retrospectiveEditorRef}
                      contentEditable
                      dir="ltr"
                      style={{ direction: "ltr", unicodeBidi: "isolate", writingMode: "horizontal-tb" }}
                      suppressContentEditableWarning
                      onInput={syncRetrospectiveEditorContent}
                      onPaste={(e) => handleRichTextPaste(e, syncRetrospectiveEditorContent)}
                      className="prose prose-sm dark:prose-invert min-h-40 max-w-none rounded-md border px-3 py-2 text-left [unicode-bidi:isolate] [&_*]:text-left focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
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
                    <Label>Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((option) => (
                          <SelectItem key={option.code} value={option.code}>{option.label}</SelectItem>
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
                    <Label htmlFor="admin-original-published-year">Original Published Date</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Input
                        id="admin-original-published-year"
                        type="number"
                        placeholder="Year"
                        min={1}
                        value={originalPublishedYear}
                        onChange={(e) => {
                          const value = e.target.value;
                          setOriginalPublishedYear(value);
                          if (!value) {
                            setOriginalPublishedMonth("");
                            setOriginalPublishedDay("");
                          }
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Month"
                        min={1}
                        max={12}
                        value={originalPublishedMonth}
                        onChange={(e) => {
                          const value = e.target.value;
                          setOriginalPublishedMonth(value);
                          if (!value) setOriginalPublishedDay("");
                        }}
                        disabled={!originalPublishedYear}
                      />
                      <Input
                        type="number"
                        placeholder="Day"
                        min={1}
                        max={31}
                        value={originalPublishedDay}
                        onChange={(e) => setOriginalPublishedDay(e.target.value)}
                        disabled={!originalPublishedMonth}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      When the work was originally published. Enter whatever is known — year alone, year + month,
                      or the full date.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="admin-site-published-date">Published on Site Date</Label>
                    <Input
                      id="admin-site-published-date"
                      type="date"
                      value={sitePublishedDate || ""}
                      onChange={(e) => setSitePublishedDate(e.target.value)}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">When this story went live on WorldStories.</p>
                  </div>
                  <div>
                    <Label htmlFor="admin-publish-at">Schedule Publication</Label>
                    <Input
                      id="admin-publish-at"
                      type="datetime-local"
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional — keeps this story hidden from readers until this moment, even while Published is
                      checked. Leave blank to publish immediately.
                    </p>
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
                          <span
                            key={name.toLowerCase()}
                            className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1 text-xs"
                          >
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

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting || !canSave}>
                    {isSubmitting ? "Saving..." : mode === "edit" ? "Update Story" : "Create Story"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting || !canSave}
                    onClick={() => {
                      if (isPublished) {
                        void saveStoryAsDraft();
                      } else {
                        void publishStory();
                      }
                    }}
                  >
                    {isSubmitting ? "Saving..." : isPublished ? "Save as Draft" : "Publish"}
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
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
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
                        onPaste={(e) => handleRichTextPaste(e, syncChapterEditorContent)}
                        className="prose prose-sm dark:prose-invert min-h-40 max-w-none rounded-md border px-3 py-2 text-left [unicode-bidi:isolate] [&_*]:text-left focus:outline-none focus:ring-2 focus:ring-ring"
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
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
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
                      <p><span className="text-muted-foreground">Language:</span> {getLanguageLabel(selectedStory.language)}</p>
                      <p><span className="text-muted-foreground">Author:</span> {selectedStory.author ? (authorNameById.get(selectedStory.author) || "-") : "-"}</p>
                      <p>
                        <span className="text-muted-foreground">Submitted By:</span>{" "}
                        {selectedStory?.submitted_by
                          ? (selectedStory.submitted_by.display_name || selectedStory.submitted_by.username || selectedStory.submitted_by.email)
                          : "-"}
                      </p>
                      <p><span className="text-muted-foreground">Original Published Date:</span> {selectedStory.published_date_label || "-"}</p>
                      <p><span className="text-muted-foreground">Published on Site Date:</span> {selectedStory.site_published_date || "-"}</p>
                      <p><span className="text-muted-foreground">Completed:</span> {selectedStory.is_completed ? "Yes" : "No"}</p>
                      <p><span className="text-muted-foreground">Published:</span> {selectedStory.is_published ? "Yes" : "No"}</p>
                      {selectedStory.is_published && selectedStory.publish_at && (
                        <p>
                          <span className="text-muted-foreground">
                            {new Date(selectedStory.publish_at) > new Date() ? "Scheduled for:" : "Went live at:"}
                          </span>{" "}
                          {new Date(selectedStory.publish_at).toLocaleString()}
                        </p>
                      )}
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
                      <p className="mb-1 text-muted-foreground">Categories</p>
                      {(selectedStory.categories || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedStory.categories.map((categoryId) => (
                            <span key={categoryId} className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
                              {toTitleCase(categoryNameById.get(categoryId) || `Category #${categoryId}`)}
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
            <CollapsibleSection
              title="Summary"
              titleBadge={<ExistenceIndicator exists={Boolean(selectedStory?.summary)} label="Summary" />}
            >
              <CardContent>
                {selectedStory?.summary ? (
                  <div
                    className="prose prose-sm max-w-none rounded-md border bg-muted/30 px-3 py-2 dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedStory.summary) }}
                  />
                ) : (
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">-</p>
                )}
              </CardContent>
            </CollapsibleSection>
          )}

          {!showStoryForm && !showChapterModal && selectedStoryId && (
            <CollapsibleSection
              title="Retrospective"
              titleBadge={<ExistenceIndicator exists={Boolean(selectedStory?.retrospective)} label="Retrospective" />}
            >
              <CardContent>
                {selectedStory?.retrospective ? (
                  <div
                    className="prose prose-sm max-w-none rounded-md border bg-muted/30 px-3 py-2 dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedStory.retrospective) }}
                  />
                ) : (
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">-</p>
                )}
              </CardContent>
            </CollapsibleSection>
          )}

          {!showStoryForm && !showChapterModal && selectedStoryId && (
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">Translations</CardTitle>
                <Button size="sm" onClick={openAddTranslationForm}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Translation
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(selectedStory?.translations?.length || 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No other language editions linked yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedStory!.translations.map((sibling) => (
                      <div
                        key={sibling.id}
                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{sibling.title}</p>
                          <p className="text-xs text-muted-foreground">{getLanguageLabel(sibling.language)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedStoryId(sibling.id)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={translationActionId === sibling.id}
                            onClick={() => handleUnlinkTranslation(sibling.id)}
                          >
                            {translationActionId === sibling.id ? "Removing..." : "Unlink"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3">
                  <Label htmlFor="admin-translation-search">Link another story as a translation</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="admin-translation-search"
                      placeholder="Search by title..."
                      className="pl-9"
                      value={translationSearchQuery}
                      onChange={(e) => setTranslationSearchQuery(e.target.value)}
                    />
                  </div>
                  {debouncedTranslationQuery.length >= 2 && (
                    <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
                      {(translationSearchResults?.results || [])
                        .filter((story) => story.id !== selectedStoryId)
                        .map((story) => (
                          <button
                            key={story.id}
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                            disabled={translationActionId !== null}
                            onClick={() => handleLinkTranslation(story.id)}
                          >
                            <span className="truncate">{story.title}</span>
                            <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                              {getLanguageLabel(story.language)}
                            </span>
                          </button>
                        ))}
                      {(translationSearchResults?.results || []).filter((s) => s.id !== selectedStoryId).length ===
                        0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No matching stories.</p>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!showStoryForm && !showChapterModal && selectedStoryId && (
            <CollapsibleSection
              title="Chapters"
              titleBadge={<CountBadge count={selectedStory?.chapter_count ?? 0} label="chapters" />}
              headerAction={
                <div className="flex items-center gap-2">
                  {epubImportJob && (epubImportJob.status === "pending" || epubImportJob.status === "processing") && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Importing...
                    </span>
                  )}
                  {epubImportJob?.status === "completed" && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="h-3 w-3" /> Imported {epubImportJob.chapters_created} chapters
                    </span>
                  )}
                  {epubImportJob?.status === "failed" && (
                    <span
                      className="flex items-center gap-1 text-xs text-red-600"
                      title={epubImportJob.error_message || "Import failed."}
                    >
                      <X className="h-3 w-3" /> Import failed
                    </span>
                  )}
                  <input
                    ref={epubImportFileInputRef}
                    type="file"
                    accept="application/epub+zip,.epub"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportEpub(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={epubImportJob?.status === "pending" || epubImportJob?.status === "processing"}
                    onClick={() =>
                      selectedStory?.epub_file
                        ? handleImportEpub()
                        : epubImportFileInputRef.current?.click()
                    }
                  >
                    {selectedStory?.epub_file ? "Import chapters from EPUB" : "Upload EPUB & import chapters"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={openCreateChapterModal}>
                    Add New Chapter
                  </Button>
                </div>
              }
            >
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-md border p-2">
                  {chaptersLoading && <p className="text-sm text-muted-foreground">Loading chapters...</p>}
                  {(chaptersData?.results || []).map((chapter) => (
                    <div key={chapter.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">#{chapter.order} {chapter.title}</p>
                        <p className="truncate text-xs text-muted-foreground">/{chapter.slug}</p>
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
            </CollapsibleSection>
          )}

          {!showStoryForm && !showChapterModal && selectedStoryId && (
            <CollapsibleSection
              title="Audio List"
              titleBadge={<CountBadge count={selectedStory?.audio_count ?? 0} label="audio files" />}
              headerAction={
                <Button size="sm" variant="outline" onClick={openCreateAudioModal}>
                  Add New Audio
                </Button>
              }
            >
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
            </CollapsibleSection>
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
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
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
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
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
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
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

      {showCategoryModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)}>
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
                  <Label htmlFor="new-category-name">Name *</Label>
                  <Input id="new-category-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} required />
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
    </main>
  );
};

export default AdminContent;
