import { useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Minus, Plus, RotateCcw } from "lucide-react";
import worldGeography from "world-atlas/countries-110m.json";
import { EMPTY_COUNTRY_COLOR, HEAT_COLORS, heatColor, numericCountryCode } from "@/lib/geoMapColors";
import { emptyStateClass } from "./palette";

interface CountryHeatmapRow {
  country: string;
  country_code: string;
  logins: number;
  users: number;
}

interface CountryHeatmapMapProps {
  data: CountryHeatmapRow[];
  emptyLabel?: string;
}

const MAP_BORDER_COLOR = "hsl(var(--background))";

const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 18;
const MAP_ZOOM_FACTOR = 1.5;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 400;
const DEFAULT_MAP_CENTER: [number, number] = [0, 4];

// A real choropleth, reusing the exact same react-simple-maps/world-atlas
// stack (and the same sequential --primary heat scale) StoryMap.tsx already
// uses for "stories per country" — see src/lib/geoMapColors.ts. Drag to pan,
// scroll or pinch to zoom, matching the standalone StoryMap explorer.
export function CountryHeatmapMap({
  data,
  emptyLabel = "No resolved sign-in locations for this range yet.",
}: CountryHeatmapMapProps) {
  const [tooltip, setTooltip] = useState<{ row: CountryHeatmapRow | null; name: string; x: number; y: number } | null>(
    null
  );
  const [mapPosition, setMapPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: DEFAULT_MAP_CENTER,
    zoom: MIN_MAP_ZOOM,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const rowByNumericCode = useMemo(() => {
    const map = new Map<string, CountryHeatmapRow>();
    for (const row of data) {
      const numeric = row.country_code && numericCountryCode(row.country_code);
      if (numeric) map.set(numeric, row);
    }
    return map;
  }, [data]);

  const maxUsers = Math.max(...data.map((row) => row.users), 1);

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

  if (data.length === 0) {
    return <div className={emptyStateClass}>{emptyLabel}</div>;
  }

  const isDefaultPosition =
    mapPosition.zoom === MIN_MAP_ZOOM &&
    mapPosition.coordinates[0] === DEFAULT_MAP_CENTER[0] &&
    mapPosition.coordinates[1] === DEFAULT_MAP_CENTER[1];

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <ComposableMap
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          projection="geoEqualEarth"
          projectionConfig={{ scale: 138, center: [0, 4] }}
          className="h-auto w-full"
          style={{ touchAction: "none" }}
          role="img"
          aria-label="World map colored by the number of signed-in users per country"
        >
          <ZoomableGroup
            center={mapPosition.coordinates}
            zoom={mapPosition.zoom}
            minZoom={MIN_MAP_ZOOM}
            maxZoom={MAX_MAP_ZOOM}
            translateExtent={[
              [0, 0],
              [MAP_WIDTH, MAP_HEIGHT],
            ]}
            onMoveStart={() => setTooltip(null)}
            onMoveEnd={({ coordinates, zoom }) => setMapPosition({ coordinates, zoom })}
          >
            <Geographies geography={worldGeography}>
              {({ geographies }) =>
                geographies.map((geography) => {
                  const numericCode = String(geography.id).padStart(3, "0");
                  const row = rowByNumericCode.get(numericCode);
                  const countryName = row?.country || geography.properties.name || "Unknown country";

                  return (
                    <Geography
                      key={geography.rsmKey}
                      geography={geography}
                      aria-label={`${countryName}: ${row?.users || 0} ${row?.users === 1 ? "user" : "users"}`}
                      onMouseMove={(event) => {
                        const bounds = containerRef.current?.getBoundingClientRect();
                        if (!bounds) return;
                        setTooltip({ row: row || null, name: countryName, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      fill={heatColor(row?.users || 0, maxUsers)}
                      stroke={MAP_BORDER_COLOR}
                      strokeWidth={0.65}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: row ? "hsl(var(--primary) / 0.85)" : EMPTY_COUNTRY_COLOR, outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        <div
          className="absolute bottom-3 right-3 z-20 flex flex-col overflow-hidden rounded-xl border bg-card/95 shadow-lg backdrop-blur"
          role="group"
          aria-label="Map zoom controls"
        >
          <button
            type="button"
            onClick={() => changeZoom(MAP_ZOOM_FACTOR)}
            disabled={mapPosition.zoom >= MAX_MAP_ZOOM}
            className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(1 / MAP_ZOOM_FACTOR)}
            disabled={mapPosition.zoom <= MIN_MAP_ZOOM}
            className="flex h-9 w-9 items-center justify-center border-y text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetMapPosition}
            disabled={isDefaultPosition}
            className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Reset map position"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 min-w-28 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border bg-slate-950/95 px-3 py-2 text-center text-white shadow-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="text-xs font-semibold">{tooltip.name}</p>
            <p className="text-[11px] text-slate-300">
              {tooltip.row ? `${tooltip.row.users} user${tooltip.row.users === 1 ? "" : "s"} · ${tooltip.row.logins} sign-in${tooltip.row.logins === 1 ? "" : "s"}` : "No sign-ins"}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground" aria-label="Map color scale">
        <span>Fewer</span>
        {HEAT_COLORS.map((color) => (
          <span key={color} className="h-3 w-4 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
