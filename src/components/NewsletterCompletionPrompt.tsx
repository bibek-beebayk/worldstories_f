import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { newsletterApi } from "@/api/newsletter";
import type { NewsletterStatusResponse } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { NEWSLETTER_STATUS_QUERY_KEY, useNewsletterStatus } from "@/hooks/useNewsletterStatus";
import { newsletterPrefs, shouldShowNewsletterPrompt } from "@/lib/newsletterPrefs";

export default function NewsletterCompletionPrompt() {
  const isLoggedIn = useIsLoggedIn();
  const statusQuery = useNewsletterStatus();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoggedIn && statusQuery.isSuccess && shouldShowNewsletterPrompt(statusQuery.data.status)) setOpen(true);
  }, [isLoggedIn, statusQuery.data?.status, statusQuery.isSuccess]);

  const turnOn = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await newsletterApi.updateMe(true, "prompt");
      queryClient.setQueryData<NewsletterStatusResponse>(NEWSLETTER_STATUS_QUERY_KEY, result);
      newsletterPrefs.setSubscribedHint();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not update your preference.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && open) newsletterPrefs.setPromptDismissedAt();
        setOpen(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Want one great story each week?</DialogTitle>
          <DialogDescription>
            Turn on the WorldStories weekly digest for a hand-picked story and a few fresh discoveries.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive" role="status">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={() => {
              newsletterPrefs.setPromptNever();
              setOpen(false);
            }}
          >
            Don’t ask again
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              newsletterPrefs.setPromptDismissedAt();
              setOpen(false);
            }}
          >
            Not now
          </Button>
          <Button type="button" className="min-h-11" disabled={saving} onClick={turnOn}>
            {saving ? "Turning on…" : "Turn on weekly digest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
