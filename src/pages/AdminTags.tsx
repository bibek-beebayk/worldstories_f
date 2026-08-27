import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { AdminTag } from "@/api/types";

const AdminTags = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ["admin-tags"],
    queryFn: storyApi.getAdminTags,
    enabled: isAuthenticated && isSuperuser,
  });

  const [searchInput, setSearchInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<AdminTag | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDeleteTag, setPendingDeleteTag] = useState<AdminTag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredTags = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return tags || [];
    return (tags || []).filter((tag) => tag.name.toLowerCase().includes(query));
  }, [tags, searchInput]);

  const openCreateModal = () => {
    setEditingTag(null);
    setName("");
    setShowModal(true);
  };

  const openEditModal = (tag: AdminTag) => {
    setEditingTag(tag);
    setName(tag.name);
    setShowModal(true);
  };

  const saveTag = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      if (editingTag) {
        await storyApi.updateAdminTag(editingTag.id, name.trim());
        toast.success("Tag updated.");
      } else {
        await storyApi.createAdminTag(name.trim());
        toast.success("Tag created.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      setShowModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save tag.");
    } finally {
      setSaving(false);
    }
  };

  const deleteTag = async () => {
    if (!pendingDeleteTag) return;
    try {
      setDeleting(true);
      await storyApi.deleteAdminTag(pendingDeleteTag.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      toast.success("Tag deleted.");
      setPendingDeleteTag(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete tag.");
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
          <CardTitle className="text-lg">Tags</CardTitle>
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
            <CardTitle className="text-lg">Tags</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Search-phrase keywords (e.g. "Indian Folklore") — each tag with published stories gets its own
              /tag/&lt;slug&gt; landing page.
            </p>
          </div>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="mr-1 h-4 w-4" />
            New Tag
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tags"
              className="pl-8"
            />
          </div>

          {tagsLoading ? (
            <p className="text-sm text-muted-foreground">Loading tags...</p>
          ) : filteredTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchInput.trim() ? "No tags match your search." : "No tags yet — create the first one."}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{tag.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tag.stories_count ?? 0} {tag.stories_count === 1 ? "story" : "stories"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditModal(tag)}
                      aria-label={`Edit ${tag.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDeleteTag(tag)}
                      aria-label={`Delete ${tag.name}`}
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
              <CardTitle className="text-base">{editingTag ? "Edit Tag" : "Create Tag"}</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveTag}>
                <div>
                  <Label htmlFor="tag-name">Name *</Label>
                  <Input id="tag-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !name.trim()}>
                    {saving ? "Saving..." : editingTag ? "Save Changes" : "Create Tag"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {pendingDeleteTag && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteTag(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Tag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete "{pendingDeleteTag.name}"? Stories with this tag won't be deleted — the tag will just
                be removed from them, and its /tag/&lt;slug&gt; page will stop existing. This action cannot be
                undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteTag(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deleting} onClick={deleteTag}>
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

export default AdminTags;
