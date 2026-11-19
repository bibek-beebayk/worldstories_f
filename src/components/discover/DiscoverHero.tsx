import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Dices, Loader2 } from "lucide-react";
import { storyApi } from "@/api/story";
import type { DiscoverSurpriseResponse } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import { Button } from "@/components/ui/button";
import { TIME_OPTIONS, finderHref, finderLabel } from "@/lib/discover";
import { trackAnalyticsEvent } from "@/lib/analytics";

const SEEN_KEY = "discover-surprise-seen";
const MAX_SEEN = 40;

// Stories already shown in this browser session, so "Spin again" does not repeat.
const readSeen = (): number[] => {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
};
const writeSeen = (ids: number[]) => {
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-MAX_SEEN)));
  } catch {
    // storage blocked: repeats are possible, nothing breaks
  }
};

/** The dark "Surprise me" panel: one story with a real cover and a description. */
const SurprisePanel = () => {
  const [pick, setPick] = useState<DiscoverSurpriseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const seen = useRef<number[]>([]);

  const spin = useCallback(async (manual: boolean) => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await storyApi.getDiscoverSurprise(seen.current);
      if (response.recycled) seen.current = [];
      if (response.story) {
        seen.current = [...seen.current, response.story.id];
        writeSeen(seen.current);
      }
      setPick(response);
      if (manual) trackAnalyticsEvent({ event_type: "surprise_me_clicked", metadata: { surface: "discover" } });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    seen.current = readSeen();
    void spin(false);
  }, [spin]);

  const story = pick?.story ?? null;

  return (
    <section className="flex min-h-[210px] flex-col rounded-2xl bg-slate-900 p-4 text-white shadow-lg sm:p-5" aria-label="Surprise me">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-rose-200">Surprise me</p>
      {loading && !story && (
        <div className="mt-3 flex flex-1 items-center justify-center" aria-busy="true">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        </div>
      )}
      {!loading && !story && (
        <p className="mt-3 flex-1 text-sm text-slate-300">
          {failed ? "We couldn't pick a story just now." : "Nothing to suggest yet."}
        </p>
      )}
      {story && (
        <div className={`mt-3 flex flex-1 gap-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <Link to={`/read/${story.slug}`} className="w-[86px] shrink-0 sm:w-24" tabIndex={-1} aria-hidden="true">
            <div className="aspect-[2/3] overflow-hidden rounded-md bg-slate-800 shadow-md">
              <CoverImage src={story.cover_image} alt="" title={story.title} author={story.author} className="h-full w-full object-cover" />
            </div>
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="font-display text-xl font-bold leading-tight sm:text-2xl">{story.title}</h2>
            <p className="mt-0.5 text-sm text-slate-300">
              {[story.author, story.genres?.[0]].filter(Boolean).join(" · ")}
            </p>
            {pick?.blurb && <p className="mt-2 line-clamp-3 text-sm text-slate-200">{pick.blurb}</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              <Button asChild size="sm" className="h-11 rounded-lg bg-white px-4 font-bold text-slate-900 hover:bg-white/90">
                <Link to={`/read/${story.slug}`}>Start reading</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => void spin(true)}
                className="h-11 rounded-lg border-white/35 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white"
              >
                {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Dices className="mr-1.5 h-4 w-4" />}
                Spin again
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const Chip = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: string }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${
      selected ? "border-slate-900 bg-slate-900 text-white" : "border-border bg-background text-foreground hover:border-slate-400"
    }`}
  >
    {children}
  </button>
);

/** Mood and time, one choice each, one button that opens the Library with both applied. */
const Finder = () => {
  const [moodSlug, setMoodSlug] = useState<string | null>(null);
  const [timeKey, setTimeKey] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ["moods"], queryFn: storyApi.getMoods, staleTime: 5 * 60 * 1000 });
  const moods = (data?.moods ?? []).filter((mood) => mood.stories_count > 0);
  const mood = moods.find((item) => item.slug === moodSlug) ?? null;
  const toggle = <T,>(current: T | null, value: T, set: (next: T | null) => void) => set(current === value ? null : value);

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5" aria-label="Find a story">
      {moods.length > 0 && (
        <>
          <h2 className="text-[15px] font-bold">How do you want to feel?</h2>
          <div className="-mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible" role="group" aria-label="Mood">
            {moods.map((item) => (
              <Chip key={item.slug} selected={moodSlug === item.slug} onClick={() => toggle(moodSlug, item.slug, setMoodSlug)}>
                {item.name}
              </Chip>
            ))}
          </div>
        </>
      )}
      <h2 className={`text-[15px] font-bold ${moods.length > 0 ? "mt-4" : ""}`}>How much time do you have?</h2>
      <div className="-mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible" role="group" aria-label="Time">
        {TIME_OPTIONS.map((option) => (
          <Chip key={option.key} selected={timeKey === option.key} onClick={() => toggle(timeKey, option.key, setTimeKey)}>
            {option.label}
          </Chip>
        ))}
      </div>
      <Button asChild size="lg" className="mt-4 h-12 w-full rounded-xl text-[15px] font-bold">
        <Link to={finderHref(moodSlug, timeKey)}>{finderLabel(mood?.name ?? null, timeKey)}</Link>
      </Button>
    </section>
  );
};

/** Two ways in side by side on a wide screen, stacked on a phone. */
const DiscoverHero = () => (
  <div className="border-b bg-card">
    <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Discover</h1>
      <p className="mb-5 mt-1.5 text-sm text-muted-foreground sm:text-base">
        Start with a feeling, the time you have, or a place on the map.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SurprisePanel />
        <Finder />
      </div>
    </div>
  </div>
);

export default DiscoverHero;
