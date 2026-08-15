// Quick Read reading-time estimate, separate from the full-story
// reading_time_minutes the backend computes (chapters/epub/pdf, ~200 wpm) —
// summaries read faster, so this uses a slightly higher words-per-minute
// rate and is computed client-side since the summary text is already in
// hand wherever this is needed (no extra API round-trip).
const SUMMARY_WORDS_PER_MINUTE = 220;

function wordCount(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

// Returns null when there's no real summary text to read (used both to
// compute the estimate and to gate whether Quick Read should be offered
// at all — a summary that's empty/whitespace-only isn't "available").
export function estimateSummaryReadingMinutes(summaryHtml: string | null | undefined): number | null {
  const count = wordCount(summaryHtml || "");
  if (count === 0) return null;
  return Math.max(1, Math.round(count / SUMMARY_WORDS_PER_MINUTE));
}
