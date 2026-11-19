import FullScreenLoader from "@/components/FullScreenLoader";
import VideoCard, { formatDuration } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { storyApi } from "@/api/story";
import type { PublicVideo, VideoSeries } from "@/api/types";
import { buildMeta } from "@/lib/buildMeta";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Loader2, Play, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";

export function meta() {
  return buildMeta({
    title: "Watch — Video Narrations | WorldStories",
    description: "Watch short stories, illustrated classics, folk tales, and full audiobooks.",
    path: "/watch",
  });
}

const lengthOptions = [["", "Any"], ["short", "Under 5 min"], ["mid", "5–20 min"], ["long", "20 min+"]] as const;
const minutesLeft = (seconds: number) => `${Math.max(1, Math.ceil(seconds / 60))} min left`;

function Shelf({ series, videos }: { series: VideoSeries; videos: PublicVideo[] }) {
  if (!videos.length) return null;
  const tall = series.layout === "tall";
  return (
    <section className="min-w-0" aria-labelledby={`shelf-${series.slug}`}>
      <div className="mb-4">
        <h2 id={`shelf-${series.slug}`} className="font-serif text-2xl font-semibold tracking-tight">{series.name}</h2>
        {series.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{series.description}</p>}
      </div>
      {tall ? (
        <Carousel opts={{ align: "start", dragFree: true }} className="group/carousel">
          <CarouselContent>
            {videos.map((video) => <CarouselItem key={video.id} className="basis-[44%] min-[480px]:basis-[32%] sm:basis-1/4 lg:basis-1/7"><VideoCard video={video} tall /></CarouselItem>)}
          </CarouselContent>
          <CarouselPrevious aria-label={`Previous ${series.name}`} className="-top-9 left-auto right-12 hidden h-11 w-11 translate-y-0 disabled:hidden md:inline-flex" />
          <CarouselNext aria-label={`Next ${series.name}`} className="-top-9 right-0 hidden h-11 w-11 translate-y-0 disabled:hidden md:inline-flex" />
        </Carousel>
      ) : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{videos.map((video) => <WideCard key={video.id} video={video} />)}</div>}
    </section>
  );
}

