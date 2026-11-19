import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowRight, BookOpenText, ChevronDown, Flame, Headphones } from "lucide-react";
import { authApi } from "@/api/auth";
import CoverImage from "@/components/CoverImage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { splitContinueEntries, type ContinueEntry } from "@/lib/continueShelf";
import { formatRemainingMinutes } from "@/lib/readingTime";

const percent = (progress: number) => Math.round(Math.max(0, Math.min(1, progress)) * 100);

const ContinueCard = ({ entry }: { entry: ContinueEntry }) => {
  const remaining = formatRemainingMinutes(entry.remainingMinutes);
  const Icon = entry.kind === "listening" ? Headphones : BookOpenText;
  return (
    <Link
      to={entry.href}
      className="group flex w-64 items-center gap-3 rounded-sm border border-border bg-card p-2.5 shadow-sm transition-colors hover:bg-muted/50 sm:w-72"
    >
      <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-sm shadow-sm sm:w-[72px]">
        <CoverImage
          src={entry.story.cover_image}
          alt={entry.story.title}
          author={entry.story.author}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3 w-3" />
          {entry.kind === "listening" ? "Listening" : "Reading"}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
          {entry.story.title}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent(entry.progress)}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-primary">{percent(entry.progress)}%</span>
        </div>
        {remaining && <p className="mt-1 text-[11px] text-muted-foreground">{remaining}</p>}
      </div>
    </Link>
  );
};

/**
 * One "Continue" row for everything the reader has in progress — reading and
 * listening together, newest activity first. Barely-started or long-untouched
 * items wait behind "Show older"; the reading streak is a small chip in the
 * header instead of its own banner. Renders nothing when there is nothing.
 */
const ContinueShelf = ({ entries, title = "Continue" }: { entries: ContinueEntry[]; title?: string }) => {
  const [showOlder, setShowOlder] = useState(false);
  const { recent, older } = useMemo(() => splitContinueEntries(entries), [entries]);

  const { data: streak } = useQuery({
    queryKey: ["reading-streak"],
    queryFn: authApi.getReadingStreak,
    staleTime: 60_000,
  });

  if (entries.length === 0) return null;
  const visible = showOlder ? [...recent, ...older] : recent;

  return (
    <section aria-label={title}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
            <BookOpenText className="h-5 w-5 shrink-0 text-primary" />
            {title}
          </h2>
          {streak && streak.current_streak > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600"
              title={`Longest streak: ${streak.longest_streak} ${streak.longest_streak === 1 ? "day" : "days"}`}
            >
              <Flame className="h-3.5 w-3.5" />
              {streak.current_streak}-day streak
            </span>
          )}
        </div>
        <Link
          to="/profile/reader?view=reading"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm"
        >
          See all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {visible.length > 0 && (
        <Carousel opts={{ align: "start", containScroll: "trimSnaps", slidesToScroll: "auto" }} className="-mx-3 sm:mx-0">
          <CarouselContent className="-ml-3 px-3 pb-2 sm:px-0">
            {visible.map((entry) => (
              <CarouselItem key={`${entry.kind}-${entry.story.id}`} className="basis-auto pl-3">
                <ContinueCard entry={entry} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious aria-label="Scroll continue shelf left" className="left-1 hidden disabled:invisible sm:flex" />
          <CarouselNext aria-label="Scroll continue shelf right" className="right-1 hidden disabled:invisible sm:flex" />
        </Carousel>
      )}

      {older.length > 0 && (
        <button
          type="button"
          aria-expanded={showOlder}
          onClick={() => setShowOlder((open) => !open)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOlder ? "rotate-180" : ""}`} />
          {showOlder ? "Hide older" : `Show older (${older.length})`}
        </button>
      )}
    </section>
  );
};

export default ContinueShelf;
