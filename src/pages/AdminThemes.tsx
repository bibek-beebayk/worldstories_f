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
import { AdminTheme } from "@/api/types";

const AdminThemes = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const { data: themes, isLoading: themesLoading } = useQuery({
    queryKey: ["admin-themes"],
    queryFn: storyApi.getAdminThemes,
    enabled: isAuthenticated && isSuperuser,
  });

  const [searchInput, setSearchInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<AdminTheme | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDeleteTheme, setPendingDeleteTheme] = useState<AdminTheme | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredThemes = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return themes || [];
    return (themes || []).filter((theme) => theme.name.toLowerCase().includes(query));
  }, [themes, searchInput]);

  const openCreateModal = () => {
    setEditingTheme(null);
    setName("");
    setShowModal(true);
  };

  const openEditModal = (theme: AdminTheme) => {
    setEditingTheme(theme);
    setName(theme.name);
    setShowModal(true);
  };

  const saveTheme = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      if (editingTheme) {
        await storyApi.updateAdminTheme(editingTheme.id, name.trim());
        toast.success("Theme updated.");
      } else {
        await storyApi.createAdminTheme(name.trim());
        toast.success("Theme created.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-themes"] });
      setShowModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save theme.");
    } finally {
      setSaving(false);
    }
  };

  const deleteTheme = async () => {
    if (!pendingDeleteTheme) return;
    try {
      setDeleting(true);
      await storyApi.deleteAdminTheme(pendingDeleteTheme.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-themes"] });
      toast.success("Theme deleted.");
      setPendingDeleteTheme(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete theme.");
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
          <CardTitle className="text-lg">Themes</CardTitle>
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
            <CardTitle className="text-lg">Themes</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Reading-experience themes (emotional register, real-world subject matter) — each theme with
              published stories gets its own /theme/&lt;slug&gt; landing page.
            </p>
          </div>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="mr-1 h-4 w-4" />
            New Theme
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search themes"
              className="pl-8"
            />
          </div>

          {themesLoading ? (
            <p className="text-sm text-muted-foreground">Loading themes...</p>
          ) : filteredThemes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchInput.trim() ? "No themes match your search." : "No themes yet — create the first one."}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {filteredThemes.map((theme) => (
                <div key={theme.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{theme.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {theme.stories_count ?? 0} {theme.stories_count === 1 ? "story" : "stories"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditModal(theme)}
                      aria-label={`Edit ${theme.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDeleteTheme(theme)}
                      aria-label={`Delete ${theme.name}`}
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
              <CardTitle className="text-base">{editingTheme ? "Edit Theme" : "Create Theme"}</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveTheme}>
                <div>
                  <Label htmlFor="theme-name">Name *</Label>
                  <Input id="theme-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !name.trim()}>
                    {saving ? "Saving..." : editingTheme ? "Save Changes" : "Create Theme"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {pendingDeleteTheme && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteTheme(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Theme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete "{pendingDeleteTheme.name}"? Stories with this theme won't be deleted — the theme will
                just be removed from them, and its /theme/&lt;slug&gt; page will stop existing. This action
                cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteTheme(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deleting} onClick={deleteTheme}>
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

export default AdminThemes;