function WideCard({ video }: { video: PublicVideo }) {
  const duration = formatDuration(video.duration_seconds);
  return (
    <article className="group min-w-0">
      <Link to={`/watch/${video.id}`} className="block">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted"><img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />{duration && <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">{duration}</span>}</div>
        <p className="mt-2 line-clamp-2 font-medium leading-snug">{video.display_title}</p>
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">{[video.video_type?.name, video.story?.author].filter(Boolean).join(" · ")}</p>
      {video.story && <Link to={`/story/${video.story.slug}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline">Read the story</Link>}
    </article>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{children}</button>;
}

export default function Watch() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const series = params.get("series") || "";
  const length = params.get("length") || "";
  const sort = params.get("sort") || "newest";
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => setSearchInput(q), [q]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchInput.trim()) next.set("q", searchInput.trim()); else next.delete("q");
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, params, setParams]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  const { data: overview, isLoading: overviewLoading } = useQuery({ queryKey: ["watch-overview"], queryFn: storyApi.getWatchOverview });
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["watch-videos", q, series, length, sort],
    queryFn: ({ pageParam }) => storyApi.getVideos(pageParam as number, { q, series, length, sort }),
    initialPageParam: 1,
    placeholderData: keepPreviousData,
    getNextPageParam: (last) => last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined,
  });
  const videos = useMemo(() => data?.pages.flatMap((page) => page.results) || [], [data]);
  const count = data?.pages[0]?.pagination.count ?? overview?.count ?? 0;
  const wideVideos = videos.filter((video) => (video.series?.layout || (video.aspect_ratio === "9:16" ? "tall" : "wide")) === "wide");
  const shortVideos = videos.filter((video) => !wideVideos.includes(video));
  const featured = overview?.featured;
  const curiosities = overview?.shelves.find((shelf) => !shelf.series.is_story_content);
  const regularShelves = overview?.shelves.filter((shelf) => shelf.series.is_story_content) || [];
  const pairSlugs = new Set(["4-minute-illustrated-classics", "folk-tales-fables"]);
  const pair = regularShelves.filter((shelf) => pairSlugs.has(shelf.series.slug) && shelf.videos.length <= 3);

  if (overviewLoading && isLoading) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-zinc-950 text-white">
        <div className="container mx-auto px-3 py-8 sm:px-4 sm:py-12">
          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div><h1 className="font-serif text-4xl font-semibold sm:text-5xl">Watch</h1><p className="mt-2 text-sm text-zinc-300 sm:text-base">{overview?.count ?? count} videos · stories you can watch, from 2-minute shorts to full audiobooks</p></div>
            <label className="relative block w-full lg:max-w-sm"><span className="sr-only">Search videos</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search videos or stories" className="h-12 border-zinc-700 bg-zinc-900 pl-10 text-white placeholder:text-zinc-500" /></label>
          </div>
          {featured && <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]">
            <Link to={`/watch/${featured.id}`} aria-label={`Play ${featured.display_title}`} className="group relative block aspect-video overflow-hidden rounded-xl bg-zinc-900"><img src={featured.thumbnail} alt={`Thumbnail for ${featured.display_title}`} className="h-full w-full object-cover" /><span className="absolute inset-0 grid place-items-center bg-black/20"><span className="grid h-16 w-16 place-items-center rounded-full bg-white text-zinc-950 shadow-xl transition-transform group-hover:scale-105"><Play className="ml-1 h-7 w-7 fill-current" /></span></span>{featured.duration_seconds && <span className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-1 text-xs">{formatDuration(featured.duration_seconds)}</span>}</Link>
            <div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold">Featured</span>{featured.series && <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">{featured.series.name}</span>}{featured.video_type && <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">{featured.video_type.name}</span>}</div><h2 className="mt-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">{featured.display_title}</h2>{featured.story && <p className="mt-2 text-zinc-300">{featured.story.title}{featured.story.author ? ` · ${featured.story.author}` : ""}</p>}<p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{featured.description}</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild className="min-h-11 bg-white text-zinc-950 hover:bg-zinc-200"><Link to={`/watch/${featured.id}`}><Play className="mr-2 h-4 w-4 fill-current" />Play</Link></Button>{featured.story && <Button asChild variant="outline" className="min-h-11 border-zinc-600 bg-transparent text-white hover:bg-zinc-800 hover:text-white"><Link to={`/story/${featured.story.slug}`}>Read the story</Link></Button>}</div></div>
          </div>}
        </div>
      </section>

      <main className="container mx-auto space-y-12 px-3 py-10 sm:px-4 sm:py-14">
        {!!overview?.continue_watching.length && <section><h2 className="mb-4 font-serif text-2xl font-semibold">Continue watching</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{overview.continue_watching.map(({ video, progress_percent, seconds_left }) => <Link key={video.id} to={`/watch/${video.id}`} className="group"><div className="relative aspect-video overflow-hidden rounded-lg bg-muted"><img src={video.thumbnail} alt="" className="h-full w-full object-cover" /><div className="absolute inset-x-0 bottom-0 h-1 bg-white/30"><div className="h-full bg-primary" style={{ width: `${progress_percent}%` }} /></div></div><p className="mt-2 line-clamp-1 font-medium">{video.display_title}</p><p className="text-xs text-muted-foreground">{minutesLeft(seconds_left)}</p></Link>)}</div></section>}

        {regularShelves.map((shelf) => {
          if (pair.length === 2 && pairSlugs.has(shelf.series.slug)) {
            if (shelf.series.slug !== pair[0].series.slug) return null;
            return <div key="paired-shelves" className="grid gap-12 xl:grid-cols-2">{pair.map((item) => <Shelf key={item.series.slug} {...item} />)}</div>;
          }
          return <Shelf key={shelf.series.slug} {...shelf} />;
        })}
        {curiosities && <Shelf {...curiosities} />}

        <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="all-videos-heading">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 id="all-videos-heading" className="font-serif text-2xl font-semibold">All videos</h2><p className="text-sm text-muted-foreground">{count} {count === 1 ? "video" : "videos"}</p></div><label className="flex items-center gap-2 text-sm"><span>Sort</span><select value={sort} onChange={(event) => updateParam("sort", event.target.value)} className="min-h-11 rounded-md border bg-background px-3"><option value="newest">Newest</option><option value="most_watched">Most watched</option><option value="shortest">Shortest</option><option value="longest">Longest</option></select></label></div>
          <div className="mt-6"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Length</p><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-none">{lengthOptions.map(([value, label]) => <Chip key={label} active={length === value} onClick={() => updateParam("length", value)}>{label}</Chip>)}</div></div>
          <div className="mt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Series</p><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-none"><Chip active={!series} onClick={() => updateParam("series", "")}>All</Chip>{overview?.shelves.map((shelf) => <Chip key={shelf.series.slug} active={series === shelf.series.slug} onClick={() => updateParam("series", shelf.series.slug)}>{shelf.series.name}</Chip>)}</div></div>
          {wideVideos.length > 0 && <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{wideVideos.map((video) => <div key={video.id}><VideoCard video={video} showSeries />{video.other_versions.length > 0 && <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">Also: {video.other_versions.map((version) => version.series_name || version.display_title).join(" · ")}</p>}</div>)}</div>}
          {shortVideos.length > 0 && <div className="mt-10"><h3 className="mb-4 font-serif text-xl font-semibold">Shorts</h3><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{shortVideos.map((video) => <VideoCard key={video.id} video={video} tall showSeries />)}</div></div>}
          {!videos.length && !isLoading && <div className="mt-8 rounded-lg border border-dashed p-10 text-center text-muted-foreground">No videos match — try another length or series.</div>}
          {hasNextPage && <div className="mt-8 text-center"><Button variant="outline" className="min-h-11" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>{isFetchingNextPage ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</> : "Load more"}</Button></div>}
        </section>
      </main>
    </div>
  );
}
