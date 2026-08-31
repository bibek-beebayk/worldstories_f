const LIGHT_FALLBACK = "#f8fafc";
const DARK_FALLBACK = "#111827";

function parseHexColor(color: string): [number, number, number] | null {
  const value = color.trim();
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split("").map((character) => character + character).join("")
    : match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance(color: string): number | null {
  const rgb = parseHexColor(color);
  if (!rgb) return null;
  const channels = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function colorContrastRatio(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  if (firstLuminance === null || secondLuminance === null) return 0;
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function hasAccessibleTextContrast(
  foreground: string,
  background: string,
  minimum = 4.5
): boolean {
  return colorContrastRatio(foreground, background) >= minimum;
}

/** Keeps old saved custom themes readable even if they predate validation. */
export function ensureAccessibleTextColor(
  requested: string,
  background: string,
  minimum = 4.5
): string {
  if (hasAccessibleTextContrast(requested, background, minimum)) return requested;
  const lightRatio = colorContrastRatio(LIGHT_FALLBACK, background);
  const darkRatio = colorContrastRatio(DARK_FALLBACK, background);
  return lightRatio >= darkRatio ? LIGHT_FALLBACK : DARK_FALLBACK;
}
