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
import { AdminGenre } from "@/api/types";

const AdminGenres = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const { data: genres, isLoading: genresLoading } = useQuery({
    queryKey: ["admin-genres"],
    queryFn: storyApi.getAdminGenres,
    enabled: isAuthenticated && isSuperuser,
  });

  const [searchInput, setSearchInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingGenre, setEditingGenre] = useState<AdminGenre | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDeleteGenre, setPendingDeleteGenre] = useState<AdminGenre | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredGenres = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return genres || [];
    return (genres || []).filter((genre) => genre.name.toLowerCase().includes(query));
  }, [genres, searchInput]);

  const openCreateModal = () => {
    setEditingGenre(null);
    setName("");
    setShowModal(true);
  };

  const openEditModal = (genre: AdminGenre) => {
    setEditingGenre(genre);
    setName(genre.name);
    setShowModal(true);
  };

  const saveGenre = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      if (editingGenre) {
        await storyApi.updateAdminGenre(editingGenre.id, name.trim());
        toast.success("Genre updated.");
      } else {
        await storyApi.createAdminGenre(name.trim());
        toast.success("Genre created.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-genres"] });
      setShowModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save genre.");
    } finally {
      setSaving(false);
    }
  };

  const deleteGenre = async () => {
    if (!pendingDeleteGenre) return;
    try {
      setDeleting(true);
      await storyApi.deleteAdminGenre(pendingDeleteGenre.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-genres"] });
      toast.success("Genre deleted.");
      setPendingDeleteGenre(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete genre.");
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
          <CardTitle className="text-lg">Genres</CardTitle>
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
            <CardTitle className="text-lg">Genres</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              The primary browsing taxonomy — shown on story pages, the Library filter, and the Discover
              genre shelves.
            </p>
          </div>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="mr-1 h-4 w-4" />
            New Genre
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search genres"
              className="pl-8"
            />
          </div>

          {genresLoading ? (
            <p className="text-sm text-muted-foreground">Loading genres...</p>
          ) : filteredGenres.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchInput.trim() ? "No genres match your search." : "No genres yet — create the first one."}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {filteredGenres.map((genre) => (
                <div key={genre.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{genre.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {genre.stories_count ?? 0} {genre.stories_count === 1 ? "story" : "stories"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditModal(genre)}
                      aria-label={`Edit ${genre.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDeleteGenre(genre)}
                      aria-label={`Delete ${genre.name}`}
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
              <CardTitle className="text-base">{editingGenre ? "Edit Genre" : "Create Genre"}</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveGenre}>
                <div>
                  <Label htmlFor="genre-name">Name *</Label>
                  <Input id="genre-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !name.trim()}>
                    {saving ? "Saving..." : editingGenre ? "Save Changes" : "Create Genre"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {pendingDeleteGenre && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteGenre(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Genre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete "{pendingDeleteGenre.name}"? Stories with this genre won't be deleted — the genre
                will just be removed from them. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteGenre(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deleting} onClick={deleteGenre}>
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

export default AdminGenres;
