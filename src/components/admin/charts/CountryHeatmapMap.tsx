import { useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
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

// A real choropleth, reusing the exact same react-simple-maps/world-atlas
// stack (and the same sequential --primary heat scale) StoryMap.tsx already
// uses for "stories per country" — see src/lib/geoMapColors.ts. Kept static
// (no pan/zoom/drill-down) since this is a compact summary card rather than
// a standalone explorer page.
export function CountryHeatmapMap({
  data,
  emptyLabel = "No resolved sign-in locations for this range yet.",
}: CountryHeatmapMapProps) {
  const [tooltip, setTooltip] = useState<{ row: CountryHeatmapRow | null; name: string; x: number; y: number } | null>(
    null
  );
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

  if (data.length === 0) {
    return <div className={emptyStateClass}>{emptyLabel}</div>;
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <ComposableMap
          width={800}
          height={400}
          projection="geoEqualEarth"
          projectionConfig={{ scale: 138, center: [0, 4] }}
          className="h-auto w-full"
          role="img"
          aria-label="World map colored by the number of signed-in users per country"
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
        </ComposableMap>

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
