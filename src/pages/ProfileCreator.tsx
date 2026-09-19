import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import ProfilePagination from "@/components/profile/ProfilePagination";
import SubmissionStatusBadge from "@/components/profile/SubmissionStatusBadge";
import { storyApi } from "@/api/story";
import { useStoryTypes } from "@/hooks/useStoryTypes";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
  X,
} from "lucide-react";
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { buildMeta } from "@/lib/buildMeta";
import type { ProfileOutletContext } from "@/layouts/ProfileShellLayout";

export function meta() {
  return buildMeta({
    title: "Creator | Your Profile | WorldStories",
    path: "/profile/creator",
    noIndex: true,
  });
}

const getSubmissionNoteSignature = (item: { reviewer_notes: string | null; updated_at: string; status: string }) =>
  `${item.status}|${item.updated_at}|${item.reviewer_notes || ""}`;

const normalizeGenreIds = (value: Array<number | { id: number; name?: string }> | undefined) => {
  if (!value) return [];
  return value.map((item) => (typeof item === "number" ? item : item.id)).filter((id) => Number.isFinite(id));
};

const ProfileCreator = () => {
  const isAuthenticated = useIsLoggedIn();
  const { profile } = useOutletContext<ProfileOutletContext>();
  const queryClient = useQueryClient();

  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [seenSubmissionNotes, setSeenSubmissionNotes] = useState<Record<number, string>>({});

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

  const createContentEditorRef = useRef<HTMLDivElement | null>(null);
  const editContentEditorRef = useRef<HTMLDivElement | null>(null);

  const { data: submissionsData } = useQuery({
    queryKey: ["profile-submissions", submissionsPage],
    queryFn: () => storyApi.getMySubmissions(submissionsPage),
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const { data: genreOptions } = useQuery({
    queryKey: ["genres"],
    queryFn: storyApi.getGenres,
    enabled: isAuthenticated,
  });

  const { data: storyTypes } = useStoryTypes();

  const { data: activeSubmissionData } = useQuery({
    queryKey: ["profile-submission", activeSubmissionId],
    queryFn: () => storyApi.getMySubmission(activeSubmissionId!),
    enabled: isAuthenticated && activeSubmissionId !== null && (showSubmissionViewModal || showSubmissionEditModal),
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`submission-note-seen:${profile.id}`);
      if (!raw) {
        setSeenSubmissionNotes({});
        return;
      }
      setSeenSubmissionNotes((JSON.parse(raw) as Record<number, string>) || {});
    } catch {
      setSeenSubmissionNotes({});
    }
  }, [profile.id]);

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
    () => noteSubmissions.filter((item) => seenSubmissionNotes[item.id] !== getSubmissionNoteSignature(item)).length,
    [noteSubmissions, seenSubmissionNotes]
  );

  const markAllSubmissionNotesRead = () => {
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
    const signature = getSubmissionNoteSignature(item);
    const nextMap = { ...seenSubmissionNotes, [item.id]: signature };
    setSeenSubmissionNotes(nextMap);
    try {
      window.localStorage.setItem(`submission-note-seen:${profile.id}`, JSON.stringify(nextMap));
    } catch {
      // no-op
    }
  };

  const openSubmissionView = async (id: number) => {
    setSubmissionModalLoading(true);
    setActiveSubmissionId(id);
    try {
      await queryClient.fetchQuery({ queryKey: ["profile-submission", id], queryFn: () => storyApi.getMySubmission(id) });
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
      const data = await queryClient.fetchQuery({ queryKey: ["profile-submission", id], queryFn: () => storyApi.getMySubmission(id) });
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
    setSubmissionGenres((current) => (current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId]));
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
    setCreateGenres((current) => (current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId]));
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

  const syncCreateEditorContent = () => setCreateContent(createContentEditorRef.current?.innerHTML || "");
  const syncEditEditorContent = () => setSubmissionContent(editContentEditorRef.current?.innerHTML || "");

  const runEditorCommand = (editorRef: RefObject<HTMLDivElement>, syncFn: () => void, command: string, value?: string) => {
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
    // Seed once on open; state changes while typing must not reset the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateSubmissionForm]);

  useEffect(() => {
    if (showSubmissionEditModal && editContentEditorRef.current) {
      editContentEditorRef.current.innerHTML = submissionContent || "";
    }
    // Seed once on open; state changes while typing must not reset the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSubmissionEditModal]);

  return (
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
                          <SubmissionStatusBadge status={item.status} />
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.reviewer_notes}</p>
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
                  <Input id="create-submission-title" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="create-submission-about">About *</Label>
                  <Textarea id="create-submission-about" value={createAbout} onChange={(e) => setCreateAbout(e.target.value)} />
                </div>
                <div>
                  <Label>Story Type *</Label>
                  <Select value={createStoryType} onValueChange={setCreateStoryType}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(storyTypes || []).map((type) => (
                        <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
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
                      <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(createContentEditorRef, syncCreateEditorContent, "formatBlock", "h1")}><Heading1 className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(createContentEditorRef, syncCreateEditorContent, "formatBlock", "h2")}><Heading2 className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(createContentEditorRef, syncCreateEditorContent, "formatBlock", "h3")}><Heading3 className="h-4 w-4" /></Button>
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
                        <Checkbox checked={createGenres.includes(genre.id)} onCheckedChange={() => toggleCreateGenre(genre.id)} />
                        <span className="text-sm">{genre.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="create-submission-cover-url">Cover Image URL</Label>
                  <Input id="create-submission-cover-url" value={createCoverImage} onChange={(e) => setCreateCoverImage(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="create-submission-cover-file">Cover File</Label>
                    <Input id="create-submission-cover-file" type="file" accept="image/*" onChange={(e) => setCreateCoverImageFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label htmlFor="create-submission-pdf-file">PDF File</Label>
                    <Input id="create-submission-pdf-file" type="file" accept="application/pdf,.pdf" onChange={(e) => setCreatePdfFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label htmlFor="create-submission-epub-file">EPUB File</Label>
                    <Input id="create-submission-epub-file" type="file" accept=".epub,application/epub+zip" onChange={(e) => setCreateEpubFile(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="create-submission-notes">Notes</Label>
                  <Textarea id="create-submission-notes" value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} />
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
                      {(storyTypes || []).map((type) => (
                        <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
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
                      <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(editContentEditorRef, syncEditEditorContent, "formatBlock", "h1")}><Heading1 className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(editContentEditorRef, syncEditEditorContent, "formatBlock", "h2")}><Heading2 className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand(editContentEditorRef, syncEditEditorContent, "formatBlock", "h3")}><Heading3 className="h-4 w-4" /></Button>
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
                  <Input id="submission-cover-url" value={submissionCoverImage} onChange={(e) => setSubmissionCoverImage(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="submission-cover-file">Cover File</Label>
                    <Input id="submission-cover-file" type="file" accept="image/*" onChange={(e) => setSubmissionCoverImageFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label htmlFor="submission-pdf-file">PDF File</Label>
                    <Input id="submission-pdf-file" type="file" accept="application/pdf,.pdf" onChange={(e) => setSubmissionPdfFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label htmlFor="submission-epub-file">EPUB File</Label>
                    <Input id="submission-epub-file" type="file" accept=".epub,application/epub+zip" onChange={(e) => setSubmissionEpubFile(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <div>
                  <Label>Genres *</Label>
                  <div className="mt-2 grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
                    {(genreOptions || []).map((genre) => (
                      <label key={genre.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                        <Checkbox checked={submissionGenres.includes(genre.id)} onCheckedChange={() => toggleSubmissionGenre(genre.id)} />
                        <span className="text-sm">{genre.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="submission-notes">Notes</Label>
                  <Textarea id="submission-notes" value={submissionNotes} onChange={(e) => setSubmissionNotes(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowSubmissionEditModal(false)}>Cancel</Button>
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
                  <SubmissionStatusBadge status={item.status} />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Type: {item.story_type}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Submitted {new Date(item.created_at).toLocaleDateString()}
              </p>
              {item.reviewer_notes && (
                <p className="mt-2 text-sm text-muted-foreground">Reviewer note: {item.reviewer_notes}</p>
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
          <ProfilePagination
            page={submissionsData?.pagination?.page || 1}
            pages={submissionsData?.pagination?.pages || 1}
            onPageChange={setSubmissionsPage}
          />
        </CardContent>
      </Card>

      {showSubmissionViewModal && activeSubmissionData && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowSubmissionViewModal(false)}
        >
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{activeSubmissionData.title}</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSubmissionViewModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="max-h-[75vh] space-y-3 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-2">
                <SubmissionStatusBadge status={activeSubmissionData.status} />
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
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(activeSubmissionData.content) }}
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
                <Button type="button" variant="outline" onClick={() => setPendingDeleteSubmissionId(null)}>Cancel</Button>
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
    </div>
  );
};

export default ProfileCreator;
