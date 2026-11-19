import { useQuery } from "@tanstack/react-query";
import { Grid2X2, List, Search, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { storyApi } from "@/api/story";
import type { Author } from "@/api/types";
import AuthorPortrait from "@/components/AuthorPortrait";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { buildMeta } from "@/lib/buildMeta";

export function meta() {
  return buildMeta({
    title: "Authors — Discover Writers | WorldStories",
    description: "Meet the authors behind WorldStories and explore every available story.",
    path: "/authors",
  });
}

const ERA_LABELS: Record<string, string> = { ancient: "Ancient", pre_1800: "Before 1800", "1800s": "1800s", "1900s": "1900s", contemporary: "Contemporary" };
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const metaLine = (author: Author) => [author.years_label, author.country_label].filter(Boolean).join(" · ");

function AuthorGridCard({ author }: { author: Author }) {
  return <Link to={`/authors/${author.slug}`} className="group min-w-0"><AuthorPortrait src={author.image} name={author.name} className="aspect-square rounded-lg transition-transform group-hover:-translate-y-0.5" /><h3 className="mt-2 line-clamp-1 font-serif text-base font-semibold group-hover:text-primary">{author.name}</h3><p className="mt-0.5 truncate text-xs text-muted-foreground">{metaLine(author)}</p>{author.known_for && <p className="mt-1 truncate text-xs italic text-muted-foreground">{author.known_for}</p>}<p className="mt-1 text-xs font-medium">{author.titles_count} {author.titles_count === 1 ? "title" : "titles"}</p></Link>;
}

function AuthorRow({ author }: { author: Author }) {
  return <Link to={`/authors/${author.slug}`} className="grid min-h-16 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"><AuthorPortrait src={author.image} name={author.name} className="h-11 w-11 rounded-full" /><div className="min-w-0"><h3 className="truncate font-serif font-semibold">{author.name}</h3><p className="truncate text-xs text-muted-foreground">{[author.years_label, author.country_label, author.known_for].filter(Boolean).join(" · ")}</p></div><span className="text-xs text-muted-foreground">{author.titles_count}</span></Link>;
}

function FilterSheet({ label, children }: { label: string; children: ReactNode }) {
  return <Sheet><SheetTrigger asChild><Button variant="outline" className="min-h-11 flex-1"><SlidersHorizontal className="mr-2 h-4 w-4" />{label}</Button></SheetTrigger><SheetContent side="bottom" className="rounded-t-2xl"><SheetHeader><SheetTitle>{label}</SheetTitle></SheetHeader><div className="mt-5 space-y-2">{children}</div></SheetContent></Sheet>;
}

export default function Authors() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const country = params.get("country") || "";
  const era = params.get("era") || "";
  const sort = params.get("sort") || "az";
  const letter = params.get("letter") || "";
  const view = params.get("view") || "list";
  const [search, setSearch] = useState(q);

  const update = useCallback((key: string, value: string, replace = false) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (next.toString() !== params.toString()) setParams(next, { replace });
  }, [params, setParams]);
  useEffect(() => setSearch(q), [q]);
  useEffect(() => { const timer = window.setTimeout(() => update("q", search.trim(), true), 250); return () => window.clearTimeout(timer); }, [search, update]);
  useEffect(() => { if (!params.has("view") && window.matchMedia("(min-width: 768px)").matches) update("view", "grid", true); }, [params, update]);

  const { data: overview, isLoading: overviewLoading } = useQuery({ queryKey: ["authors-overview"], queryFn: storyApi.getAuthorsOverview });
  const { data, isLoading, isError } = useQuery({ queryKey: ["authors", q, country, era, sort, letter], queryFn: () => storyApi.getAuthors({ q, country, era, sort, letter }) });
  const authors = useMemo(() => data?.results || [], [data]);
  const grouped = useMemo(() => authors.reduce<Record<string, Author[]>>((acc, author) => { const key = (author.sort_name || author.name).trim()[0]?.toUpperCase() || "#"; (acc[key] ||= []).push(author); return acc; }, {}), [authors]);
  const availableLetters = new Set(overview?.letters || []);

  return <div className="min-h-screen bg-muted/20">
    <header className="border-b bg-background"><div className="container mx-auto flex flex-col gap-5 px-4 py-7 md:flex-row md:items-end md:justify-between"><div><h1 className="font-serif text-4xl font-semibold tracking-tight">Authors</h1><p className="mt-2 text-sm text-muted-foreground">{data?.pagination.count ?? 0} writers, poets and collectors behind the WorldStories library</p></div><label className="relative w-full md:max-w-sm"><span className="sr-only">Search authors</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names or known works" className="h-12 pl-10" /></label></div></header>

    <main className="container mx-auto space-y-10 px-4 py-8">
      <section aria-labelledby="featured-authors"><h2 id="featured-authors" className="mb-4 font-serif text-2xl font-semibold">Featured authors</h2>{overviewLoading ? <div className="flex gap-4 overflow-hidden">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-64 min-w-56 animate-pulse rounded-xl bg-muted" />)}</div> : <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 scrollbar-none lg:grid lg:grid-cols-5 lg:overflow-visible">{overview?.featured.map((author) => <Link key={author.id} to={`/authors/${author.slug}`} className="group min-w-[74%] snap-start sm:min-w-[42%] lg:min-w-0"><AuthorPortrait src={author.image} name={author.name} className="aspect-[4/3] rounded-xl" /><h3 className="mt-3 font-serif text-xl font-semibold group-hover:text-primary">{author.name}</h3><p className="mt-1 text-xs text-muted-foreground">{metaLine(author)}</p>{author.known_for && <p className="mt-2 text-sm">Known for <em>{author.known_for}</em></p>}<p className="mt-1 text-xs font-medium text-muted-foreground">{author.titles_count} {author.titles_count === 1 ? "title" : "titles"}</p></Link>)}</div>}</section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="all-authors"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 id="all-authors" className="font-serif text-2xl font-semibold">All authors</h2><p className="text-sm text-muted-foreground">{data?.pagination.count ?? 0} matching</p></div><div className="hidden items-center gap-2 md:flex"><select aria-label="Country" value={country} onChange={(event) => update("country", event.target.value)} className="min-h-11 rounded-md border bg-background px-3"><option value="">All countries</option>{overview?.countries.map((item) => <option key={item.country} value={item.country}>{item.label} ({item.count})</option>)}</select><div className="flex rounded-md border p-1"><button className={`min-h-9 rounded px-3 text-sm ${sort === "az" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => update("sort", "az")}>A–Z</button><button className={`min-h-9 rounded px-3 text-sm ${sort === "titles" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => update("sort", "titles")}>Most titles</button></div><div className="flex"><Button size="icon" variant={view === "grid" ? "default" : "outline"} aria-label="Grid view" onClick={() => update("view", "grid")}><Grid2X2 className="h-4 w-4" /></Button><Button size="icon" variant={view === "list" ? "default" : "outline"} aria-label="List view" onClick={() => update("view", "list")}><List className="h-4 w-4" /></Button></div></div></div>

        <div className="mt-4 flex gap-2 md:hidden"><FilterSheet label="Era"><button className="min-h-11 w-full rounded-md border px-3 text-left" onClick={() => update("era", "")}>All eras</button>{overview?.eras.map((item) => <button key={item.era} className="min-h-11 w-full rounded-md border px-3 text-left" onClick={() => update("era", item.era)}>{ERA_LABELS[item.era]} ({item.count})</button>)}</FilterSheet><FilterSheet label="Country"><button className="min-h-11 w-full rounded-md border px-3 text-left" onClick={() => update("country", "")}>All countries</button>{overview?.countries.map((item) => <button key={item.country} className="min-h-11 w-full rounded-md border px-3 text-left" onClick={() => update("country", item.country)}>{item.label} ({item.count})</button>)}</FilterSheet><FilterSheet label="Sort"><button className="min-h-11 w-full rounded-md border px-3 text-left" onClick={() => update("sort", "az")}>A–Z</button><button className="min-h-11 w-full rounded-md border px-3 text-left" onClick={() => update("sort", "titles")}>Most titles</button></FilterSheet></div>
        <div className="mt-5 hidden flex-wrap gap-2 md:flex"><button onClick={() => update("era", "")} className={`min-h-11 rounded-full border px-4 text-sm ${!era ? "bg-primary text-primary-foreground" : ""}`}>All eras</button>{overview?.eras.map((item) => <button key={item.era} onClick={() => update("era", item.era)} className={`min-h-11 rounded-full border px-4 text-sm ${era === item.era ? "bg-primary text-primary-foreground" : ""}`}>{ERA_LABELS[item.era]}</button>)}</div>
        <nav className="mt-5 flex gap-1 overflow-x-auto pb-2 scrollbar-none" aria-label="Jump by letter"><button onClick={() => update("letter", "")} className={`min-h-11 min-w-11 rounded ${!letter ? "bg-primary text-primary-foreground" : ""}`}>All</button>{alphabet.map((item) => <button key={item} disabled={!availableLetters.has(item)} onClick={() => update("letter", item)} className={`min-h-11 min-w-9 rounded text-sm ${letter === item ? "bg-primary text-primary-foreground" : ""} disabled:text-muted-foreground/30`}>{item}</button>)}</nav>

        {isLoading ? <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">{Array.from({ length: 14 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-lg bg-muted" />)}</div> : isError || !authors.length ? <div className="mt-8 rounded-lg border border-dashed p-10 text-center text-muted-foreground">No authors match these filters</div> : view === "grid" ? <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">{authors.map((author) => <AuthorGridCard key={author.id} author={author} />)}</div> : sort === "titles" ? <div className="mt-6 divide-y">{authors.map((author) => <AuthorRow key={author.id} author={author} />)}</div> : <div className="mt-6 space-y-8">{Object.keys(grouped).sort().map((group) => <section key={group} id={`authors-${group}`}><h3 className="border-b pb-2 font-serif text-3xl font-semibold">{group}</h3><div className="divide-y">{grouped[group].map((author) => <AuthorRow key={author.id} author={author} />)}</div></section>)}</div>}
        {view === "list" && sort === "az" && <div className="fixed right-0 top-1/2 z-20 flex -translate-y-1/2 flex-col rounded-l bg-background/95 px-1 py-2 shadow md:hidden">{alphabet.filter((item) => availableLetters.has(item)).map((item) => <a key={item} href={`#authors-${item}`} className="grid h-5 w-5 place-items-center text-[10px] font-semibold text-primary">{item}</a>)}</div>}
      </section>

      <section className="rounded-2xl bg-zinc-950 p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Anonymous & traditional</p><h2 className="mt-2 max-w-2xl font-serif text-2xl font-semibold">Folk tales, fables and Jataka stories passed down without a single author</h2><Button asChild variant="outline" className="mt-5 min-h-11 border-zinc-600 bg-transparent text-white hover:bg-zinc-800 hover:text-white"><Link to="/library?traditional=true">Browse {overview?.traditional_count ?? 0} stories</Link></Button></section>
    </main>
  </div>;
}
