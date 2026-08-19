import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthModal } from "@/context/AuthModalContext";
import { authApi } from "@/api/auth";
import { useUsernameAvailability } from "@/hooks/useUsernameAvailability";
import GenreChipPicker from "@/components/GenreChipPicker";

const FirstLoginSetupModal = () => {
  const { isOnboardingOpen, closeOnboarding } = useAuthModal();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isOnboardingOpen,
  });

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const currentUsername = me?.username || "";
  const usernameStatus = useUsernameAvailability(username, currentUsername);

  // Seed from the account's existing (auto-generated) values once they load
  // — the fields start pre-filled with something valid rather than blank.
  useEffect(() => {
    if (!me) return;
    setUsername(me.username || "");
    setDisplayName(me.display_name || "");
  }, [me]);

  if (!isOnboardingOpen) return null;

  const toggleGenre = (id: number) => {
    setSelectedGenreIds((current) =>
      current.includes(id) ? current.filter((genreId) => genreId !== id) : [...current, id]
    );
  };

  const canSave =
    username.trim().length > 0 && usernameStatus !== "checking" && usernameStatus !== "taken";

  const finish = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      await authApi.updateMe({
        username: username.trim(),
        display_name: displayName.trim(),
        preferred_genres: selectedGenreIds,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile-me"] });
      await queryClient.invalidateQueries({ queryKey: ["home-recommendations"] });
      toast.success("You're all set!");
      closeOnboarding();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save your preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={closeOnboarding}
    >
      <Card
        className="mx-auto w-full max-w-lg overflow-hidden border shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
          <div>
            <h2 id="onboarding-title" className="text-lg font-bold">
              Set up your account
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a username, and pick a few genres so we can recommend stories. You can skip this.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={closeOnboarding}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5 pb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="onboarding-username">Username</Label>
              <div className="relative mt-1">
                <Input
                  id="onboarding-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pr-8"
                  autoComplete="off"
                />
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {usernameStatus === "available" && <Check className="h-4 w-4 text-emerald-600" />}
                  {usernameStatus === "taken" && <X className="h-4 w-4 text-destructive" />}
                </div>
              </div>
              {usernameStatus === "taken" && (
                <p className="mt-1 text-xs text-destructive">That username is already taken.</p>
              )}
              {usernameStatus === "available" && (
                <p className="mt-1 text-xs text-emerald-600">Username is available.</p>
              )}
            </div>
            <div>
              <Label htmlFor="onboarding-display-name">Display Name</Label>
              <Input
                id="onboarding-display-name"
                className="mt-1"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">What do you like to read?</p>
            <GenreChipPicker selectedIds={selectedGenreIds} onToggle={toggleGenre} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeOnboarding}>
              Skip for now
            </Button>
            <Button type="button" disabled={!canSave || saving} onClick={finish}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirstLoginSetupModal;
