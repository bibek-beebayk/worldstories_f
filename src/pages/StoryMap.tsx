import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import isoCountries from "i18n-iso-countries";
import worldGeography from "world-atlas/countries-110m.json";
import { ChevronLeft, ChevronRight, Globe2, Minus, Plus, RotateCcw } from "lucide-react";
import { storyApi } from "@/api/story";
import type { StoryMapCountry } from "@/api/types";
import StoryCard from "@/components/StoryCard";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/StoryMap";

const EMPTY_COUNTRY_COLOR = "hsl(var(--muted))";
const MAP_BORDER_COLOR = "hsl(var(--background))";
const MAP_SELECTED_COLOR = "hsl(var(--foreground))";
const HEAT_COLORS = [
  "hsl(var(--primary) / 0.18)",
  "hsl(var(--primary) / 0.35)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.75)",
  "hsl(var(--primary))",
];
const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 18;
const MAP_ZOOM_FACTOR = 1.5;
const COUNT_MARKER_RADIUS = 7;
const COUNT_MARKER_FONT_SIZE = 8;
const DEFAULT_MAP_CENTER: [number, number] = [0, 4];
const COUNTRY_MARKERS: Array<{ code: string; name: string; coordinates: [number, number] }> = [
  { code: "AD", name: "Andorra", coordinates: [1.6, 42.5] },
  { code: "AG", name: "Antigua and Barbuda", coordinates: [-61.8, 17.1] },
  { code: "BH", name: "Bahrain", coordinates: [50.55, 26.05] },
  { code: "BB", name: "Barbados", coordinates: [-59.54, 13.19] },
  { code: "CV", name: "Cabo Verde", coordinates: [-23.6, 15.1] },
  { code: "KM", name: "Comoros", coordinates: [43.3, -11.7] },
  { code: "DM", name: "Dominica", coordinates: [-61.37, 15.4] },
  { code: "GD", name: "Grenada", coordinates: [-61.68, 12.1] },
  { code: "KI", name: "Kiribati", coordinates: [173, 1.9] },
  { code: "LI", name: "Liechtenstein", coordinates: [9.55, 47.16] },
  { code: "MV", name: "Maldives", coordinates: [73.2, 3.2] },
  { code: "MT", name: "Malta", coordinates: [14.4, 35.9] },
  { code: "MH", name: "Marshall Islands", coordinates: [171.2, 7.1] },
  { code: "MU", name: "Mauritius", coordinates: [57.5, -20.2] },
  { code: "FM", name: "Micronesia", coordinates: [158.2, 6.9] },
  { code: "MC", name: "Monaco", coordinates: [7.42, 43.74] },
  { code: "NR", name: "Nauru", coordinates: [166.9, -0.5] },
  { code: "PW", name: "Palau", coordinates: [134.5, 7.5] },
  { code: "KN", name: "Saint Kitts and Nevis", coordinates: [-62.8, 17.3] },
  { code: "LC", name: "Saint Lucia", coordinates: [-61, 13.9] },
  { code: "VC", name: "Saint Vincent and the Grenadines", coordinates: [-61.2, 13.25] },
  { code: "WS", name: "Samoa", coordinates: [-172.1, -13.8] },
  { code: "SM", name: "San Marino", coordinates: [12.46, 43.94] },
  { code: "ST", name: "Sao Tome and Principe", coordinates: [6.7, 0.2] },
  { code: "SC", name: "Seychelles", coordinates: [55.45, -4.6] },
  { code: "SG", name: "Singapore", coordinates: [103.8, 1.35] },
  { code: "TO", name: "Tonga", coordinates: [-175.2, -21.2] },
  { code: "TV", name: "Tuvalu", coordinates: [179.2, -8.5] },
  { code: "VA", name: "Vatican City", coordinates: [12.45, 41.9] },
];
const SMALL_COUNTRY_CODES = new Set(COUNTRY_MARKERS.map((marker) => marker.code));

function mapColor(storiesCount: number, maximum: number) {
  if (storiesCount <= 0 || maximum <= 0) return EMPTY_COUNTRY_COLOR;
  const ratio = storiesCount / maximum;
  return HEAT_COLORS[Math.min(HEAT_COLORS.length - 1, Math.ceil(ratio * HEAT_COLORS.length) - 1)];
}

