import { FormEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { useGenres } from "@/hooks/useGenres";
import { Link2, Bold, Italic, Underline, Heading2, List, ListOrdered } from "lucide-react";

const storyTypes = ["Short Story", "Novel", "Poetry", "Non Fiction"];

const Publish = () => {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(getAccessToken());
  const editorRef = useRef<HTMLDivElement>(null);
  const { data: genres } = useGenres();

  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");
  const [storyType, setStoryType] = useState("Short Story");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [coverImage, setCoverImage] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [contentHtml, setContentHtml] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length > 2 && about.trim().length > 10 && contentHtml.trim().length > 0 && selectedGenres.length > 0;
  }, [title, about, contentHtml, selectedGenres]);

  const syncEditorContent = () => {
    setContentHtml(editorRef.current?.innerHTML || "");
  };

  const runEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorContent();
  };

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runEditorCommand("createLink", url);
  };

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((current) =>
      current.includes(genreId)
        ? current.filter((id) => id !== genreId)
        : [...current, genreId]
    );
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) {
      toast.info("Please log in to submit a story.");
      navigate("/");
      return;
    }

    if (!canSubmit) {
      toast.error("Please complete all required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("about", about.trim());
    formData.append("story_type", storyType);
    formData.append("content", contentHtml);
    selectedGenres.forEach((genreId) => formData.append("genres", String(genreId)));

    if (coverImage.trim()) {
      formData.append("cover_image", coverImage.trim());
    }
    if (coverImageFile) {
      formData.append("cover_image_file", coverImageFile);
    }
    if (notes.trim()) {
      formData.append("notes", notes.trim());
    }
    if (pdfFile) {
      formData.append("pdf_file", pdfFile);
    }

    try {
      setIsSubmitting(true);
      await storyApi.createSubmission(formData);
      toast.success("Submission received. Your story is pending review.");
      setTitle("");
      setAbout("");
      setStoryType("Short Story");
      setSelectedGenres([]);
      setCoverImage("");
      setCoverImageFile(null);
      setNotes("");
      setPdfFile(null);
      setContentHtml("");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit story.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>You need to be logged in to submit stories.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Submit Your Story</h1>
        <p className="mt-2 text-muted-foreground">
          Stories are reviewed before publication. Submit complete details to speed up approval.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Story Basics</CardTitle>
            <CardDescription>Required fields are marked with *</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling story title"
                className="mt-2"
                maxLength={256}
                required
              />
            </div>

            <div>
              <Label htmlFor="about">Description / About *</Label>
              <Textarea
                id="about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="What is your story about?"
                className="mt-2 min-h-28"
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="story-type">Story Type *</Label>
                <Select value={storyType} onValueChange={setStoryType}>
                  <SelectTrigger id="story-type" className="mt-2">
                    <SelectValue placeholder="Select story type" />
                  </SelectTrigger>
                  <SelectContent>
                    {storyTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cover-image">Cover Image URL</Label>
                <Input
                  id="cover-image"
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cover-image-file">Cover Image Upload</Label>
              <Input
                id="cover-image-file"
                type="file"
                accept="image/*"
                className="mt-2"
                onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Optional. If uploaded, this image will be used as cover.
              </p>
            </div>

            <div>
              <Label>Genres *</Label>
              <div className="mt-2 grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
                {genres?.map((genre) => (
                  <label key={genre.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                    <Checkbox
                      checked={selectedGenres.includes(genre.id)}
                      onCheckedChange={() => toggleGenre(genre.id)}
                    />
                    <span className="text-sm">{genre.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Story Content *</CardTitle>
            <CardDescription>Use rich text formatting for better readability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 rounded-md border p-2">
              <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand("bold")}><Bold className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand("italic")}><Italic className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand("underline")}><Underline className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand("formatBlock", "h2")}><Heading2 className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand("insertUnorderedList")}><List className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="sm" onClick={() => runEditorCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="sm" onClick={addLink}><Link2 className="h-4 w-4" /></Button>
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncEditorContent}
              className="min-h-64 rounded-md border bg-background p-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-primary"
              aria-label="Story content editor"
            />
            <p className="text-xs text-muted-foreground">
              Tip: paste from external editors as plain text when possible.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optional Attachments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pdf-file">PDF File (optional)</Label>
              <Input
                id="pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                className="mt-2"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
              <p className="mt-1 text-xs text-muted-foreground">Attach a draft manuscript if needed.</p>
            </div>

            <div>
              <Label htmlFor="notes">Notes for reviewer</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the reviewer should know (optional)"
                className="mt-2 min-h-24"
              />
            </div>
          </CardContent>
        </Card>

        <Separator />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Your story will remain in pending state until reviewed by admin.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
};

export default Publish;
