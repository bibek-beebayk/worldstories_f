import isoCountries from "i18n-iso-countries";

// Shared by StoryMap.tsx (stories per country) and the admin analytics
// country heatmap (sign-ins per country) — both color a react-simple-maps
// choropleth by the same "one hue, light -> dark" sequential scale, and
// both need to translate a 2-letter ISO country code into the numeric id
// world-atlas's topojson keys its features by.
export const EMPTY_COUNTRY_COLOR = "hsl(var(--muted))";
export const HEAT_COLORS = [
  "hsl(var(--primary) / 0.18)",
  "hsl(var(--primary) / 0.35)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--primary) / 0.75)",
  "hsl(var(--primary))",
];

export function numericCountryCode(alpha2: string) {
  const code = isoCountries.alpha2ToNumeric(alpha2);
  return code ? String(code).padStart(3, "0") : null;
}

export function heatColor(value: number, maximum: number) {
  if (value <= 0 || maximum <= 0) return EMPTY_COUNTRY_COLOR;
  const ratio = value / maximum;
  return HEAT_COLORS[Math.min(HEAT_COLORS.length - 1, Math.ceil(ratio * HEAT_COLORS.length) - 1)];
}
