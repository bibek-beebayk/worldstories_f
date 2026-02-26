import FullScreenLoader from "@/components/FullScreenLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bold,
  BookMarked,
  Bell,
  FileText,
  Heading2,
  Headphones,
  Heart,
  LayoutGrid,
  Link2,
  List,
  ListOrdered,
  MessageSquare,
  Settings,
  Underline,
  Italic,
  User,
  X,
} from "lucide-react";
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type ProfileSection = "overview" | "reader" | "creator" | "settings";
type ReaderView =
  | "reading"
  | "completed"
  | "listening"
  | "favorites"
  | "reviews";

const storyTypes = ["Short Story", "Novel", "Poetry", "Non Fiction"];

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const [activeSection, setActiveSection] = useState<ProfileSection>("overview");
  const [activeReaderView, setActiveReaderView] = useState<ReaderView>("reading");

  const [readingPage, setReadingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [listeningPage, setListeningPage] = useState(1);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [submissionsPage, setSubmissionsPage] = useState(1);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [showSubmissionViewModal, setShowSubmissionViewModal] = useState(false);
  const [showSubmissionEditModal, setShowSubmissionEditModal] = useState(false);
  const [submissionModalLoading, setSubmissionModalLoading] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
  const [pendingDeleteSubmissionId, setPendingDeleteSubmissionId] = useState<number | null>(null);
  const [deletingSubmission, setDeletingSubmission] = useState(false);
  const [savingSubmission, setSavingSubmission] = useState(false);

  const [submissionTitle, setSubmissionTitle] = useState("");
  const [submissionAbout, setSubmissionAbout] = useState("");
  const [submissionStoryType, setSubmissionStoryType] = useState("Short Story");
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionCoverImage, setSubmissionCoverImage] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submissionGenres, setSubmissionGenres] = useState<number[]>([]);
  const [submissionCoverImageFile, setSubmissionCoverImageFile] = useState<File | null>(null);
  const [submissionPdfFile, setSubmissionPdfFile] = useState<File | null>(null);
  const [submissionEpubFile, setSubmissionEpubFile] = useState<File | null>(null);
  const [showCreateSubmissionForm, setShowCreateSubmissionForm] = useState(false);
  const [creatingSubmission, setCreatingSubmission] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createAbout, setCreateAbout] = useState("");
  const [createStoryType, setCreateStoryType] = useState("Short Story");
  const [createContent, setCreateContent] = useState("");
  const [createCoverImage, setCreateCoverImage] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createGenres, setCreateGenres] = useState<number[]>([]);
  const [createCoverImageFile, setCreateCoverImageFile] = useState<File | null>(null);
  const [createPdfFile, setCreatePdfFile] = useState<File | null>(null);
  const [createEpubFile, setCreateEpubFile] = useState<File | null>(null);
  const [seenSubmissionNotes, setSeenSubmissionNotes] = useState<Record<number, string>>({});
  const createContentEditorRef = useRef<HTMLDivElement | null>(null);
  const editContentEditorRef = useRef<HTMLDivElement | null>(null);

  const isOverviewSection = activeSection === "overview";
  const isReaderSection = activeSection === "reader";
  const shouldLoadReading = isOverviewSection || (isReaderSection && activeReaderView === "reading");
  const shouldLoadCompleted = isOverviewSection || (isReaderSection && activeReaderView === "completed");
  const shouldLoadListening = isOverviewSection || (isReaderSection && activeReaderView === "listening");
  const shouldLoadFavorites = isOverviewSection || (isReaderSection && activeReaderView === "favorites");
  const shouldLoadReviews = isOverviewSection || (isReaderSection && activeReaderView === "reviews");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });

  const { data: readingData } = useQuery({
    queryKey: ["profile-continue-reading", readingPage],
    queryFn: () => authApi.getContinueReading(readingPage),
    enabled: isAuthenticated && shouldLoadReading,
  });

  const { data: listeningData } = useQuery({
    queryKey: ["profile-continue-listening", listeningPage],
    queryFn: () => authApi.getContinueListening(listeningPage),
    enabled: isAuthenticated && shouldLoadListening,
  });

  const { data: completedData } = useQuery({
    queryKey: ["profile-completed-reading", completedPage],
    queryFn: () => authApi.getCompletedReading(completedPage),
    enabled: isAuthenticated && shouldLoadCompleted,
  });

  const { data: favoritesData } = useQuery({
    queryKey: ["profile-favorites", favoritesPage],
    queryFn: () => authApi.getFavorites(favoritesPage),
    enabled: isAuthenticated && shouldLoadFavorites,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["profile-reviews", reviewsPage],
    queryFn: () => authApi.getMyReviews(reviewsPage),
    enabled: isAuthenticated && shouldLoadReviews,
  });

  const { data: submissionsData } = useQuery({
    queryKey: ["profile-submissions", submissionsPage],
    queryFn: () => storyApi.getMySubmissions(submissionsPage),
    enabled: isAuthenticated && (activeSection === "creator" || activeSection === "overview"),
    refetchOnWindowFocus: true,
    refetchInterval: activeSection === "creator" ? 10000 : false,
  });

  const { data: genreOptions } = useQuery({
    queryKey: ["genres"],
    queryFn: storyApi.getGenres,
    enabled: isAuthenticated && activeSection === "creator",
  });

  const { data: activeSubmissionData } = useQuery({
    queryKey: ["profile-submission", activeSubmissionId],
    queryFn: () => storyApi.getMySubmission(activeSubmissionId!),
    enabled: isAuthenticated && activeSubmissionId !== null && (showSubmissionViewModal || showSubmissionEditModal),
  });

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username || "");
    setDisplayName(profile.display_name || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatar_url || "");
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    try {
      const raw = window.localStorage.getItem(`submission-note-seen:${profile.id}`);
      if (!raw) {
        setSeenSubmissionNotes({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<number, string>;
      setSeenSubmissionNotes(parsed || {});
    } catch {
      setSeenSubmissionNotes({});
    }
  }, [profile]);

  const stats = useMemo(
    () => [
      {
        key: "favorites",
        icon: Heart,
        value: profile?.favorites_count || 0,
        label: "Favorites",
        color: "text-red-500",
      },
      {
        key: "reviews",
        icon: MessageSquare,
        value: profile?.reviews_count || 0,
        label: "Reviews",
        color: "text-blue-500",
      },
      {
        key: "reading",
        icon: BookMarked,
        value: profile?.reading_in_progress_count || 0,
        label: "Reading In Progress",
        color: "text-emerald-500",
      },
      {
        key: "listening",
        icon: Headphones,
        value: profile?.listening_in_progress_count || 0,
        label: "Listening In Progress",
        color: "text-purple-500",
      },
    ],
    [profile]
  );

  const onSaveProfile = async () => {
    setSaveError("");
    setSaveLoading(true);
    try {
      await authApi.updateMe({
        username: username.trim(),
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ["profile-me"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile.";
      setSaveError(message);
    } finally {
      setSaveLoading(false);
    }
  };

  const normalizeGenreIds = (value: Array<number | { id: number; name?: string }> | undefined) => {
    if (!value) return [];
    return value.map((item) => (typeof item === "number" ? item : item.id)).filter((id) => Number.isFinite(id));
  };

  const openSubmissionView = async (id: number) => {
    setSubmissionModalLoading(true);
    setActiveSubmissionId(id);
    try {
      await queryClient.fetchQuery({
        queryKey: ["profile-submission", id],
        queryFn: () => storyApi.getMySubmission(id),
      });
      setShowSubmissionViewModal(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load submission.");
    } finally {
      setSubmissionModalLoading(false);
    }
  };

  const openSubmissionEdit = async (id: number) => {
    setSubmissionModalLoading(true);
    setActiveSubmissionId(id);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["profile-submission", id],
        queryFn: () => storyApi.getMySubmission(id),
      });
      if (data.status !== "requires_edit") {
        toast.info("You can edit only submissions marked Requires Edit.");
        return;
      }
      setSubmissionTitle(data.title || "");
      setSubmissionAbout(data.about || "");
      setSubmissionStoryType(data.story_type || "Short Story");
      setSubmissionContent(data.content || "");
      setSubmissionCoverImage(data.cover_image || "");
      setSubmissionNotes(data.notes || "");
      setSubmissionGenres(normalizeGenreIds(data.genres as Array<number | { id: number; name?: string }>));
      setSubmissionCoverImageFile(null);
      setSubmissionPdfFile(null);
      setSubmissionEpubFile(null);
      setShowSubmissionEditModal(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load submission.");
    } finally {
      setSubmissionModalLoading(false);
    }
  };

  const toggleSubmissionGenre = (genreId: number) => {
    setSubmissionGenres((current) =>
      current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId]
    );
  };

  const saveSubmissionEdit = async () => {
    if (!activeSubmissionId) return;
    if (!submissionTitle.trim() || !submissionAbout.trim() || !submissionContent.trim() || submissionGenres.length === 0) {
      toast.error("Please complete required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("title", submissionTitle.trim());
    formData.append("about", submissionAbout.trim());
    formData.append("story_type", submissionStoryType);
    formData.append("content", submissionContent);
    formData.append("cover_image", submissionCoverImage.trim());
    formData.append("notes", submissionNotes.trim());
    submissionGenres.forEach((genreId) => formData.append("genres", String(genreId)));
    if (submissionCoverImageFile) formData.append("cover_image_file", submissionCoverImageFile);
    if (submissionPdfFile) formData.append("pdf_file", submissionPdfFile);
    if (submissionEpubFile) formData.append("epub_file", submissionEpubFile);

    try {
      setSavingSubmission(true);
      await storyApi.updateMySubmission(activeSubmissionId, formData);
      toast.success("Submission updated.");
      setShowSubmissionEditModal(false);
      await queryClient.invalidateQueries({ queryKey: ["profile-submissions"] });
      await queryClient.invalidateQueries({ queryKey: ["profile-submission", activeSubmissionId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update submission.");
    } finally {
      setSavingSubmission(false);
    }
  };

  const deleteSubmission = async (id: number) => {
    try {
      setDeletingSubmission(true);
      await storyApi.deleteMySubmission(id);
      toast.success("Submission deleted.");
      if (activeSubmissionId === id) {
        setActiveSubmissionId(null);
        setShowSubmissionViewModal(false);
        setShowSubmissionEditModal(false);
      }
      setPendingDeleteSubmissionId(null);
      await queryClient.invalidateQueries({ queryKey: ["profile-submissions"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete submission.");
    } finally {
      setDeletingSubmission(false);
    }
  };

  const toggleCreateGenre = (genreId: number) => {
    setCreateGenres((current) =>
      current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId]
    );
  };

  const resetCreateSubmissionForm = () => {
    setCreateTitle("");
    setCreateAbout("");
    setCreateStoryType("Short Story");
    setCreateContent("");
    setCreateCoverImage("");
    setCreateNotes("");
    setCreateGenres([]);
    setCreateCoverImageFile(null);
    setCreatePdfFile(null);
    setCreateEpubFile(null);
    if (createContentEditorRef.current) {
      createContentEditorRef.current.innerHTML = "";
    }
  };

  const syncCreateEditorContent = () => {
    setCreateContent(createContentEditorRef.current?.innerHTML || "");
  };

  const syncEditEditorContent = () => {
    setSubmissionContent(editContentEditorRef.current?.innerHTML || "");
  };

  const runEditorCommand = (
    editorRef: RefObject<HTMLDivElement>,
    syncFn: () => void,
    command: string,
    value?: string
  ) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncFn();
  };

  const addEditorLink = (editorRef: RefObject<HTMLDivElement>, syncFn: () => void) => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runEditorCommand(editorRef, syncFn, "createLink", url);
  };

  const createSubmission = async () => {
    if (!createTitle.trim() || !createAbout.trim() || !createContent.trim() || createGenres.length === 0) {
      toast.error("Please complete required fields.");
      return;
    }
    const formData = new FormData();
    formData.append("title", createTitle.trim());
    formData.append("about", createAbout.trim());
    formData.append("story_type", createStoryType);
    formData.append("content", createContent);
    if (createCoverImage.trim()) formData.append("cover_image", createCoverImage.trim());
    if (createNotes.trim()) formData.append("notes", createNotes.trim());
    createGenres.forEach((genreId) => formData.append("genres", String(genreId)));
    if (createCoverImageFile) formData.append("cover_image_file", createCoverImageFile);
    if (createPdfFile) formData.append("pdf_file", createPdfFile);
    if (createEpubFile) formData.append("epub_file", createEpubFile);

    try {
      setCreatingSubmission(true);
      await storyApi.createSubmission(formData);
      toast.success("Submission created.");
      setShowCreateSubmissionForm(false);
      resetCreateSubmissionForm();
      await queryClient.invalidateQueries({ queryKey: ["profile-submissions"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create submission.");
    } finally {
      setCreatingSubmission(false);
    }
  };

  useEffect(() => {
    if (showCreateSubmissionForm && createContentEditorRef.current) {
      createContentEditorRef.current.innerHTML = createContent || "";
    }
  }, [showCreateSubmissionForm]);

  useEffect(() => {
    if (showSubmissionEditModal && editContentEditorRef.current) {
      editContentEditorRef.current.innerHTML = submissionContent || "";
    }
  }, [showSubmissionEditModal]);

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void
  ) => {
    if (!totalPages || totalPages <= 1) return null;
    return (
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Next
        </Button>
      </div>
    );
  };

  const renderSubmissionStatus = (status: string) => {
    if (status === "approved") {
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
    }
    if (status === "requires_edit") {
      return <Badge className="bg-amber-600 hover:bg-amber-600">Requires Edit</Badge>;
    }
    if (status === "rejected") {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="secondary">Pending Review</Badge>;
  };

  const readerNavItems: Array<{ key: ReaderView; label: string }> = [
    { key: "reading", label: "Continue Reading" },
    { key: "completed", label: "Completed" },
    { key: "listening", label: "Continue Listening" },
    { key: "favorites", label: "Favorites" },
    { key: "reviews", label: "Reviews" },
  ];

  const profileNavItems: Array<{ key: ProfileSection; label: string; icon: typeof LayoutGrid; helper: string }> = [
    { key: "overview", label: "Overview", icon: LayoutGrid, helper: "General account summary." },
    { key: "reader", label: "Reader", icon: BookMarked, helper: "Reading, listening, favorites and reviews." },
    { key: "creator", label: "Creator", icon: FileText, helper: "Story submissions and moderation status." },
    { key: "settings", label: "Settings", icon: Settings, helper: "Manage profile details and preferences." },
  ];

  const getSubmissionNoteSignature = (item: { reviewer_notes: string | null; updated_at: string; status: string }) =>
    `${item.status}|${item.updated_at}|${item.reviewer_notes || ""}`;

  const noteSubmissions = useMemo(
    () =>
      (submissionsData?.results || []).filter(
        (item) =>
          Boolean(item.reviewer_notes?.trim()) &&
          (item.status === "pending" || item.status === "requires_edit" || item.status === "rejected")
      ),
    [submissionsData]
  );

  const unreadNoteCount = useMemo(
    () =>
      noteSubmissions.filter(
        (item) => seenSubmissionNotes[item.id] !== getSubmissionNoteSignature(item)
      ).length,
    [noteSubmissions, seenSubmissionNotes]
  );

  const markAllSubmissionNotesRead = () => {
    if (!profile) return;
    const nextMap = { ...seenSubmissionNotes };
    noteSubmissions.forEach((item) => {
      nextMap[item.id] = getSubmissionNoteSignature(item);
    });
    setSeenSubmissionNotes(nextMap);
    try {
      window.localStorage.setItem(`submission-note-seen:${profile.id}`, JSON.stringify(nextMap));
    } catch {
      // no-op
    }
  };

  const markSubmissionNoteRead = (item: { id: number; reviewer_notes: string | null; updated_at: string; status: string }) => {
    if (!profile) return;
    const signature = getSubmissionNoteSignature(item);
    const nextMap = { ...seenSubmissionNotes, [item.id]: signature };
    setSeenSubmissionNotes(nextMap);
    try {
      window.localStorage.setItem(`submission-note-seen:${profile.id}`, JSON.stringify(nextMap));
    } catch {
      // no-op
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>{" "}
              to view and manage your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !profile) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-6">
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback>
              {(profile.display_name || profile.username || profile.email || "U")
                .slice(0, 1)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <p className="text-xs text-muted-foreground">
              Joined {new Date(profile.date_joined).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline">@{profile.username}</Badge>
        </div>

        <Card className="mb-4 lg:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Modules</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {profileNavItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.key;
                return (
                  <Button
                    key={item.key}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="shrink-0 gap-2"
                    onClick={() => setActiveSection(item.key)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="hidden space-y-3 lg:block">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {profileNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`w-full rounded-md border px-3 py-2 text-left transition ${
                        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                      onClick={() => setActiveSection(item.key)}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </div>
                      <p className={`mt-1 text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {item.helper}
                      </p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-4">
            {activeSection === "overview" && (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {stats.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Card key={item.key} className="shadow-sm">
                        <CardContent className="flex items-center gap-3 p-4">
                          <Icon className={`h-5 w-5 ${item.color}`} />
                          <div>
                            <p className="text-lg font-semibold">{item.value}</p>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Reader Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Continue Reading</span>
                        <span className="font-medium">{profile.reading_in_progress_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Continue Listening</span>
                        <span className="font-medium">{profile.listening_in_progress_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Completed</span>
                        <span className="font-medium">{completedData?.pagination?.count || 0}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveSection("reader")}>
                        Open Reader
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Creator Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Submissions</span>
                        <span className="font-medium">{submissionsData?.pagination?.count || 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Recent statuses</p>
                      <div className="flex flex-wrap gap-2">
                        {(submissionsData?.results || []).slice(0, 3).map((item) => (
                          <span key={item.id}>{renderSubmissionStatus(item.status)}</span>
                        ))}
                        {(submissionsData?.results?.length || 0) === 0 && (
                          <span className="text-xs text-muted-foreground">No submissions yet</span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveSection("creator")}>
                        Open Creator
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Settings Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Username</span>
                        <span className="font-medium">@{profile.username}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted-foreground">Display Name</span>
                        <span className="line-clamp-1 font-medium">{profile.display_name || "-"}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted-foreground">Bio</span>
                        <span className="line-clamp-1 font-medium">{profile.bio || "-"}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveSection("settings")}>
                        Open Settings
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {activeSection === "reader" && (
              <>
                <Card>
                <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-wrap gap-2 rounded-xl border bg-muted/30 p-2">
                      {readerNavItems.map((item) => (
                        <Button
                          key={item.key}
                          size="sm"
                          variant={activeReaderView === item.key ? "default" : "outline"}
                          onClick={() => setActiveReaderView(item.key)}
                          className={activeReaderView === item.key ? "shadow-sm" : ""}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {activeReaderView === "reading" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(readingData?.results || []).map((item) => (
                        <div key={`${item.story.id}-${item.chapter_slug}`} className="rounded-md border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{item.story.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(item.overall_progress * 100)}% complete
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.chapter_title || "Current chapter"}
                          </p>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.round(item.overall_progress * 100)}%` }}
                            />
                          </div>
                          {item.chapter_slug ? (
                            <Link to={`/read/${item.story.slug}/${item.chapter_slug}`}>
                              <Button size="sm" className="mt-3">Continue Reading</Button>
                            </Link>
                          ) : (
                            <Button size="sm" className="mt-3" variant="outline" disabled>
                              Continue Reading
                            </Button>
                          )}
                        </div>
                      ))}
                      {(readingData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No reading progress available.</p>
                      )}
                      {renderPagination(
                        readingData?.pagination?.page || 1,
                        readingData?.pagination?.pages || 1,
                        setReadingPage
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeReaderView === "completed" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(completedData?.results || []).map((item) => (
                        <div key={`${item.story.id}-${item.updated_at}`} className="rounded-md border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{item.story.title}</p>
                            <p className="text-sm text-emerald-600">100% complete</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Completed {new Date(item.updated_at).toLocaleDateString()}
                          </p>
                          <Link to={`/story/${item.story.slug}/`}>
                            <Button size="sm" className="mt-3" variant="outline">
                              View Story
                            </Button>
                          </Link>
                        </div>
                      ))}
                      {(completedData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No completed stories available.</p>
                      )}
                      {renderPagination(
                        completedData?.pagination?.page || 1,
                        completedData?.pagination?.pages || 1,
                        setCompletedPage
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeReaderView === "listening" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(listeningData?.results || []).map((item) => (
                        <div key={`${item.story.id}-${item.audio_slug}`} className="rounded-md border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{item.story.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(item.overall_progress * 100)}% complete
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.audio_title || "Current audio"}
                          </p>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.round(item.overall_progress * 100)}%` }}
                            />
                          </div>
                          {item.audio_slug ? (
                            <Link to={`/listen/${item.story.slug}/${item.audio_slug}`}>
                              <Button size="sm" className="mt-3">Continue Listening</Button>
                            </Link>
                          ) : (
                            <Button size="sm" className="mt-3" variant="outline" disabled>
                              Continue Listening
                            </Button>
                          )}
                        </div>
                      ))}
                      {(listeningData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No listening progress available.</p>
                      )}
                      {renderPagination(
                        listeningData?.pagination?.page || 1,
                        listeningData?.pagination?.pages || 1,
                        setListeningPage
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeReaderView === "favorites" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(favoritesData?.results || []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-md border p-4">
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium">{item.story.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/story/${item.story.slug}/`)}>
                            View
                          </Button>
                        </div>
                      ))}
                      {(favoritesData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No favorites yet.</p>
                      )}
                      {renderPagination(
                        favoritesData?.pagination?.page || 1,
                        favoritesData?.pagination?.pages || 1,
                        setFavoritesPage
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeReaderView === "reviews" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(reviewsData?.results || []).map((item) => (
                        <div key={item.id} className="rounded-md border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="line-clamp-1 font-medium">{item.story.title}</p>
                            <p className="text-sm text-muted-foreground">{item.rating}/5</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.comment || "No review comment."}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Updated {new Date(item.updated_at).toLocaleDateString()}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => navigate(`/story/${item.story.slug}/`)}
                          >
                            Open Story
                          </Button>
                        </div>
                      ))}
                      {(reviewsData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No reviews yet.</p>
                      )}
                      {renderPagination(
                        reviewsData?.pagination?.page || 1,
                        reviewsData?.pagination?.pages || 1,
                        setReviewsPage
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {activeSection === "creator" && (
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle>Creator Submissions</CardTitle>
                    <Button onClick={() => setShowCreateSubmissionForm((v) => !v)}>
                      {showCreateSubmissionForm ? "Close Form" : "Submit New Story"}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    {noteSubmissions.length > 0 && (
                      <Card className="border-l-4 border-l-amber-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Bell className="h-4 w-4 text-amber-600" />
                            Reviewer Notifications
                          </CardTitle>
                          {unreadNoteCount > 0 && (
                            <Button size="sm" variant="outline" onClick={markAllSubmissionNotesRead}>
                              Mark All Read ({unreadNoteCount})
                            </Button>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          {noteSubmissions.slice(0, 3).map((item) => {
                            const isUnread = seenSubmissionNotes[item.id] !== getSubmissionNoteSignature(item);
                            return (
                              <div key={item.id} className="rounded-md border bg-amber-50/50 px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-medium">{item.title}</p>
                                  <div className="flex items-center gap-2">
                                    {isUnread && <Badge variant="destructive" className="h-5 px-2 text-[10px]">New note</Badge>}
                                    {renderSubmissionStatus(item.status)}
                                  </div>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {item.reviewer_notes}
                                </p>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {showCreateSubmissionForm && (
                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-base">New Submission</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="create-submission-title">Title *</Label>
                            <Input
                              id="create-submission-title"
                              value={createTitle}
                              onChange={(e) => setCreateTitle(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="create-submission-about">About *</Label>
                            <Textarea
                              id="create-submission-about"
                              value={createAbout}
                              onChange={(e) => setCreateAbout(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Story Type *</Label>
                            <Select value={createStoryType} onValueChange={setCreateStoryType}>
                              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {storyTypes.map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="create-submission-content">Content *</Label>
                            <div className="mt-2 space-y-2">
                              <div className="flex flex-wrap gap-2 rounded-md border p-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(createContentEditorRef, syncCreateEditorContent, "bold")}><Bold className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(createContentEditorRef, syncCreateEditorContent, "italic")}><Italic className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(createContentEditorRef, syncCreateEditorContent, "underline")}><Underline className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(createContentEditorRef, syncCreateEditorContent, "formatBlock", "h2")}><Heading2 className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(createContentEditorRef, syncCreateEditorContent, "insertUnorderedList")}><List className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(createContentEditorRef, syncCreateEditorContent, "insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => addEditorLink(createContentEditorRef, syncCreateEditorContent)}><Link2 className="h-4 w-4" /></Button>
                              </div>
                              <div
                                id="create-submission-content"
                                ref={createContentEditorRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={syncCreateEditorContent}
                                className="min-h-40 rounded-md border bg-background p-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Genres *</Label>
                            <div className="mt-2 grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
                              {(genreOptions || []).map((genre) => (
                                <label key={genre.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                                  <Checkbox
                                    checked={createGenres.includes(genre.id)}
                                    onCheckedChange={() => toggleCreateGenre(genre.id)}
                                  />
                                  <span className="text-sm">{genre.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="create-submission-cover-url">Cover Image URL</Label>
                            <Input
                              id="create-submission-cover-url"
                              value={createCoverImage}
                              onChange={(e) => setCreateCoverImage(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                              <Label htmlFor="create-submission-cover-file">Cover File</Label>
                              <Input
                                id="create-submission-cover-file"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setCreateCoverImageFile(e.target.files?.[0] || null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="create-submission-pdf-file">PDF File</Label>
                              <Input
                                id="create-submission-pdf-file"
                                type="file"
                                accept="application/pdf,.pdf"
                                onChange={(e) => setCreatePdfFile(e.target.files?.[0] || null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="create-submission-epub-file">EPUB File</Label>
                              <Input
                                id="create-submission-epub-file"
                                type="file"
                                accept=".epub,application/epub+zip"
                                onChange={(e) => setCreateEpubFile(e.target.files?.[0] || null)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="create-submission-notes">Notes</Label>
                            <Textarea
                              id="create-submission-notes"
                              value={createNotes}
                              onChange={(e) => setCreateNotes(e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                resetCreateSubmissionForm();
                                setShowCreateSubmissionForm(false);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="button" onClick={createSubmission} disabled={creatingSubmission}>
                              {creatingSubmission ? "Submitting..." : "Submit"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {showSubmissionEditModal && (
                      <Card className="border-dashed">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="text-base">Edit Submission</CardTitle>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSubmissionEditModal(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label htmlFor="submission-title">Title *</Label>
                            <Input id="submission-title" value={submissionTitle} onChange={(e) => setSubmissionTitle(e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="submission-about">About *</Label>
                            <Textarea id="submission-about" value={submissionAbout} onChange={(e) => setSubmissionAbout(e.target.value)} />
                          </div>
                          <div>
                            <Label>Story Type *</Label>
                            <Select value={submissionStoryType} onValueChange={setSubmissionStoryType}>
                              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {storyTypes.map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="submission-content">Content *</Label>
                            <div className="mt-2 space-y-2">
                              <div className="flex flex-wrap gap-2 rounded-md border p-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(editContentEditorRef, syncEditEditorContent, "bold")}><Bold className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(editContentEditorRef, syncEditEditorContent, "italic")}><Italic className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(editContentEditorRef, syncEditEditorContent, "underline")}><Underline className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(editContentEditorRef, syncEditEditorContent, "formatBlock", "h2")}><Heading2 className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(editContentEditorRef, syncEditEditorContent, "insertUnorderedList")}><List className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(editContentEditorRef, syncEditEditorContent, "insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => addEditorLink(editContentEditorRef, syncEditEditorContent)}><Link2 className="h-4 w-4" /></Button>
                              </div>
                              <div
                                id="submission-content"
                                ref={editContentEditorRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={syncEditEditorContent}
                                className="min-h-40 rounded-md border bg-background p-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="submission-cover-url">Cover Image URL</Label>
                            <Input
                              id="submission-cover-url"
                              value={submissionCoverImage}
                              onChange={(e) => setSubmissionCoverImage(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                              <Label htmlFor="submission-cover-file">Cover File</Label>
                              <Input
                                id="submission-cover-file"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setSubmissionCoverImageFile(e.target.files?.[0] || null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="submission-pdf-file">PDF File</Label>
                              <Input
                                id="submission-pdf-file"
                                type="file"
                                accept="application/pdf,.pdf"
                                onChange={(e) => setSubmissionPdfFile(e.target.files?.[0] || null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="submission-epub-file">EPUB File</Label>
                              <Input
                                id="submission-epub-file"
                                type="file"
                                accept=".epub,application/epub+zip"
                                onChange={(e) => setSubmissionEpubFile(e.target.files?.[0] || null)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Genres *</Label>
                            <div className="mt-2 grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
                              {(genreOptions || []).map((genre) => (
                                <label key={genre.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                                  <Checkbox
                                    checked={submissionGenres.includes(genre.id)}
                                    onCheckedChange={() => toggleSubmissionGenre(genre.id)}
                                  />
                                  <span className="text-sm">{genre.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="submission-notes">Notes</Label>
                            <Textarea
                              id="submission-notes"
                              value={submissionNotes}
                              onChange={(e) => setSubmissionNotes(e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowSubmissionEditModal(false)}>
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={saveSubmissionEdit}
                              disabled={savingSubmission || activeSubmissionData?.status !== "requires_edit"}
                            >
                              {savingSubmission ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {(submissionsData?.results || []).map((item) => (
                      <div key={item.id} className="rounded-md border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-medium">{item.title}</p>
                          <div className="flex items-center gap-2">
                            {seenSubmissionNotes[item.id] !== getSubmissionNoteSignature(item) &&
                              Boolean(item.reviewer_notes?.trim()) &&
                              (item.status === "pending" || item.status === "requires_edit" || item.status === "rejected") && (
                                <Badge variant="destructive" className="h-5 px-2 text-[10px]">New note</Badge>
                              )}
                            {renderSubmissionStatus(item.status)}
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">Type: {item.story_type}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted {new Date(item.created_at).toLocaleDateString()}
                        </p>
                        {item.reviewer_notes && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Reviewer note: {item.reviewer_notes}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submissionModalLoading}
                            onClick={() => {
                              markSubmissionNoteRead(item);
                              openSubmissionView(item.id);
                            }}
                          >
                            View
                          </Button>
                          {item.status === "requires_edit" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={submissionModalLoading}
                              onClick={() => {
                                markSubmissionNoteRead(item);
                                openSubmissionEdit(item.id);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={item.status === "approved"}
                            onClick={() => setPendingDeleteSubmissionId(item.id)}
                          >
                            Delete
                          </Button>
                        </div>
                        {item.status === "approved" && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Approved submissions are locked and cannot be edited or deleted.
                          </p>
                        )}
                      </div>
                    ))}
                    {(submissionsData?.results?.length || 0) === 0 && (
                      <p className="text-sm text-muted-foreground">No submissions yet.</p>
                    )}
                    {renderPagination(
                      submissionsData?.pagination?.page || 1,
                      submissionsData?.pagination?.pages || 1,
                      setSubmissionsPage
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === "settings" && (
              <Card className="shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <p className="font-medium">Profile Settings</p>
                  </div>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm">Username</label>
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Display Name</label>
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Avatar URL</label>
                    <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
                  </div>
                <div>
                  <label className="mb-1 block text-sm">Bio</label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
                {profile.is_superuser && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="mb-2 text-sm font-medium">Content Management</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/admin")}
                    >
                      Open Admin Panel
                    </Button>
                  </div>
                )}
                {saveError && <p className="text-sm text-red-500">{saveError}</p>}
                <Button onClick={onSaveProfile} disabled={saveLoading}>
                  {saveLoading ? "Saving..." : "Save Changes"}
                </Button>
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        {showSubmissionViewModal && activeSubmissionData && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowSubmissionViewModal(false)}
          >
            <Card
              className="max-h-[90vh] w-full max-w-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{activeSubmissionData.title}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSubmissionViewModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="max-h-[75vh] space-y-3 overflow-y-auto">
                <div className="flex flex-wrap items-center gap-2">
                  {renderSubmissionStatus(activeSubmissionData.status)}
                  <span className="text-sm text-muted-foreground">Type: {activeSubmissionData.story_type}</span>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">About</p>
                  <p className="rounded-md border bg-muted/30 p-3 text-sm">{activeSubmissionData.about || "-"}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Content</p>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    {activeSubmissionData.content ? (
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: activeSubmissionData.content }}
                      />
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">PDF</p>
                    {activeSubmissionData.pdf_file ? (
                      <a className="text-sm text-primary hover:underline" href={activeSubmissionData.pdf_file} target="_blank" rel="noreferrer">Open PDF</a>
                    ) : <p className="text-sm">-</p>}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">EPUB</p>
                    {activeSubmissionData.epub_file ? (
                      <a className="text-sm text-primary hover:underline" href={activeSubmissionData.epub_file} target="_blank" rel="noreferrer">Open EPUB</a>
                    ) : <p className="text-sm">-</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {pendingDeleteSubmissionId !== null && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setPendingDeleteSubmissionId(null)}
          >
            <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle className="text-base">Delete Submission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this submission? This cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setPendingDeleteSubmissionId(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deletingSubmission}
                    onClick={() => deleteSubmission(pendingDeleteSubmissionId)}
                  >
                    {deletingSubmission ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
