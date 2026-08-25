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
import { StoryType } from "@/api/types";

const AdminStoryTypes = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const { data: storyTypes, isLoading: storyTypesLoading } = useQuery({
    queryKey: ["admin-story-types"],
    queryFn: storyApi.getAdminStoryTypes,
    enabled: isAuthenticated && isSuperuser,
  });

  const [searchInput, setSearchInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingStoryType, setEditingStoryType] = useState<StoryType | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDeleteStoryType, setPendingDeleteStoryType] = useState<StoryType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredStoryTypes = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return storyTypes || [];
    return (storyTypes || []).filter((storyType) => storyType.name.toLowerCase().includes(query));
  }, [storyTypes, searchInput]);

  const openCreateModal = () => {
    setEditingStoryType(null);
    setName("");
    setShowModal(true);
  };

  const openEditModal = (storyType: StoryType) => {
    setEditingStoryType(storyType);
    setName(storyType.name);
    setShowModal(true);
  };

  const saveStoryType = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      if (editingStoryType) {
        await storyApi.updateAdminStoryType(editingStoryType.id, name.trim());
        toast.success("Story type updated.");
      } else {
        await storyApi.createAdminStoryType(name.trim());
        toast.success("Story type created.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-story-types"] });
      setShowModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save story type.");
    } finally {
      setSaving(false);
    }
  };

  const deleteStoryType = async () => {
    if (!pendingDeleteStoryType) return;
    try {
      setDeleting(true);
      await storyApi.deleteAdminStoryType(pendingDeleteStoryType.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-story-types"] });
      toast.success("Story type deleted.");
      setPendingDeleteStoryType(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete story type.");
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
          <CardTitle className="text-lg">Story Types</CardTitle>
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
            <CardTitle className="text-lg">Story Types</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              The set of story formats (Novel, Poetry, Short Story, ...) offered when creating or editing a
              story, and shown on the Library filter and the Discover "Browse by Story Type" carousel.
            </p>
          </div>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="mr-1 h-4 w-4" />
            New Story Type
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search story types"
              className="pl-8"
            />
          </div>

          {storyTypesLoading ? (
            <p className="text-sm text-muted-foreground">Loading story types...</p>
          ) : filteredStoryTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchInput.trim() ? "No story types match your search." : "No story types yet — create the first one."}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {filteredStoryTypes.map((storyType) => (
                <div key={storyType.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{storyType.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {storyType.stories_count ?? 0} {storyType.stories_count === 1 ? "story" : "stories"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditModal(storyType)}
                      aria-label={`Edit ${storyType.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDeleteStoryType(storyType)}
                      aria-label={`Delete ${storyType.name}`}
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
              <CardTitle className="text-base">{editingStoryType ? "Edit Story Type" : "Create Story Type"}</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveStoryType}>
                <div>
                  <Label htmlFor="story-type-name">Name *</Label>
                  <Input id="story-type-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !name.trim()}>
                    {saving ? "Saving..." : editingStoryType ? "Save Changes" : "Create Story Type"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {pendingDeleteStoryType && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteStoryType(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Story Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete "{pendingDeleteStoryType.name}"? This is only possible while no story, queue item, or
                submission still uses it. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteStoryType(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deleting} onClick={deleteStoryType}>
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

export default AdminStoryTypes;
