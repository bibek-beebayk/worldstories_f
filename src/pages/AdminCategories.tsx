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
import { AdminCategory } from "@/api/types";

const AdminCategories = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: storyApi.getAdminCategories,
    enabled: isAuthenticated && isSuperuser,
  });

  const [searchInput, setSearchInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredCategories = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return categories || [];
    return (categories || []).filter((category) => category.name.toLowerCase().includes(query));
  }, [categories, searchInput]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setShowModal(true);
  };

  const openEditModal = (category: AdminCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setShowModal(true);
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      if (editingCategory) {
        await storyApi.updateAdminCategory(editingCategory.id, name.trim());
        toast.success("Category updated.");
      } else {
        await storyApi.createAdminCategory(name.trim());
        toast.success("Category created.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setShowModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!pendingDeleteCategory) return;
    try {
      setDeleting(true);
      await storyApi.deleteAdminCategory(pendingDeleteCategory.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted.");
      setPendingDeleteCategory(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category.");
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
          <CardTitle className="text-lg">Categories</CardTitle>
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
            <CardTitle className="text-lg">Categories</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              A second, independent browsing taxonomy from genres — shown on story pages, the Library filter,
              and the Discover "Browse by Category" carousel.
            </p>
          </div>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="mr-1 h-4 w-4" />
            New Category
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search categories"
              className="pl-8"
            />
          </div>

          {categoriesLoading ? (
            <p className="text-sm text-muted-foreground">Loading categories...</p>
          ) : filteredCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchInput.trim() ? "No categories match your search." : "No categories yet — create the first one."}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {filteredCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.stories_count ?? 0} {category.stories_count === 1 ? "story" : "stories"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditModal(category)}
                      aria-label={`Edit ${category.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDeleteCategory(category)}
                      aria-label={`Delete ${category.name}`}
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
              <CardTitle className="text-base">{editingCategory ? "Edit Category" : "Create Category"}</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveCategory}>
                <div>
                  <Label htmlFor="category-name">Name *</Label>
                  <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !name.trim()}>
                    {saving ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {pendingDeleteCategory && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteCategory(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete "{pendingDeleteCategory.name}"? Stories in this category won't be deleted — the category
                will just be removed from them. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteCategory(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deleting} onClick={deleteCategory}>
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

export default AdminCategories;
