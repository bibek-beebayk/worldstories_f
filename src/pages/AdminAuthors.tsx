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
  const [missingPortraitOnly, setMissingPortraitOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AdminAuthor | null>(null);
  const [name, setName] = useState("");
  const [sortName, setSortName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [yearsLabel, setYearsLabel] = useState("");
  const [country, setCountry] = useState("");
  const [countryLabel, setCountryLabel] = useState("");
  const [era, setEra] = useState("");
  const [knownFor, setKnownFor] = useState("");
  const [isTraditional, setIsTraditional] = useState(false);
  const [isHouse, setIsHouse] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [merging, setMerging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteAuthor, setPendingDeleteAuthor] = useState<AdminAuthor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredAuthors = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    const pool = missingPortraitOnly ? (authors || []).filter((author) => !author.image) : (authors || []);
    if (!query) return pool;
    return pool.filter(
      (author) =>
        author.name.toLowerCase().includes(query) || (author.bio || "").toLowerCase().includes(query)
    );
  }, [authors, searchInput, missingPortraitOnly]);

  const openCreateModal = () => {
    setEditingAuthor(null);
    setName("");
    setSortName("");
    setBio("");
    setImage("");
    setBirthYear(""); setDeathYear(""); setYearsLabel(""); setCountry(""); setCountryLabel(""); setEra(""); setKnownFor(""); setIsTraditional(false); setIsHouse(false); setMergeTarget("");
    setShowModal(true);
  };

  const openEditModal = (author: AdminAuthor) => {
    setEditingAuthor(author);
    setName(author.name);
    setSortName(author.sort_name || "");
    setBio(author.bio || "");
    setImage(author.image || "");
    setBirthYear(author.birth_year != null ? String(author.birth_year) : "");
    setDeathYear(author.death_year != null ? String(author.death_year) : "");
    setYearsLabel(author.years_label || ""); setCountry(author.country || ""); setCountryLabel(author.country_label || ""); setEra(author.era || ""); setKnownFor(author.known_for || ""); setIsTraditional(author.is_traditional); setIsHouse(author.is_house); setMergeTarget("");
    setShowModal(true);
  };

  const saveAuthor = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const payload = { name: name.trim(), sort_name: sortName.trim(), bio: bio.trim(), image: image.trim(), birth_year: birthYear ? Number(birthYear) : null, death_year: deathYear ? Number(deathYear) : null, years_label: yearsLabel.trim(), country: country.trim().toUpperCase(), country_label: countryLabel.trim(), era, known_for: knownFor.trim(), is_traditional: isTraditional, is_house: isHouse };
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

  const mergeAuthor = async () => {
    if (!editingAuthor || !mergeTarget) return;
    try {
      setMerging(true);
      const result = await storyApi.mergeAdminAuthor(editingAuthor.id, Number(mergeTarget));
      await queryClient.invalidateQueries({ queryKey: ["admin-authors"] });
      toast.success(`Merged into ${result.target.name}.`);
      setShowModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to merge authors.");
    } finally { setMerging(false); }
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
    <div className="h-full overflow-y-auto scrollbar-thin space-y-4 pr-1">
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
          <label className="flex min-h-11 w-fit items-center gap-2 text-sm"><input type="checkbox" checked={missingPortraitOnly} onChange={(e) => setMissingPortraitOnly(e.target.checked)} />Missing portrait only</label>

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
          <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                <div><Label htmlFor="author-sort-name">Sort name</Label><Input id="author-sort-name" value={sortName} onChange={(e) => setSortName(e.target.value)} placeholder="Doyle, Arthur Conan" /></div>
                <div>
                  <Label htmlFor="author-image">Image URL</Label>
                  <Input id="author-image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="author-bio">Bio</Label>
                  <Textarea id="author-bio" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-24" />
                </div>
                <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="author-birth">Birth year</Label><Input id="author-birth" type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} /></div><div><Label htmlFor="author-death">Death year</Label><Input id="author-death" type="number" value={deathYear} onChange={(e) => setDeathYear(e.target.value)} /></div></div>
                <div><Label htmlFor="author-years-label">Years label</Label><Input id="author-years-label" value={yearsLabel} onChange={(e) => setYearsLabel(e.target.value)} placeholder="Optional display override" /></div>
                <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="author-country">Country code</Label><Input id="author-country" maxLength={2} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="GB" /></div><div><Label htmlFor="author-country-label">Country label</Label><Input id="author-country-label" value={countryLabel} onChange={(e) => setCountryLabel(e.target.value)} placeholder="Ancient Greece" /></div></div>
                <div><Label htmlFor="author-era">Era</Label><select id="author-era" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={era} onChange={(e) => setEra(e.target.value)}><option value="">Unknown</option><option value="ancient">Ancient</option><option value="pre_1800">Before 1800</option><option value="1800s">1800s</option><option value="1900s">1900s</option><option value="contemporary">Contemporary</option></select></div>
                <div><Label htmlFor="author-known-for">Known for</Label><Input id="author-known-for" value={knownFor} onChange={(e) => setKnownFor(e.target.value)} /></div>
                <div className="flex flex-wrap gap-5"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={isTraditional} onChange={(e) => setIsTraditional(e.target.checked)} />Traditional attribution</label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={isHouse} onChange={(e) => setIsHouse(e.target.checked)} />House byline</label></div>
                {editingAuthor && <div className="rounded-md border border-destructive/30 p-3"><Label htmlFor="merge-target">Merge this author into</Label><div className="mt-2 flex gap-2"><select id="merge-target" className="h-10 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}><option value="">Choose target…</option>{(authors || []).filter((item) => item.id !== editingAuthor.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Button type="button" variant="destructive" disabled={!mergeTarget || merging} onClick={mergeAuthor}>{merging ? "Merging…" : "Merge"}</Button></div></div>}
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
