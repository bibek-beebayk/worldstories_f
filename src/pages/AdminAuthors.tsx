import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { AdminAuthor } from "@/api/types";

const AdminAuthors = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const { data: authors, isLoading: authorsLoading } = useQuery({
    queryKey: ["admin-authors"],
    queryFn: storyApi.getAdminAuthors,
    enabled: isAuthenticated && isSuperuser,
  });

  const [searchInput, setSearchInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AdminAuthor | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDeleteAuthor, setPendingDeleteAuthor] = useState<AdminAuthor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredAuthors = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return authors || [];
    return (authors || []).filter(
      (author) =>
        author.name.toLowerCase().includes(query) || (author.bio || "").toLowerCase().includes(query)
    );
  }, [authors, searchInput]);

  const openCreateModal = () => {
    setEditingAuthor(null);
    setName("");
    setBio("");
    setImage("");
    setShowModal(true);
  };

  const openEditModal = (author: AdminAuthor) => {
    setEditingAuthor(author);
    setName(author.name);
    setBio(author.bio || "");
    setImage(author.image || "");
    setShowModal(true);
  };

  const saveAuthor = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const payload = { name: name.trim(), bio: bio.trim(), image: image.trim() };
    try {
      setSaving(true);
      if (editingAuthor) {
        await storyApi.updateAdminAuthor(editingAuthor.id, payload);
        toast.success("Author updated.");
      } else {
        await storyApi.createAdminAuthor(payload);
        toast.success("Author created.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-authors"] });
      setShowModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save author.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAuthor = async () => {
    if (!pendingDeleteAuthor) return;
    try {
      setDeleting(true);
      await storyApi.deleteAdminAuthor(pendingDeleteAuthor.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-authors"] });
      toast.success("Author deleted.");
      setPendingDeleteAuthor(null);
    } catch (error) {
      // Backend blocks deletion (400) while the author still has stories
      // assigned — that message is surfaced here verbatim rather than a
      // generic fallback, since it tells the admin exactly what to do next.
      toast.error(error instanceof Error ? error.message : "Failed to delete author.");
    } finally {
      setDeleting(false);
    }
  };

  if (meLoading) {
    return <FullScreenLoader />;
  }

  if (!isSuperuser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Authors</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Access denied. Superuser privileges are required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Authors</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the author directory shown on story pages and the public Authors listing.
            </p>
          </div>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="mr-1 h-4 w-4" />
            New Author
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search authors"
              className="pl-8"
            />
          </div>

          {authorsLoading ? (
            <p className="text-sm text-muted-foreground">Loading authors...</p>
          ) : filteredAuthors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchInput.trim() ? "No authors match your search." : "No authors yet — create the first one."}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {filteredAuthors.map((author) => (
                <div key={author.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={author.image || ""} />
                      <AvatarFallback>{author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{author.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {author.stories_count ?? 0} {author.stories_count === 1 ? "story" : "stories"}
                      </p>
                      {author.bio && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{author.bio}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditModal(author)}
                      aria-label={`Edit ${author.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDeleteAuthor(author)}
                      aria-label={`Delete ${author.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">{editingAuthor ? "Edit Author" : "Create Author"}</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveAuthor}>
                <div>
                  <Label htmlFor="author-name">Name *</Label>
                  <Input id="author-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <div>
                  <Label htmlFor="author-image">Image URL</Label>
                  <Input id="author-image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="author-bio">Bio</Label>
                  <Textarea id="author-bio" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-24" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !name.trim()}>
                    {saving ? "Saving..." : editingAuthor ? "Save Changes" : "Create Author"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {pendingDeleteAuthor && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteAuthor(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Author</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete "{pendingDeleteAuthor.name}"?
                {pendingDeleteAuthor.stories_count
                  ? " This author still has stories assigned — deletion will be blocked until those are reassigned or removed."
                  : " This action cannot be undone."}
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteAuthor(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deleting} onClick={deleteAuthor}>
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminAuthors;