function numericCountryCode(alpha2: string) {
  const code = isoCountries.alpha2ToNumeric(alpha2);
  return code ? String(code).padStart(3, "0") : null;
}

export function meta() {
  return buildMeta({
    title: "Story Map — Explore Stories Around the World | WorldStories",
    description:
      "Explore the WorldStories collection by country on an interactive world map and discover stories from every represented region.",
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

export default function StoryMap({ loaderData }: Route.ComponentProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["story-map"],
    queryFn: storyApi.getStoryMap,
    initialData: loaderData,
  });
  const [selectedCode, setSelectedCode] = useState<string | null>(
    () => loaderData?.countries?.[0]?.code || null
  );
  const [storyPage, setStoryPage] = useState(1);
  const [mapPosition, setMapPosition] = useState<{
    coordinates: [number, number];
    zoom: number;
  }>({ coordinates: DEFAULT_MAP_CENTER, zoom: MIN_MAP_ZOOM });
  const [tooltip, setTooltip] = useState<{
    country: StoryMapCountry | null;
    fallbackName: string;
    x: number;
    y: number;
  } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const countryByNumericCode = useMemo(
    () =>
      new Map(
        (data?.countries || []).flatMap((country) => {
          const numeric = numericCountryCode(country.code);
          return numeric ? [[numeric, country] as const] : [];
        })
      ),
    [data]
  );
  const countryByCode = useMemo(
    () => new Map((data?.countries || []).map((country) => [country.code, country])),
    [data]
  );
  const selectedCountry = selectedCode ? countryByCode.get(selectedCode) || null : null;
  const countMarkerScale = 1 / Math.sqrt(mapPosition.zoom);

  useEffect(() => {
    if (!selectedCode && data?.countries?.length) {
      setSelectedCode(data.countries[0].code);
    }
  }, [data, selectedCode]);

  useEffect(() => {
    setStoryPage(1);
  }, [selectedCode]);

  const { data: selectedStories, isFetching: storiesLoading } = useQuery({
    queryKey: ["story-map-stories", selectedCode, storyPage],
    queryFn: () =>
      storyApi.getStories(
        storyPage,
        [],
        "popular",
        "all",
        "",
        "all",
        "all",
        [],
        false,
        false,
        selectedCode || "all"
      ),
    enabled: Boolean(selectedCode),
    placeholderData: (previous) => previous,
  });

  const selectCountry = (country: StoryMapCountry | undefined) => {
    if (!country) return;
    setSelectedCode(country.code);
    requestAnimationFrame(() => {
      document.getElementById("country-stories")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const updateTooltip = (
    event: React.MouseEvent<SVGElement>,
    country: StoryMapCountry | undefined,
    fallbackName: string
  ) => {
    const bounds = mapContainerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setTooltip({
      country: country || null,
      fallbackName,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  const changeZoom = (factor: number) => {
    setTooltip(null);
    setMapPosition((current) => ({
      ...current,
      zoom: Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, current.zoom * factor)),
    }));
  };

  const resetMapPosition = () => {
    setTooltip(null);
    setMapPosition({ coordinates: DEFAULT_MAP_CENTER, zoom: MIN_MAP_ZOOM });
  };

  if (isLoading && !data) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(237,64,90,0.10),transparent_42%)]">
      <header className="border-b border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/15">
        <div className="container mx-auto px-4 py-8 sm:py-11">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Globe2 className="h-3.5 w-3.5" />
            Stories without borders
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Story Map</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
            Travel through the collection by country. More intensely colored regions have more stories waiting to be discovered.
          </p>
        </div>
      </header>

      <main className="container mx-auto space-y-8 px-3 py-7 sm:px-4 sm:py-10">
        {isError || !data ? (
          <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
            The story map could not be loaded. Please try again.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 sm:max-w-xl sm:grid-cols-3" aria-label="Story map summary">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary">{data.total_stories}</p>
                <p className="mt-1 text-xs text-muted-foreground">Mapped stories</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary">{data.countries_count}</p>
                <p className="mt-1 text-xs text-muted-foreground">Countries represented</p>
              </div>
              <div className="col-span-2 rounded-xl border bg-card p-4 shadow-sm sm:col-span-1">
                <p className="truncate text-lg font-bold text-primary">{data.countries[0]?.name || "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Most represented</p>
              </div>
            </section>

            <section>
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
                  <div>
                    <h2 className="font-semibold text-slate-900">Stories by country</h2>
                    <p className="text-xs text-slate-500">
                      Story counts appear inside represented countries. Drag to pan, scroll or pinch to zoom, and tap a country to explore its titles.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500" aria-label="Map color scale">
                    <span>Fewer</span>
                    {HEAT_COLORS.map((color) => (
                      <span key={color} className="h-3.5 w-5 rounded-sm" style={{ backgroundColor: color }} />
                    ))}
                    <span>More</span>
                  </div>
                </div>

                <div ref={mapContainerRef} className="relative bg-gradient-to-b from-primary/5 to-background p-1 sm:p-3">
                  <ComposableMap
                    width={800}
                    height={430}
                    projection="geoEqualEarth"
                    projectionConfig={{ scale: 148, center: DEFAULT_MAP_CENTER }}
                    className="h-auto w-full"
                    style={{ touchAction: "none" }}
                    role="img"
                    aria-label="World map colored by the number of published stories from each country"
                  >
                    <ZoomableGroup
                      center={mapPosition.coordinates}
                      zoom={mapPosition.zoom}
                      minZoom={MIN_MAP_ZOOM}
                      maxZoom={MAX_MAP_ZOOM}
                      translateExtent={[[0, 0], [800, 430]]}
                      onMoveStart={() => setTooltip(null)}
                      onMoveEnd={({ coordinates, zoom }) => setMapPosition({ coordinates, zoom })}
                    >
                      <Geographies geography={worldGeography}>
                        {({ geographies }) => (
                          <>
                            {geographies.map((geography) => {
                              const numericCode = String(geography.id).padStart(3, "0");
                              const country = countryByNumericCode.get(numericCode);
                              const count = country?.stories_count || 0;
                              const isSelected = country?.code === selectedCode;
                              const fill = mapColor(count, data.max_stories_count);
                              const countryName = country?.name || geography.properties.name || "Unknown country";

                              return (
                                <Geography
                                  key={geography.rsmKey}
                                  geography={geography}
                                  role={country ? "button" : undefined}
                                  tabIndex={country ? 0 : -1}
                                  aria-label={`${countryName}: ${count} ${count === 1 ? "story" : "stories"}`}
                                  onMouseMove={(event) => updateTooltip(event, country, countryName)}
                                  onMouseLeave={() => setTooltip(null)}
                                  onFocus={() => setTooltip({ country: country || null, fallbackName: countryName, x: 24, y: 24 })}
                                  onBlur={() => setTooltip(null)}
                                  onClick={() => selectCountry(country)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      selectCountry(country);
                                    }
                                  }}
                                  fill={fill}
                                  stroke={isSelected ? MAP_SELECTED_COLOR : MAP_BORDER_COLOR}
                                  strokeWidth={isSelected ? 1.8 : 0.65}
                                  style={{
                                    default: { outline: "none", transition: "fill 160ms ease" },
                                    hover: {
                                      fill: country ? "hsl(var(--primary) / 0.85)" : EMPTY_COUNTRY_COLOR,
                                      outline: "none",
                                      cursor: country ? "pointer" : "default",
                                    },
                                    pressed: { fill: country ? "hsl(var(--primary))" : EMPTY_COUNTRY_COLOR, outline: "none" },
                                  }}
                                />
                              );
                            })}

                            {geographies.map((geography) => {
                              const numericCode = String(geography.id).padStart(3, "0");
                              const country = countryByNumericCode.get(numericCode);
                              if (!country || SMALL_COUNTRY_CODES.has(country.code)) return null;
                              const coordinates = geoCentroid(geography);

                              return (
                                <Marker
                                  key={`count-${geography.rsmKey}`}
                                  coordinates={coordinates}
                                  className="pointer-events-none"
                                  aria-hidden="true"
                                >
                                  <circle
                                    r={COUNT_MARKER_RADIUS * countMarkerScale}
                                    fill="hsl(var(--background) / 0.88)"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={countMarkerScale}
                                  />
                                  <text
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill="hsl(var(--foreground))"
                                    fontSize={COUNT_MARKER_FONT_SIZE * countMarkerScale}
                                    fontWeight={700}
                                  >
                                    {country.stories_count}
                                  </text>
                                </Marker>
                              );
                            })}
                          </>
                        )}
                      </Geographies>
                      {COUNTRY_MARKERS.map((marker) => {
                        const country = countryByCode.get(marker.code);
                        if (!country) return null;
                        return (
                          <Marker
                            key={marker.code}
                            coordinates={marker.coordinates}
                            className="cursor-pointer outline-none"
                            role="button"
                            tabIndex={0}
                            aria-label={`${marker.name}: ${country.stories_count} ${country.stories_count === 1 ? "story" : "stories"}`}
                            onClick={() => selectCountry(country)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                selectCountry(country);
                              }
                            }}
                          >
                            <circle
                              r={COUNT_MARKER_RADIUS * countMarkerScale}
                              fill="hsl(var(--background) / 0.88)"
                              stroke={country.code === selectedCode ? MAP_SELECTED_COLOR : "hsl(var(--primary))"}
                              strokeWidth={(country.code === selectedCode ? 1.5 : 1) * countMarkerScale}
                            />
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="hsl(var(--foreground))"
                              fontSize={COUNT_MARKER_FONT_SIZE * countMarkerScale}
                              fontWeight={700}
                              className="pointer-events-none"
                            >
                              {country.stories_count}
                            </text>
                          </Marker>
                        );
                      })}
                    </ZoomableGroup>
                  </ComposableMap>

                  <div
                    className="absolute bottom-3 right-3 z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur sm:bottom-5 sm:right-5"
                    role="group"
                    aria-label="Map zoom controls"
                  >
                    <button
                      type="button"
                      onClick={() => changeZoom(MAP_ZOOM_FACTOR)}
                      disabled={mapPosition.zoom >= MAX_MAP_ZOOM}
                      className="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Zoom in"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeZoom(1 / MAP_ZOOM_FACTOR)}
                      disabled={mapPosition.zoom <= MIN_MAP_ZOOM}
                      className="flex h-10 w-10 items-center justify-center border-y border-border text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Zoom out"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={resetMapPosition}
                      disabled={
                        mapPosition.zoom === MIN_MAP_ZOOM &&
                        mapPosition.coordinates[0] === DEFAULT_MAP_CENTER[0] &&
                        mapPosition.coordinates[1] === DEFAULT_MAP_CENTER[1]
                      }
                      className="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Reset map position"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>

                  {tooltip && (
                    <div
                      className="pointer-events-none absolute z-10 min-w-32 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border bg-slate-950/95 px-3 py-2 text-center text-white shadow-xl"
                      style={{ left: tooltip.x, top: tooltip.y }}
                    >
                      <p className="text-xs font-semibold">{tooltip.country?.name || tooltip.fallbackName}</p>
                      <p className="text-[11px] text-slate-300">
                        {tooltip.country?.stories_count || 0} {(tooltip.country?.stories_count || 0) === 1 ? "story" : "stories"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </section>

            {selectedCountry && (
              <section id="country-stories" className="scroll-mt-24 border-t pt-7">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Explore the collection</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight">
                      Stories from {selectedCountry.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedCountry.stories_count} {selectedCountry.stories_count === 1 ? "title" : "titles"} available
                    </p>
                  </div>
                </div>

                {storiesLoading && !selectedStories ? (
                  <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Loading stories…</div>
                ) : (
                  <>
                    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${storiesLoading ? "opacity-60" : ""}`}>
                      {selectedStories?.results.map((story) => <StoryCard key={story.id} {...story} />)}
                    </div>

                    {(selectedStories?.pagination.pages || 0) > 1 && (
                      <nav className="mt-8 flex items-center justify-center gap-3" aria-label={`${selectedCountry.name} story pages`}>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!selectedStories?.pagination.previous || storiesLoading}
                          onClick={() => setStoryPage((page) => Math.max(1, page - 1))}
                        >
                          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {selectedStories?.pagination.page} of {selectedStories?.pagination.pages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!selectedStories?.pagination.next || storiesLoading}
                          onClick={() => setStoryPage((page) => page + 1)}
                        >
                          Next <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </nav>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
