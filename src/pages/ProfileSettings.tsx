import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import GenreChipPicker from "@/components/GenreChipPicker";
import { authApi } from "@/api/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { buildMeta } from "@/lib/buildMeta";
import type { ProfileOutletContext } from "@/layouts/ProfileShellLayout";
import { Switch } from "@/components/ui/switch";
import { newsletterApi } from "@/api/newsletter";
import type { NewsletterStatusResponse } from "@/api/types";
import { NEWSLETTER_STATUS_QUERY_KEY, useNewsletterStatus } from "@/hooks/useNewsletterStatus";

export function meta() {
  return buildMeta({
    title: "Settings | Your Profile | WorldStories",
    path: "/profile/settings",
    noIndex: true,
  });
}

const ProfileSettings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useOutletContext<ProfileOutletContext>();
  const newsletterStatus = useNewsletterStatus();
  const [newsletterError, setNewsletterError] = useState("");
  const [newsletterSaving, setNewsletterSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [preferredGenreIds, setPreferredGenreIds] = useState<number[]>([]);
  const [saveError, setSaveError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    setUsername(profile.username || "");
    setDisplayName(profile.display_name || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatar_url || "");
    setPreferredGenreIds((profile.preferred_genres || []).map((genre) => genre.id));
  }, [profile]);

  const onSaveProfile = async () => {
    setSaveError("");
    setSaveLoading(true);
    try {
      await authApi.updateMe({
        username: username.trim(),
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
        preferred_genres: preferredGenreIds,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      await queryClient.invalidateQueries({ queryKey: ["home-recommendations"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile.";
      setSaveError(message);
    } finally {
      setSaveLoading(false);
    }
  };

  const onNewsletterChange = async (subscribed: boolean) => {
    const previous = queryClient.getQueryData<NewsletterStatusResponse>(NEWSLETTER_STATUS_QUERY_KEY);
    const optimistic: NewsletterStatusResponse = {
      status: subscribed ? "confirmed" : "unsubscribed",
      email: newsletterStatus.data?.email || profile.email,
    };
    setNewsletterError("");
    setNewsletterSaving(true);
    await queryClient.cancelQueries({ queryKey: NEWSLETTER_STATUS_QUERY_KEY });
    queryClient.setQueryData(NEWSLETTER_STATUS_QUERY_KEY, optimistic);
    try {
      const result = await newsletterApi.updateMe(subscribed, "profile");
      queryClient.setQueryData(NEWSLETTER_STATUS_QUERY_KEY, result);
    } catch (err) {
      queryClient.setQueryData(NEWSLETTER_STATUS_QUERY_KEY, previous);
      setNewsletterError(err instanceof Error ? err.message : "Failed to update email preferences.");
    } finally {
      setNewsletterSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <p className="font-medium">Profile Settings</p>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Avatar URL</label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Bio</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Preferred Genres</label>
            <p className="mb-2 text-xs text-muted-foreground">Used to recommend stories to you on the homepage.</p>
            <GenreChipPicker
              selectedIds={preferredGenreIds}
              onToggle={(id) =>
                setPreferredGenreIds((current) =>
                  current.includes(id) ? current.filter((genreId) => genreId !== id) : [...current, id],
                )
              }
            />
          </div>
          {profile.is_superuser && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-medium">Content Management</p>
              <Button type="button" variant="outline" onClick={() => navigate("/admin")}>
                Open Admin Panel
              </Button>
            </div>
          )}
          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <Button onClick={onSaveProfile} disabled={saveLoading}>
            {saveLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Email</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Receive the weekly WorldStories digest at {newsletterStatus.data?.email || profile.email}.
                </p>
              </div>
            </div>
            <Switch
              checked={newsletterStatus.data?.status === "confirmed"}
              disabled={newsletterStatus.isLoading || newsletterSaving}
              onCheckedChange={(checked) => void onNewsletterChange(checked)}
              aria-label="Weekly email digest"
            />
          </div>
          {newsletterError && (
            <p className="mt-3 text-sm text-destructive" role="status">
              {newsletterError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;
