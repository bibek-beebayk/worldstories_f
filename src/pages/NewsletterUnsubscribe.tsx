import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { ApiError } from "@/api/client";
import { newsletterApi } from "@/api/newsletter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildMeta } from "@/lib/buildMeta";
import { newsletterPrefs } from "@/lib/newsletterPrefs";

export function meta() {
  return buildMeta({
    title: "Email preferences | WorldStories",
    description: "Update your WorldStories weekly digest subscription.",
    path: "/newsletter/unsubscribe",
    noIndex: true,
  });
}

type UnsubscribeState = "loading" | "unsubscribed" | "unknown" | "resubscribed" | "error";

export default function NewsletterUnsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const requestedToken = useRef<string | null>(null);
  const [state, setState] = useState<UnsubscribeState>(token ? "loading" : "unknown");
  const [reason, setReason] = useState("");
  const [reasonSaved, setReasonSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || requestedToken.current === token) return;
    requestedToken.current = token;
    newsletterApi
      .unsubscribe(token)
      .then(() => {
        newsletterPrefs.setSubscribedHint(false);
        setState("unsubscribed");
      })
      .catch((err) => setState(err instanceof ApiError && err.status === 404 ? "unknown" : "error"));
  }, [token]);

  if (state === "loading") {
    return (
      <main className="container flex min-h-[55vh] items-center justify-center px-4 py-16" aria-live="polite">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating your preference…
      </main>
    );
  }

  if (state === "unknown" || state === "error") {
    return (
      <main className="container px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-xl rounded-2xl border bg-card p-6 sm:p-8">
          <h1 className="text-2xl font-bold">Unsubscribe by email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {state === "unknown" ? "That link is no longer available." : "We couldn’t use that link right now."} Enter
            your email to unsubscribe.
          </p>
          {emailDone ? (
            <p className="mt-5 rounded-lg bg-emerald-500/10 p-4 text-sm" role="status">
              If that address was subscribed, it has been unsubscribed.
            </p>
          ) : (
            <form
              className="mt-5 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setError("");
                newsletterApi
                  .unsubscribeByEmail(email.trim())
                  .then(() => {
                    newsletterPrefs.setSubscribedHint(false);
                    setEmailDone(true);
                  })
                  .catch((err) => setError(err instanceof Error ? err.message : "We could not update that address."));
              }}
            >
              <label htmlFor="unsubscribe-email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="unsubscribe-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11"
              />
              <Button type="submit" className="min-h-11 w-full">
                Unsubscribe
              </Button>
              {error && (
                <p className="text-sm text-destructive" role="status">
                  {error}
                </p>
              )}
            </form>
          )}
          <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">
            Back to WorldStories
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-xl rounded-2xl border bg-card p-6 sm:p-8">
        <CheckCircle2 className="h-11 w-11 text-emerald-500" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">
          {state === "resubscribed" ? "You’re subscribed again" : "You’re unsubscribed"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {state === "resubscribed" ? "The weekly digest is back on." : "You won’t receive the weekly digest anymore."}
        </p>
        {state === "unsubscribed" && (
          <>
            <div className="mt-6">
              <label htmlFor="unsubscribe-reason" className="text-sm font-medium">
                Would you tell us why? (optional)
              </label>
              <select
                id="unsubscribe-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Choose a reason</option>
                <option value="Too frequent">Too frequent</option>
                <option value="Not relevant to me">Not relevant to me</option>
                <option value="I did not sign up">I did not sign up</option>
                <option value="Other">Other</option>
              </select>
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11"
                disabled={!reason || reasonSaved}
                onClick={() => {
                  newsletterApi
                    .unsubscribe(token, reason)
                    .then(() => setReasonSaved(true))
                    .catch((err) => setError(err instanceof Error ? err.message : "We could not save your response."));
                }}
              >
                {reasonSaved ? "Thanks for your feedback" : "Save response"}
              </Button>
            </div>
            <Button
              type="button"
              className="mt-6 min-h-11"
              onClick={() => {
                newsletterApi
                  .resubscribe(token)
                  .then(() => {
                    newsletterPrefs.setSubscribedHint();
                    setState("resubscribed");
                  })
                  .catch((err) => setError(err instanceof Error ? err.message : "We could not resubscribe you."));
              }}
            >
              Resubscribe
            </Button>
          </>
        )}
        {error && (
          <p className="mt-3 text-sm text-destructive" role="status">
            {error}
          </p>
        )}
        <div>
          <Link to="/" className="mt-6 inline-block text-sm text-primary hover:underline">
            Back to WorldStories
          </Link>
        </div>
      </div>
    </main>
  );
}
