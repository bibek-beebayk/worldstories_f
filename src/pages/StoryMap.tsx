import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { geoCentroid } from "d3-geo";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import worldGeography from "world-atlas/countries-110m.json";
import { BookOpen, ChevronRight, Headphones, Minus, Plus, RotateCcw, Search, Video } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { storyApi } from "@/api/story";
import type { StoryMapCountry, StoryMapRegion } from "@/api/types";
import StoryCard from "@/components/StoryCard";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildMeta } from "@/lib/buildMeta";
import { EMPTY_COUNTRY_COLOR, HEAT_COLORS, bucketColor, numericCountryCode, storyBucketIndex } from "@/lib/geoMapColors";
import { STORY_MAP_HOOKS } from "@/lib/storyMapHighlights";
import type { Route } from "./+types/StoryMap";

const MAP_BORDER_COLOR = "hsl(var(--background))";
const MAP_SELECTED_COLOR = "hsl(var(--foreground))";
const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 18;
const MAP_ZOOM_FACTOR = 1.5;
const DEFAULT_MAP_CENTER: [number, number] = [0, 4];
const EUROPE_MAP_CENTER: [number, number] = [15, 52];
const EUROPE_MAP_ZOOM = 4;
const REGION_ORDER: StoryMapRegion["name"][] = ["Europe", "Asia", "Americas", "Africa", "Oceania", "Other"];
const LEGEND_LABELS = ["1", "2–4", "5–9", "10–24", "25+"];
const BUBBLE_SIZES = [26, 30, 34, 40, 48];
const COUNTRY_MARKERS: Record<string, [number, number]> = {
  AD: [1.6, 42.5], AG: [-61.8, 17.1], BH: [50.55, 26.05], BB: [-59.54, 13.19],
  CV: [-23.6, 15.1], KM: [43.3, -11.7], DM: [-61.37, 15.4], GD: [-61.68, 12.1],
  KI: [173, 1.9], LI: [9.55, 47.16], MV: [73.2, 3.2], MT: [14.4, 35.9],
  MH: [171.2, 7.1], MU: [57.5, -20.2], FM: [158.2, 6.9], MC: [7.42, 43.74],
  NR: [166.9, -0.5], PW: [134.5, 7.5], KN: [-62.8, 17.3], LC: [-61, 13.9],
  VC: [-61.2, 13.25], WS: [-172.1, -13.8], SM: [12.46, 43.94], ST: [6.7, 0.2],
  SC: [55.45, -4.6], SG: [103.8, 1.35], TO: [-175.2, -21.2], TV: [179.2, -8.5],
  VA: [12.45, 41.9],
};

type MapView = "world" | "europe";
type MobileTab = "list" | "map";
type StoryFormat = "all" | "read" | "listen" | "watch" | "read_along";
type MapPosition = { coordinates: [number, number]; zoom: number };

export function meta() {
  return buildMeta({
    title: "Story Map — Explore Stories Around the World | WorldStories",
    description: "Explore WorldStories by country and region on an interactive map of the collection.",
    path: "/story-map",
  });
}

