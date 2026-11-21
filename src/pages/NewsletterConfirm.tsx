import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { newsletterApi } from "@/api/newsletter";
import type { Story } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StoryCard from "@/components/StoryCard";
import { useHomeData } from "@/hooks/useHomeData";
import { buildMeta } from "@/lib/buildMeta";
import { newsletterPrefs } from "@/lib/newsletterPrefs";

export function meta() {
  return buildMeta({
    title: "Confirm your weekly digest | WorldStories",
    description: "Confirm your WorldStories weekly email digest subscription.",
    path: "/newsletter/confirm",
    noIndex: true,
  });
}

type ConfirmState = "loading" | "confirmed" | "invalid" | "error";

export default function NewsletterConfirm() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const requestedToken = useRef<string | null>(null);
  const [state, setState] = useState<ConfirmState>(token ? "loading" : "invalid");
  const [email, setEmail] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [formError, setFormError] = useState("");
  const home = useHomeData();

  useEffect(() => {
    if (!token || requestedToken.current === token) return;
    requestedToken.current = token;
    newsletterApi
      .confirm(token)
      .then((result) => {
        setEmail(result.email);
        newsletterPrefs.setSubscribedHint();
        setState("confirmed");
      })
      .catch((error) => {
        setState(error instanceof Error && "status" in error && error.status === 400 ? "invalid" : "error");
      });
  }, [token]);

  const suggestions: Story[] = [...(home.data?.weekly_spotlight || []), ...(home.data?.new_trending || [])].slice(0, 3);

  if (state === "loading") {
    return (
      <main className="container flex min-h-[55vh] items-center justify-center px-4 py-16" aria-live="polite">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Confirming your subscription…
      </main>
    );
  }

  if (state === "confirmed") {
    return (
      <main className="container px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border bg-card p-6 text-center sm:p-10">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
            <h1 className="mt-4 text-3xl font-bold">You’re on the list</h1>
            <p className="mt-2 text-muted-foreground">The weekly digest will arrive at {email}.</p>
          </div>
          {suggestions.length > 0 && (
            <section className="mt-10" aria-labelledby="newsletter-suggestions-heading">
              <h2 id="newsletter-suggestions-heading" className="text-xl font-bold">
                Stories to enjoy while you wait
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {suggestions.map((story) => (
                  <StoryCard key={story.id} {...story} />
                ))}
              </div>
            </section>
          )}
          <div className="mt-8 text-center">
            <Button asChild>
              <Link to="/library">Browse the library</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-xl rounded-2xl border bg-card p-6 sm:p-8">
        <MailWarning className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">
          {state === "invalid" ? "That confirmation link has expired" : "We couldn’t confirm that link"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your email and we’ll send a fresh confirmation link.</p>
        {linkSent ? (
          <p className="mt-5 rounded-lg bg-emerald-500/10 p-4 text-sm" role="status">
            Check your inbox for a fresh link.
          </p>
        ) : (
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError("");
              newsletterApi
                .subscribe(requestEmail.trim(), "other")
                .then(() => setLinkSent(true))
                .catch((error) => {
                  setFormError(error instanceof Error ? error.message : "We could not send a fresh link.");
                });
            }}
          >
            <label htmlFor="confirmation-email" className="text-sm font-medium">
              Email address
            </label>
            <Input
              id="confirmation-email"
              type="email"
              autoComplete="email"
              required
              value={requestEmail}
              onChange={(event) => setRequestEmail(event.target.value)}
              className="min-h-11"
            />
            <Button type="submit" className="min-h-11 w-full">
              Send a fresh link
            </Button>
            {formError && (
              <p className="text-sm text-destructive" role="status">
                {formError}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
