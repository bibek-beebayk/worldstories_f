import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Search, X } from "lucide-react";
import { AdminUser } from "@/api/types";

const roleBadgeClass = "bg-violet-100 text-violet-700 border-violet-200";
const staffBadgeClass = "bg-sky-100 text-sky-700 border-sky-200";
const inactiveBadgeClass = "bg-red-100 text-red-700 border-red-200";

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => storyApi.getAdminUsers(page, search),
    enabled: isAuthenticated && isSuperuser,
  });

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isSuperuserField, setIsSuperuserField] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const runSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setIsStaff(user.is_staff);
    setIsSuperuserField(user.is_superuser);
    setIsActive(user.is_active);
  };

  const saveUser = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      await storyApi.updateAdminUser(editingUser.id, {
        is_staff: isStaff,
        is_superuser: isSuperuserField,
        is_active: isActive,
      });
      toast.success("User updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
    } catch (error) {
      // The backend blocks an admin from deactivating or demoting their own
      // account (400) — that message is surfaced verbatim rather than a
      // generic fallback, since it explains exactly why the save failed.
      toast.error(error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  if (meLoading) {
    return <FullScreenLoader />;
  }

  if (!isSuperuser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Access denied. Superuser privileges are required.</p>
        </CardContent>
      </Card>
    );
  }

  const isEditingSelf = editingUser?.id === me?.id;
  const pagination = usersData?.pagination;

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Users</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Search readers, and manage staff/superuser access and account status.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Search by email, username, or name"
                className="pl-8"
              />
            </div>
            <Button size="sm" onClick={runSearch}>
              Search
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Total users: <span className="font-medium text-foreground">{pagination?.count ?? 0}</span>
          </p>

          {usersLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : (usersData?.results?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search ? "No users match your search." : "No users yet."}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {(usersData?.results || []).map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback>
                        {(user.display_name || user.username).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">{user.display_name || user.username}</p>
                        {user.id === me?.id && (
                          <span className="rounded-full border px-1.5 py-0 text-[10px] text-muted-foreground">
                            You
                          </span>
                        )}
                        {user.is_superuser && (
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${roleBadgeClass}`}>
                            Superuser
                          </span>
                        )}
                        {user.is_staff && !user.is_superuser && (
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${staffBadgeClass}`}>
                            Staff
                          </span>
                        )}
                        {!user.is_active && (
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${inactiveBadgeClass}`}>
                            Deactivated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Joined {new Date(user.date_joined).toLocaleDateString()} &middot;{" "}
                        {user.reviews_count} {user.reviews_count === 1 ? "review" : "reviews"} &middot;{" "}
                        {user.favorites_count} {user.favorites_count === 1 ? "favorite" : "favorites"} &middot;{" "}
                        {user.submissions_count} {user.submissions_count === 1 ? "submission" : "submissions"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => openEditModal(user)}
                    aria-label={`Edit ${user.email}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              disabled={(pagination?.page || 1) <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {pagination?.page || 1} / {pagination?.pages || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={(pagination?.page || 1) >= (pagination?.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {editingUser && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setEditingUser(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Edit {editingUser.display_name || editingUser.username}</CardTitle>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isStaff} onChange={(e) => setIsStaff(e.target.checked)} />
                  Staff
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isSuperuserField}
                    disabled={isEditingSelf}
                    onChange={(e) => setIsSuperuserField(e.target.checked)}
                  />
                  Superuser
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isActive}
                    disabled={isEditingSelf}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Active
                </label>
                {isEditingSelf && (
                  <p className="text-xs text-muted-foreground">
                    You can't demote or deactivate your own account.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={saveUser}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
