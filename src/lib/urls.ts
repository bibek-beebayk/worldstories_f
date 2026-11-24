/**
 * Canonical URL builders for audiobooks and read-along routes.
 * Always use these helpers instead of hard-coding `/listen/...` or `/read-along/...` strings.
 */

export type SlugLike = string | { slug: string };
export type TrackSlugLike = string | { slug?: string | null; order?: number } | null | undefined;

function extractSlug(input: SlugLike): string {
  return typeof input === "string" ? input : input.slug;
}

function extractTrackSlug(track?: TrackSlugLike): string | null {
  if (!track) return null;
  if (typeof track === "string") return track.trim() || null;
  if (track.slug && track.slug.trim()) return track.slug.trim();
  if (typeof track.order === "number" && Number.isFinite(track.order)) {
    return String(track.order);
  }
  return null;
}

export function audiobookUrl(audiobook: SlugLike, track?: TrackSlugLike): string {
  const slug = encodeURIComponent(extractSlug(audiobook));
  const trackSlug = extractTrackSlug(track);
  return trackSlug ? `/listen/${slug}/${encodeURIComponent(trackSlug)}` : `/listen/${slug}`;
}

export function readAlongUrl(audiobook: SlugLike, track?: TrackSlugLike): string {
  const slug = encodeURIComponent(extractSlug(audiobook));
  const trackSlug = extractTrackSlug(track);
  return trackSlug ? `/read-along/${slug}/${encodeURIComponent(trackSlug)}` : `/read-along/${slug}`;
}