export async function loader() {
  try {
    return await storyApi.getStoryMap();
  } catch {
    return undefined;
  }
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Story count color scale">
      {LEGEND_LABELS.map((label, index) => (
        <span key={label} className="inline-flex items-center gap-1">
          <span className="h-3.5 w-5 rounded-sm border border-border/60" style={{ backgroundColor: HEAT_COLORS[index] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function ViewButtons({ view, onChange }: { view: MapView; onChange: (view: MapView) => void }) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/40 p-1" aria-label="Map area">
      {(["world", "europe"] as const).map((option) => (
        <button key={option} type="button" aria-pressed={view === option} onClick={() => onChange(option)} className={`min-h-9 rounded-md px-3 text-sm font-medium capitalize transition-colors ${focusRing} ${view === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {option}
        </button>
      ))}
    </div>
  );
}

function CountryBubble({ country, coordinates, zoom, selected, onSelect }: { country: StoryMapCountry; coordinates: [number, number]; zoom: number; selected: boolean; onSelect: (country: StoryMapCountry, source: "map") => void }) {
  const bucket = Math.max(0, storyBucketIndex(country.stories_count));
  const scale = 1 / Math.sqrt(zoom);
  const radius = (BUBBLE_SIZES[bucket] / 2) * scale;
  const dark = country.stories_count >= 5;
  return (
    <Marker coordinates={coordinates}>
      <g role="button" tabIndex={0} aria-label={`${country.name}: ${country.stories_count} ${country.stories_count === 1 ? "story" : "stories"}`} className="cursor-pointer focus-visible:outline-none focus-visible:[&>circle]:stroke-primary focus-visible:[&>circle]:stroke-[4]" onClick={(event) => { event.stopPropagation(); onSelect(country, "map"); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(country, "map"); } }}>
        <circle r={radius} fill={dark ? bucketColor(country.stories_count) : "hsl(var(--background))"} stroke={selected ? MAP_SELECTED_COLOR : "hsl(var(--background))"} strokeWidth={(selected ? 4 : 2.5) * scale} />
        <text textAnchor="middle" dominantBaseline="central" fill={dark ? "white" : "hsl(var(--primary))"} fontSize={Math.max(8, 11 * scale)} fontWeight={800} pointerEvents="none">{country.stories_count}</text>
      </g>
    </Marker>
  );
}

function StoryMapGraphic({ countries, regions, selectedCode, focusEuropeToken, onSelect }: { countries: StoryMapCountry[]; regions: StoryMapRegion[]; selectedCode: string | null; focusEuropeToken: number; onSelect: (country: StoryMapCountry, source: "map") => void }) {
  const [view, setView] = useState<MapView>("world");
  const [position, setPosition] = useState<MapPosition>({ coordinates: DEFAULT_MAP_CENTER, zoom: MIN_MAP_ZOOM });
  const [tooltip, setTooltip] = useState<{ country: StoryMapCountry | null; name: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const countryByNumericCode = useMemo(() => new Map(countries.flatMap((country) => {
    const numeric = numericCountryCode(country.code);
    return numeric ? [[numeric, country] as const] : [];
  })), [countries]);
  const europeStories = regions.find((region) => region.name === "Europe")?.stories_count || 0;

  useEffect(() => () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }, []);

  const moveTo = useCallback((target: MapPosition) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPosition(target);
      return;
    }
    const start = position;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 280);
      const eased = 1 - Math.pow(1 - progress, 3);
      setPosition({ coordinates: [start.coordinates[0] + (target.coordinates[0] - start.coordinates[0]) * eased, start.coordinates[1] + (target.coordinates[1] - start.coordinates[1]) * eased], zoom: start.zoom + (target.zoom - start.zoom) * eased });
      if (progress < 1) animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
  }, [position]);

  const changeView = (next: MapView) => {
    setTooltip(null);
    setView(next);
    moveTo(next === "europe" ? { coordinates: EUROPE_MAP_CENTER, zoom: EUROPE_MAP_ZOOM } : { coordinates: DEFAULT_MAP_CENTER, zoom: MIN_MAP_ZOOM });
  };

  useEffect(() => {
    if (focusEuropeToken > 0) changeView("europe");
    // The token is deliberately the only trigger; changeView closes over the
    // current map position so the transition starts wherever the reader left it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEuropeToken]);

  const updateTooltip = (event: React.MouseEvent<SVGElement>, country: StoryMapCountry | undefined, name: string) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (bounds) setTooltip({ country: country || null, name, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm lg:h-[650px]">
      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><ViewButtons view={view} onChange={changeView} /><MapLegend /></div>
      <div ref={containerRef} className="relative h-[360px] bg-gradient-to-b from-primary/5 to-background sm:h-[510px] lg:h-[540px]">
        <ComposableMap width={800} height={430} projection="geoEqualEarth" projectionConfig={{ scale: 148, center: DEFAULT_MAP_CENTER }} className="h-full w-full" style={{ touchAction: "none" }} role="img" aria-label="World map showing story counts by country across Europe, Asia, the Americas, Africa, Oceania, and other regions">
          <ZoomableGroup center={position.coordinates} zoom={position.zoom} minZoom={MIN_MAP_ZOOM} maxZoom={MAX_MAP_ZOOM} translateExtent={[[0, 0], [800, 430]]} onMoveStart={() => setTooltip(null)} onMoveEnd={({ coordinates, zoom }) => setPosition({ coordinates, zoom })}>
            <Geographies geography={worldGeography}>
              {({ geographies }) => {
                const atlasCodes = new Set(geographies.map((geography) => String(geography.id).padStart(3, "0")));
                return <>
                  {geographies.map((geography) => {
                    const country = countryByNumericCode.get(String(geography.id).padStart(3, "0"));
                    const name = country?.name || geography.properties.name || "Unknown country";
                    const selected = country?.code === selectedCode;
                    return <Geography key={geography.rsmKey} geography={geography} onMouseMove={(event) => updateTooltip(event, country, name)} onMouseLeave={() => setTooltip(null)} onClick={() => country && onSelect(country, "map")} fill={bucketColor(country?.stories_count || 0)} stroke={selected ? MAP_SELECTED_COLOR : MAP_BORDER_COLOR} strokeWidth={selected ? 1.8 : 0.65} style={{ default: { outline: "none", transition: "fill 160ms ease" }, hover: { fill: country ? "hsl(var(--primary) / 0.82)" : EMPTY_COUNTRY_COLOR, outline: "none", cursor: country ? "pointer" : "default" }, pressed: { fill: country ? "hsl(var(--primary))" : EMPTY_COUNTRY_COLOR, outline: "none" } }} />;
                  })}
                  {geographies.map((geography) => {
                    const country = countryByNumericCode.get(String(geography.id).padStart(3, "0"));
                    if (!country || (view === "world" && position.zoom < 2.5 && country.region === "Europe")) return null;
                    const centroid = geoCentroid(geography as Parameters<typeof geoCentroid>[0]) as [number, number];
                    return <CountryBubble key={`bubble-${country.code}`} country={country} coordinates={centroid} zoom={position.zoom} selected={selectedCode === country.code} onSelect={onSelect} />;
                  })}
                  {countries.map((country) => {
                    const numeric = numericCountryCode(country.code);
                    const fallback = COUNTRY_MARKERS[country.code];
                    if (!fallback || (numeric && atlasCodes.has(numeric)) || (view === "world" && position.zoom < 2.5 && country.region === "Europe")) return null;
                    return <CountryBubble key={`fallback-${country.code}`} country={country} coordinates={fallback} zoom={position.zoom} selected={selectedCode === country.code} onSelect={onSelect} />;
                  })}
                  {view === "world" && position.zoom < 2.5 && europeStories > 0 && <Marker coordinates={EUROPE_MAP_CENTER}><g role="button" tabIndex={0} aria-label={`Europe: ${europeStories} stories. Zoom into Europe.`} className="cursor-pointer outline-none" onClick={() => changeView("europe")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); changeView("europe"); } }}><rect x={-42} y={-14} width={84} height={28} rx={14} fill="hsl(var(--foreground))" stroke="hsl(var(--background))" strokeWidth={2} /><text textAnchor="middle" dominantBaseline="central" fill="hsl(var(--background))" fontSize={11} fontWeight={800}>Europe {europeStories}</text></g></Marker>}
                </>;
              }}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        <div className="absolute bottom-3 right-3 z-20 flex flex-col overflow-hidden rounded-xl border bg-card/95 shadow-lg backdrop-blur" role="group" aria-label="Map zoom controls">
          <button type="button" onClick={() => setPosition((current) => ({ ...current, zoom: Math.min(MAX_MAP_ZOOM, current.zoom * MAP_ZOOM_FACTOR) }))} disabled={position.zoom >= MAX_MAP_ZOOM} className={`flex h-11 w-11 items-center justify-center hover:bg-primary/10 disabled:opacity-40 ${focusRing}`} aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
          <button type="button" onClick={() => setPosition((current) => ({ ...current, zoom: Math.max(MIN_MAP_ZOOM, current.zoom / MAP_ZOOM_FACTOR) }))} disabled={position.zoom <= MIN_MAP_ZOOM} className={`flex h-11 w-11 items-center justify-center border-y hover:bg-primary/10 disabled:opacity-40 ${focusRing}`} aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
          <button type="button" onClick={() => changeView(view)} className={`flex h-11 w-11 items-center justify-center hover:bg-primary/10 ${focusRing}`} aria-label="Reset map position"><RotateCcw className="h-4 w-4" /></button>
        </div>
        {tooltip && <div className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border bg-popover/95 px-3 py-2 text-center shadow-xl" style={{ left: tooltip.x, top: tooltip.y }}><p className="text-xs font-semibold">{tooltip.country?.name || tooltip.name}</p><p className="text-[11px] text-muted-foreground">{tooltip.country ? `${tooltip.country.region} · ${tooltip.country.stories_count} ${tooltip.country.stories_count === 1 ? "story" : "stories"}` : "No stories yet"}</p></div>}
      </div>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">Small countries get a bubble so you can always tap them. Countries without stories yet are grey.</p>
    </div>
  );
}

function CountryGroups({ countries, search, selectedCode, onSelect, mobile = false }: { countries: StoryMapCountry[]; search: string; selectedCode: string | null; onSelect: (country: StoryMapCountry, source: "list") => void; mobile?: boolean }) {
  const maxCount = Math.max(...countries.map((country) => country.stories_count), 1);
  const filtered = countries.filter((country) => country.name.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="space-y-5">{REGION_ORDER.map((region) => {
    const rows = filtered.filter((country) => country.region === region).sort((a, b) => a.name.localeCompare(b.name));
    if (!rows.length) return null;
    return <section key={region} aria-labelledby={`region-${region.toLowerCase()}`}><h3 id={`region-${region.toLowerCase()}`} className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{region}</h3><div className={mobile ? "overflow-hidden rounded-xl border bg-card" : "space-y-1"}>{rows.map((country) => {
      const selected = country.code === selectedCode;
      const width = Math.max(10, (Math.log1p(country.stories_count) / Math.log1p(maxCount)) * 100);
      return <button key={country.code} type="button" aria-pressed={selected} onClick={() => onSelect(country, "list")} className={`${focusRing} group flex min-h-[52px] w-full items-center gap-3 text-left transition-colors ${mobile ? "border-b px-3 last:border-b-0" : "rounded-lg px-2.5 py-2"} ${selected ? "bg-primary/10 text-primary" : "hover:bg-muted/70"}`}>{mobile ? <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: bucketColor(country.stories_count) }} /> : <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: `${width}%`, backgroundColor: bucketColor(country.stories_count) }} /></span>}<span className="min-w-0 flex-1 truncate text-sm font-medium">{country.name}</span><span className="text-sm tabular-nums text-muted-foreground">{country.stories_count}</span>{mobile && <ChevronRight className="h-4 w-4 text-muted-foreground" />}</button>;
    })}</div></section>;
  })}{filtered.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No countries match that search.</p>}</div>;
}

function CountrySearch({ value, onChange, id }: { value: string; onChange: (value: string) => void; id: string }) {
  return <div className="relative"><label htmlFor={id} className="sr-only">Find a country</label><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Find a country" className={`h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-base placeholder:text-muted-foreground sm:text-sm ${focusRing}`} /></div>;
}

function StartSomewhere({ countries, onSelect }: { countries: StoryMapCountry[]; onSelect: (country: StoryMapCountry, source: "list") => void }) {
  const highlights = useMemo(() => {
    const byCode = new Map(countries.map((country) => [country.code, country]));
    const preferred = Object.keys(STORY_MAP_HOOKS).flatMap((code) => byCode.get(code) ? [byCode.get(code)!] : []);
    const topThree = new Set([...countries].sort((a, b) => b.stories_count - a.stories_count).slice(0, 3).map((country) => country.code));
    const fallbacks = countries.filter((country) => country.stories_count >= 2 && !topThree.has(country.code) && !preferred.some((item) => item.code === country.code));
    return [...preferred, ...fallbacks].slice(0, 6);
  }, [countries]);
  if (!highlights.length) return null;
  return <section className="rounded-2xl bg-foreground p-5 text-background shadow-lg sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-background/60">Start somewhere</p><h2 className="mt-1 text-xl font-bold">Pick a place on the map, or try one of these.</h2><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">{highlights.map((country, index) => {
    const authorNames = country.top_authors.slice(0, 2).map((author) => author.name).join(", ");
    const hook = STORY_MAP_HOOKS[country.code] || `${country.stories_count} stories${authorNames ? ` · ${authorNames}` : ""}`;
    return <button key={country.code} type="button" onClick={() => onSelect(country, "list")} className={`${index >= 4 ? "hidden lg:block" : "block"} min-h-20 rounded-xl border border-background/15 bg-background/10 p-3 text-left transition-colors hover:bg-background/15 ${focusRing}`}><span className="block font-semibold">{country.name}</span><span className="mt-1 block text-sm text-background/65">{hook}</span></button>;
  })}</div></section>;
}

export default function StoryMap({ loaderData }: Route.ComponentProps) {
  const { data, isLoading, isError } = useQuery({ queryKey: ["story-map"], queryFn: storyApi.getStoryMap, initialData: loaderData });
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("list");
  const [format, setFormat] = useState<StoryFormat>("all");
  const [sort, setSort] = useState("newest");
  const [focusEuropeToken, setFocusEuropeToken] = useState(0);
  const detailRef = useRef<HTMLElement | null>(null);
  const requestedCode = searchParams.get("country")?.toUpperCase() || null;
  const countryByCode = useMemo(() => new Map((data?.countries || []).map((country) => [country.code, country])), [data]);
  const selectedCountry = requestedCode ? countryByCode.get(requestedCode) || null : null;

  useEffect(() => {
    if (data && requestedCode && !countryByCode.has(requestedCode)) {
      const next = new URLSearchParams(searchParams);
      next.delete("country");
      setSearchParams(next, { replace: true });
    }
  }, [countryByCode, data, requestedCode, searchParams, setSearchParams]);

  useEffect(() => { setFormat("all"); setSort("newest"); }, [requestedCode]);

  const selectCountry = useCallback((country: StoryMapCountry, source: "map" | "list") => {
    const next = new URLSearchParams(searchParams);
    next.set("country", country.code);
    setSearchParams(next, { replace: true });
    if (source === "list" && country.region === "Europe") setFocusEuropeToken((token) => token + 1);
    if (source === "map") setMobileTab("map");
    requestAnimationFrame(() => {
      const element = detailRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      if (mobile || rect.top < 0 || rect.bottom > window.innerHeight) element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
  }, [searchParams, setSearchParams]);

  const clearSelection = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("country");
    setSearchParams(next, { replace: true });
  };

  const formats: Array<{ value: StoryFormat; label: string; icon?: typeof BookOpen }> = [
    { value: "all", label: "All formats" }, { value: "read", label: "Read", icon: BookOpen },
    { value: "listen", label: "Listen", icon: Headphones }, { value: "watch", label: "Watch", icon: Video },
    { value: "read_along", label: "Read-along", icon: BookOpen },
  ];
  const stories = useInfiniteQuery({
    queryKey: ["story-map-stories", selectedCountry?.code, format, sort],
    queryFn: ({ pageParam }) => storyApi.getStories(pageParam as number, [], sort, "all", "", "all", "all", [], format === "listen", false, selectedCountry?.code || "all", format === "watch", [], format === "read_along", format === "read" ? "read" : "all"),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
    enabled: Boolean(selectedCountry),
  });
  const storyRows = stories.data?.pages.flatMap((page) => page.results) || [];
  const pagination = stories.data?.pages.at(-1)?.pagination;
  const remaining = Math.max(0, (pagination?.count || 0) - storyRows.length);
  const showMoreCount = remaining;

  if (isLoading && !data) return <FullScreenLoader />;

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.09),transparent_38%)]">
    <header className="border-b bg-background/85"><div className="container mx-auto flex flex-col gap-5 px-4 py-8 sm:py-10 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Story Map</h1><p className="mt-2 text-base text-muted-foreground">Travel the collection by where each story comes from.</p></div>{data && <div className="flex gap-2" aria-label="Story map summary"><span className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold">{data.total_stories} stories</span><span className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold">{data.countries_count} countries</span></div>}</div></header>
    <main className="container mx-auto space-y-7 px-3 py-6 sm:px-4 sm:py-9">
      {isError || !data ? <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">The story map could not be loaded. Please try again.</div> : <>
        <div className="space-y-4 lg:hidden"><div role="tablist" aria-label="Explore countries" className="grid grid-cols-2 rounded-xl border bg-muted/40 p-1">{(["list", "map"] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={mobileTab === tab} onClick={() => setMobileTab(tab)} className={`min-h-11 rounded-lg text-sm font-semibold capitalize ${focusRing} ${mobileTab === tab ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{tab}</button>)}</div><CountrySearch id="mobile-country-search" value={search} onChange={setSearch} /></div>
        <div className="hidden gap-5 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]"><StoryMapGraphic countries={data.countries} regions={data.regions} selectedCode={selectedCountry?.code || null} focusEuropeToken={focusEuropeToken} onSelect={selectCountry} /><aside className="flex h-[650px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm" aria-label="Countries by region"><div className="border-b p-4"><CountrySearch id="desktop-country-search" value={search} onChange={setSearch} /></div><div className="min-h-0 flex-1 overflow-y-auto p-4"><CountryGroups countries={data.countries} search={search} selectedCode={selectedCountry?.code || null} onSelect={selectCountry} /></div></aside></div>
        <div className="lg:hidden">{mobileTab === "map" ? <StoryMapGraphic countries={data.countries} regions={data.regions} selectedCode={selectedCountry?.code || null} focusEuropeToken={focusEuropeToken} onSelect={selectCountry} /> : <div className="space-y-6">{!selectedCountry && <StartSomewhere countries={data.countries} onSelect={selectCountry} />}<CountryGroups countries={data.countries} search={search} selectedCode={selectedCountry?.code || null} onSelect={selectCountry} mobile /></div>}</div>
        {!selectedCountry && <div className="hidden lg:block"><StartSomewhere countries={data.countries} onSelect={selectCountry} /></div>}
        {selectedCountry && <section ref={detailRef} className="scroll-mt-24 rounded-2xl border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="country-stories-heading">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start"><div><div className="flex flex-wrap items-center gap-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{selectedCountry.region}</p><button type="button" onClick={clearSelection} className={`text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline ${focusRing}`}>Clear selection</button></div><h2 id="country-stories-heading" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Stories from {selectedCountry.name}</h2><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{selectedCountry.stories_count} {selectedCountry.stories_count === 1 ? "story" : "stories"}</span>{selectedCountry.top_authors.map((author) => <Link key={author.slug} to={`/authors/${author.slug}`} className={`rounded-full border px-3 py-1 text-sm font-medium hover:border-primary hover:text-primary ${focusRing}`}>{author.name}</Link>)}</div></div>{selectedCountry.journey && <Link to={`/journeys/${selectedCountry.journey.slug}`} className={`block rounded-xl border border-primary/25 bg-primary/5 p-4 hover:bg-primary/10 lg:w-64 ${focusRing}`}><span className="block text-xs font-bold uppercase tracking-[0.14em] text-primary">Story Journey</span><span className="mt-1 block font-semibold">{selectedCountry.journey.title}</span><span className="mt-2 block text-sm text-muted-foreground">Read them in order →</span></Link>}</div>
          <div className="mt-6 flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2" aria-label="Story format">{formats.map((option) => { const Icon = option.icon; return <button key={option.value} type="button" aria-pressed={format === option.value} onClick={() => setFormat(option.value)} className={`min-h-11 rounded-full border px-3 text-sm font-semibold transition-colors ${focusRing} ${format === option.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/50"}`}>{Icon && <Icon className="mr-1.5 inline h-4 w-4" />}{option.label}</button>; })}</div><Select value={sort} onValueChange={setSort}><SelectTrigger className="h-11 w-full sm:w-44" aria-label="Sort stories"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="popular">Most popular</SelectItem><SelectItem value="newest">Newest</SelectItem><SelectItem value="title">A–Z</SelectItem></SelectContent></Select></div>
          {stories.isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading stories…</div> : storyRows.length > 0 ? <><div className={`mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${stories.isFetching ? "opacity-70" : ""}`}>{storyRows.map((story) => <StoryCard key={story.id} {...story} />)}</div><div className="mt-8 text-center">{stories.hasNextPage ? <Button variant="outline" disabled={stories.isFetchingNextPage} onClick={() => stories.fetchNextPage()}>{stories.isFetchingNextPage ? "Loading…" : `Show ${showMoreCount} more`}</Button> : <p className="text-sm text-muted-foreground">That&apos;s all from {selectedCountry.name}.</p>}</div></> : <div className="py-12 text-center"><p className="font-semibold">No {formats.find((item) => item.value === format)?.label.toLowerCase()} stories from {selectedCountry.name} yet</p>{format !== "all" && <Button variant="outline" className="mt-4" onClick={() => setFormat("all")}>Show all formats</Button>}</div>}
        </section>}
      </>}
    </main>
  </div>;
}
