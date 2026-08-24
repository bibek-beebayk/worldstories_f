import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import isoCountries from "i18n-iso-countries";
import worldGeography from "world-atlas/countries-110m.json";
import { ChevronLeft, ChevronRight, Globe2, MapPinned } from "lucide-react";
import { storyApi } from "@/api/story";
import type { StoryMapCountry } from "@/api/types";
import StoryCard from "@/components/StoryCard";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/StoryMap";

const EMPTY_COUNTRY_COLOR = "#e2e8f0";
const HEAT_COLORS = ["#bae6fd", "#7dd3fc", "#38bdf8", "#0284c7", "#075985"];
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

  if (isLoading && !data) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_42%)]">
      <header className="border-b border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-100">
        <div className="container mx-auto px-4 py-8 sm:py-11">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800">
            <Globe2 className="h-3.5 w-3.5" />
            Stories without borders
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Story Map</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
            Travel through the collection by country. Deeper blue regions have more stories waiting to be discovered.
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
                <p className="text-2xl font-bold text-sky-800">{data.total_stories}</p>
                <p className="mt-1 text-xs text-muted-foreground">Mapped stories</p>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-2xl font-bold text-sky-800">{data.countries_count}</p>
                <p className="mt-1 text-xs text-muted-foreground">Countries represented</p>
              </div>
              <div className="col-span-2 rounded-xl border bg-card p-4 shadow-sm sm:col-span-1">
                <p className="truncate text-lg font-bold text-sky-800">{data.countries[0]?.name || "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Most represented</p>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
                  <div>
                    <h2 className="font-semibold text-slate-900">Stories by country</h2>
                    <p className="text-xs text-slate-500">Hover or tap a highlighted country to explore its titles.</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500" aria-label="Map color scale">
                    <span>Fewer</span>
                    {HEAT_COLORS.map((color) => (
                      <span key={color} className="h-3.5 w-5 rounded-sm" style={{ backgroundColor: color }} />
                    ))}
                    <span>More</span>
                  </div>
                </div>

                <div ref={mapContainerRef} className="relative bg-gradient-to-b from-sky-50/80 to-white p-1 sm:p-3">
                  <ComposableMap
                    projection="geoEqualEarth"
                    projectionConfig={{ scale: 148, center: [0, 4] }}
                    viewBox="0 0 800 430"
                    className="h-auto w-full"
                    role="img"
                    aria-label="World map colored by the number of published stories from each country"
                  >
                    <Geographies geography={worldGeography}>
                      {({ geographies }) =>
                        geographies.map((geography) => {
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
                              stroke={isSelected ? "#0c4a6e" : "#ffffff"}
                              strokeWidth={isSelected ? 1.8 : 0.65}
                              style={{
                                default: { outline: "none", transition: "fill 160ms ease" },
                                hover: {
                                  fill: country ? "#0369a1" : EMPTY_COUNTRY_COLOR,
                                  outline: "none",
                                  cursor: country ? "pointer" : "default",
                                },
                                pressed: { fill: country ? "#075985" : EMPTY_COUNTRY_COLOR, outline: "none" },
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>
                    {COUNTRY_MARKERS.map((marker) => {
                      const country = countryByCode.get(marker.code);
                      const count = country?.stories_count || 0;
                      return (
                        <Marker key={marker.code} coordinates={marker.coordinates}>
                          <circle
                            r={country ? 3.3 : 2.2}
                            fill={mapColor(count, data.max_stories_count)}
                            stroke={country?.code === selectedCode ? "#0c4a6e" : "#ffffff"}
                            strokeWidth={country?.code === selectedCode ? 1.5 : 0.8}
                            role={country ? "button" : undefined}
                            tabIndex={country ? 0 : -1}
                            aria-label={`${marker.name}: ${count} ${count === 1 ? "story" : "stories"}`}
                            className={country ? "cursor-pointer outline-none" : "outline-none"}
                            onMouseMove={(event) => updateTooltip(event, country, marker.name)}
                            onMouseLeave={() => setTooltip(null)}
                            onClick={() => selectCountry(country)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                selectCountry(country);
                              }
                            }}
                          />
                        </Marker>
                      );
                    })}
                  </ComposableMap>

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

              <aside className="rounded-2xl border bg-card shadow-sm">
                <div className="border-b p-4">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <MapPinned className="h-4 w-4 text-sky-700" /> Countries represented
                  </h2>
                </div>
                <div className="max-h-[455px] overflow-y-auto p-2">
                  {data.countries.map((country, index) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => selectCountry(country)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        selectedCode === country.code ? "bg-sky-100 text-sky-950" : "hover:bg-muted"
                      }`}
                    >
                      <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{country.name}</span>
                      <span className="rounded-full bg-sky-700 px-2 py-0.5 text-xs font-semibold text-white">
                        {country.stories_count}
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
            </section>

            {selectedCountry && (
              <section id="country-stories" className="scroll-mt-24 border-t pt-7">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Explore the collection</p>
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
