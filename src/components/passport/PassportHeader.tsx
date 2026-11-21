import { Globe2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyMilestone, milestoneShareUrl, type Milestone } from "@/lib/milestoneShare";

const ProgressRing = ({ explored, available }: { explored: number; available: number }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = available > 0 ? Math.min(1, explored / available) : 0;

  return (
    <div className="relative h-[76px] w-[76px] shrink-0 sm:h-[88px] sm:w-[88px]">
      <svg
        viewBox="0 0 88 88"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${explored} of ${available} ${available === 1 ? "country" : "countries"} explored`}
      >
        <circle cx="44" cy="44" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="text-primary"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-sm font-bold sm:text-base"
        aria-hidden="true"
      >
        {explored}/{available}
      </span>
    </div>
  );
};

export default function PassportHeader({ explored, available }: { explored: number; available: number }) {
  const remaining = Math.max(0, available - explored);
  const countryNoun = available === 1 ? "country" : "countries";
  const milestone: Milestone = { kind: "countries", value: explored, path: "/story-map" };
  const message = `I have explored ${explored} of ${available} countries through stories on WorldStories.`;

  const sharePassport = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My Story Passport", text: message, url: milestoneShareUrl(milestone) });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyMilestone(milestone);
  };

  return (
    <header className="mb-8 grid gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>My Story Passport</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
          {explored} of {available} {countryNoun} explored
        </h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          {explored === available
            ? "You have stamped every country. New ones appear as stories are added."
            : `A country gets stamped when you finish a story from it. ${remaining} left to go.`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4 lg:min-w-[260px]">
        <ProgressRing explored={explored} available={available} />
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => void sharePassport()}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share my passport
        </Button>
      </div>
    </header>
  );
}
