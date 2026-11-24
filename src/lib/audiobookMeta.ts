import type { PublicAudiobookDetail } from "@/api/types";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import { plainText } from "@/lib/plainText";
import { audiobookUrl } from "@/lib/urls";

function toIsoDuration(seconds: number | null | undefined): string | undefined {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `PT${hours}H${mins}M`;
  if (hours > 0) return `PT${hours}H`;
  return `PT${mins}M`;
}

export function buildAudiobookMeta(
  audiobook: PublicAudiobookDetail,
  options: {
    mode?: "detail" | "player" | "read-along";
    trackSlug?: string;
    noIndex?: boolean;
  } = {},
) {
  const mode = options.mode ?? "detail";
  const canonicalPath = audiobookUrl(audiobook.slug);
  const pagePath =
    mode === "player" && options.trackSlug
      ? audiobookUrl(audiobook.slug, options.trackSlug)
      : mode === "read-along"
        ? `/read-along/${encodeURIComponent(audiobook.slug)}`
        : canonicalPath;

  const track = options.trackSlug
    ? audiobook.tracks.find((t) => t.slug === options.trackSlug)
    : undefined;
  const authorSuffix = audiobook.author ? ` by ${audiobook.author}` : "";
  const description = plainText(
    audiobook.about || `Listen to ${audiobook.title}${authorSuffix} on WorldStories.`,
  );

  const title =
    mode === "player" && track?.title
      ? `${track.title} — ${audiobook.title} Audiobook | WorldStories`
      : mode === "read-along"
        ? `Read Along — ${audiobook.title}${authorSuffix} | WorldStories`
        : `Listen to ${audiobook.title}${authorSuffix} | WorldStories`;

  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Audiobook",
    name: audiobook.title,
    description,
    url: `${SITE_URL}${canonicalPath}`,
    image: audiobook.cover_image || undefined,
    inLanguage: audiobook.language || "en",
    genre: audiobook.genres,
    duration: toIsoDuration(audiobook.total_duration_seconds),
    author: audiobook.author ? { "@type": "Person", name: audiobook.author } : undefined,
    readBy: audiobook.narrator ? { "@type": "Person", name: audiobook.narrator } : undefined,
  };

  // Standalone audiobooks have no story page; only reference a story URL when linked.
  if (audiobook.story?.slug) {
    structuredData.isBasedOn = `${SITE_URL}/story/${audiobook.story.slug}`;
  }

  return buildMeta({
    title,
    description: description.slice(0, 160),
    path: mode === "detail" ? canonicalPath : pagePath,
    image: audiobook.cover_image,
    type: "book",
    noIndex: options.noIndex ?? mode === "player",
    structuredData: mode === "detail" ? structuredData : undefined,
  });
}

export function buildAudiobookNotFoundMeta(slug: string | undefined) {
  return buildMeta({
    title: "Audiobook Not Found | WorldStories",
    description: "The requested audiobook could not be found.",
    path: `/listen/${slug || ""}`,
    noIndex: true,
  });
}
