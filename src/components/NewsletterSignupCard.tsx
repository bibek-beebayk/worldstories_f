import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Mail } from "lucide-react";
import { newsletterApi } from "@/api/newsletter";
import type { NewsletterSource, NewsletterStatusResponse } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { NEWSLETTER_STATUS_QUERY_KEY, useNewsletterStatus } from "@/hooks/useNewsletterStatus";
import { cn } from "@/lib/utils";
import { newsletterPrefs } from "@/lib/newsletterPrefs";

type SignupState = "idle" | "submitting" | "pending" | "error";
type SignupVariant = "blog" | "inline" | "footer";

const copy = {
  blog: {
    title: "A good story, once a week",
    description: "Get one hand-picked story and a few thoughtful reads in your inbox.",
  },
  inline: {
    title: "Keep discovering stories",
    description: "Our weekly digest brings one memorable story and fresh discoveries to your inbox.",
  },
  footer: {
    title: "Stories worth opening",
    description: "A calm weekly email with one featured story and new discoveries.",
  },
};

interface NewsletterSignupCardProps {
  variant?: SignupVariant;
  source?: NewsletterSource;
  className?: string;
}

export default function NewsletterSignupCard({
  variant = "inline",
  source = variant === "inline" ? "completion" : variant,
  className,
}: NewsletterSignupCardProps) {
  const isLoggedIn = useIsLoggedIn();
  const statusQuery = useNewsletterStatus();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SignupState>("idle");
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  // Always start false so the initial client render matches SSR (where
  // localStorage doesn't exist); reading it in useState's initializer causes
  // a hydration mismatch on every public page once subscribed, dropping Vite's
  // dev CSS. Sync immediately after mount in the effect below.
  const [subscribedHint, setSubscribedHint] = useState(false);
  const remoteStatus = statusQuery.data?.status;

  useEffect(() => {
    const sync = () => setSubscribedHint(newsletterPrefs.getSubscribedHint());
    sync();
    return newsletterPrefs.subscribe(sync);
  }, []);

  if (remoteStatus === "confirmed" || (subscribedHint && state === "idle")) return null;

  const pending = state === "pending" || remoteStatus === "pending";
  const submitEmail = async (address: string) => {
    setState("submitting");
    setError("");
    try {
      await newsletterApi.subscribe(address, source);
      setSubmittedEmail(address);
      newsletterPrefs.setSubscribedHint();
      setState("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not send the confirmation email. Please try again.");
      setState("error");
    }
  };

  const enableForMember = async () => {
    setState("submitting");
    setError("");
    try {
      const result = await newsletterApi.updateMe(true, source);
      queryClient.setQueryData<NewsletterStatusResponse>(NEWSLETTER_STATUS_QUERY_KEY, result);
      newsletterPrefs.setSubscribedHint();
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not update your email preference. Please try again.");
      setState("error");
    }
  };

  const surface = variant === "footer" ? "border-white/15 bg-white/10 text-white" : "border-border bg-card";
  const muted = variant === "footer" ? "text-white/75" : "text-muted-foreground";

  return (
    <section
      className={cn("min-h-48 rounded-xl border p-5 sm:p-6", surface, className)}
      aria-labelledby={`newsletter-${variant}-heading`}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 rounded-full p-2", variant === "footer" ? "bg-white/10" : "bg-primary/10")}>
          <Mail className={cn("h-5 w-5", variant === "footer" ? "text-white" : "text-primary")} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`newsletter-${variant}-heading`} className="text-lg font-bold">
            {pending ? "Check your inbox" : copy[variant].title}
          </h2>
          <p className={cn("mt-1 text-sm", muted)} aria-live="polite">
            {pending
              ? `We sent a confirmation link${submittedEmail ? ` to ${submittedEmail}` : ""}.`
              : copy[variant].description}
          </p>
        </div>
      </div>

      {pending ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          {submittedEmail && (
            <Button
              type="button"
              variant={variant === "footer" ? "secondary" : "outline"}
              className="min-h-11"
              onClick={() => submitEmail(submittedEmail)}
              disabled={state === "submitting"}
            >
              Resend
            </Button>
          )}
          {!isLoggedIn && (
            <Button
              type="button"
              variant="ghost"
              className={cn("min-h-11", variant === "footer" && "text-white hover:bg-white/10 hover:text-white")}
              onClick={() => {
                newsletterPrefs.setSubscribedHint(false);
                setState("idle");
                setEmail("");
                setSubmittedEmail("");
              }}
            >
              Use another email
            </Button>
          )}
        </div>
      ) : isLoggedIn ? (
        <Button type="button" className="mt-4 min-h-11" onClick={enableForMember} disabled={state === "submitting"}>
          {state === "submitting" ? "Turning on…" : "Turn on weekly digest"}
        </Button>
      ) : (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void submitEmail(email.trim());
          }}
        >
          <label htmlFor={`newsletter-${variant}-email`} className="sr-only">
            Email address
          </label>
          <Input
            id={`newsletter-${variant}-email`}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={cn("min-h-11 flex-1", variant === "footer" && "border-white/20 bg-white text-foreground")}
          />
          <Button type="submit" className="min-h-11 shrink-0" disabled={state === "submitting"}>
            {state === "submitting" ? "Sending…" : "Send me the digest"}
          </Button>
        </form>
      )}

      {error && (
        <p className={cn("mt-3 text-sm", variant === "footer" ? "text-red-200" : "text-destructive")} role="status">
          {error}
        </p>
      )}
    </section>
  );
}
