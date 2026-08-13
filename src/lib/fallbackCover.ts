// Generates a placeholder book cover (as an inline SVG data URI) for stories
// that don't have a real cover image — showing the story's own title and
// author instead of a generic illustration, so a library full of fallback
// covers still reads as a library of distinct books rather than one image
// repeated over and over.

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 900;
const TEXT_MAX_WIDTH = 460;
const TITLE_BLOCK_CENTER_Y = 500;
const TITLE_CANDIDATE_SIZES = [44, 38, 34, 30, 26];
const TITLE_MAX_LINES = 5;
const AUTHOR_FONT_SIZE = 24;
const AUTHOR_LINE_HEIGHT = 30;
const AUTHOR_MAX_LINES = 2;
const AUTHOR_GAP = 44;

// Rough average glyph width as a fraction of font-size — good enough for
// wrapping a decorative placeholder, not pixel-perfect typesetting.
const AVG_CHAR_WIDTH_RATIO = 0.56;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number): { lines: string[]; truncated: boolean } {
  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * AVG_CHAR_WIDTH_RATIO)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    pushCurrent();
    if (word.length <= maxChars) {
      current = word;
    } else {
      // A single run longer than a full line (long compound word, a script
      // without spaces, ...) — hard-break by character count instead of
      // overflowing the cover.
      let remaining = word;
      while (remaining.length > maxChars) {
        lines.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      current = remaining;
    }
  }
  pushCurrent();

  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines);
    const lastIndex = maxLines - 1;
    visible[lastIndex] = `${visible[lastIndex].slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
    return { lines: visible, truncated: true };
  }

  return { lines, truncated: false };
}

// Tries progressively smaller font sizes until the title fits within
// TITLE_MAX_LINES without truncation, falling back to the smallest size
// (truncated with an ellipsis if it still doesn't fit) as a last resort.
function fitTitle(title: string): { fontSize: number; lines: string[] } {
  let fallback = { fontSize: TITLE_CANDIDATE_SIZES[0], lines: [title] };
  for (const fontSize of TITLE_CANDIDATE_SIZES) {
    const { lines, truncated } = wrapText(title, fontSize, TEXT_MAX_WIDTH, TITLE_MAX_LINES);
    fallback = { fontSize, lines };
    if (!truncated) return fallback;
  }
  return fallback;
}

function tspans(lines: string[], x: number, lineHeight: number): string {
  return lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");
}

export function buildFallbackCoverSvg(title: string, author?: string | null): string {
  const safeTitle = title?.trim() || "Untitled Story";
  const safeAuthor = author?.trim() || null;

  const { fontSize: titleFontSize, lines: titleLines } = fitTitle(safeTitle);
  const titleLineHeight = titleFontSize * 1.28;
  const titleBlockHeight = titleLineHeight * titleLines.length;
  // Text is anchored at each line's baseline, so the first line needs a
  // downward nudge (~0.8 of the font size, roughly the cap-height) to make
  // the whole block actually sit centered on TITLE_BLOCK_CENTER_Y rather
  // than hanging above it.
  const round2 = (value: number) => Math.round(value * 100) / 100;
  const titleFirstLineY = round2(TITLE_BLOCK_CENTER_Y - titleBlockHeight / 2 + titleFontSize * 0.8);
  const titleTspans = tspans(titleLines, VIEW_WIDTH / 2, titleLineHeight);

  let authorMarkup = "";
  if (safeAuthor) {
    const { lines: authorLines } = wrapText(`by ${safeAuthor}`, AUTHOR_FONT_SIZE, TEXT_MAX_WIDTH, AUTHOR_MAX_LINES);
    const authorFirstLineY = round2(TITLE_BLOCK_CENTER_Y + titleBlockHeight / 2 + AUTHOR_GAP);
    const authorTspans = tspans(authorLines, VIEW_WIDTH / 2, AUTHOR_LINE_HEIGHT);
    authorMarkup = `<text x="${VIEW_WIDTH / 2}" y="${authorFirstLineY}" fill="#cbd5f5" font-family="Georgia, serif" font-style="italic" font-size="${AUTHOR_FONT_SIZE}" text-anchor="middle">${authorTspans}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" role="img" aria-labelledby="cover-title cover-description">
  <title id="cover-title">${escapeXml(safeTitle)}</title>
  <desc id="cover-description">Placeholder cover for "${escapeXml(safeTitle)}"${safeAuthor ? ` by ${escapeXml(safeAuthor)}` : ""} on WorldStories.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#18243b"/>
      <stop offset="0.55" stop-color="#263a5c"/>
      <stop offset="1" stop-color="#101827"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="26%" r="55%">
      <stop offset="0" stop-color="#38bdf8" stop-opacity=".28"/>
      <stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${VIEW_WIDTH}" height="${VIEW_HEIGHT}" fill="url(#background)"/>
  <rect width="${VIEW_WIDTH}" height="${VIEW_HEIGHT}" fill="url(#glow)"/>
  <rect x="42" y="42" width="516" height="816" rx="18" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="3"/>
  <path d="M267 138c20-9 36-4 48 7v74c-12-11-28-16-48-7v-74Zm66 0c-20-9-36-4-48 7v74c12-11 28-16 48-7v-74Z" fill="none" stroke="#7dd3fc" stroke-width="6" stroke-linejoin="round"/>
  <path d="M300 145v74" stroke="#7dd3fc" stroke-width="3.5"/>
  <path d="M255 270h90" stroke="#7dd3fc" stroke-opacity=".45" stroke-width="1.5"/>
  <text x="${VIEW_WIDTH / 2}" y="${titleFirstLineY}" fill="#fff" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${titleFontSize}" text-anchor="middle">${titleTspans}</text>
  ${authorMarkup}
  <text x="${VIEW_WIDTH / 2}" y="838" fill="#fff" fill-opacity=".5" font-family="Arial, sans-serif" font-size="15" letter-spacing="4" text-anchor="middle">WORLDSTORIES</text>
</svg>`;
}

export function buildFallbackCoverDataUri(title: string, author?: string | null): string {
  return `data:image/svg+xml,${encodeURIComponent(buildFallbackCoverSvg(title, author))}`;
}
