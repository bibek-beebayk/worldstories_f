import type { ReadAlongResponse } from "@/api/types";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import {
  getDownload,
  getOfflineTranscript,
  listDownloads,
  listOfflineTranscripts,
  makeDownloadId,
  saveOfflineTranscript,
  type OfflineTranscriptRecord,
} from "@/lib/offlineDb";

export interface OfflineReadAlongTrack {
  slug: string;
  order: number;
  title: string;
  transcript_synchronized: boolean;
}

const toTrack = (record: OfflineTranscriptRecord): OfflineReadAlongTrack => ({
  slug: record.audio_slug,
  order: record.audio.order,
  title: record.audio.title,
  transcript_synchronized: record.synchronized && record.cues.length > 0,
});

export async function storeOfflineReadAlong(payload: ReadAlongResponse): Promise<boolean> {
  const transcriptHtml = sanitizeHtml(payload.transcript.html || "").trim();
  if (!payload.audio.read_along_available || !transcriptHtml) return false;

  await saveOfflineTranscript({
    story_slug: payload.story.slug,
    audio_slug: payload.audio.slug,
    story: payload.story,
    audio: {
      id: payload.audio.id,
      title: payload.audio.title,
      slug: payload.audio.slug,
      order: payload.audio.order,
      duration_seconds: payload.audio.duration_seconds,
      download_size_bytes: payload.audio.download_size_bytes,
    },
    transcript_html: transcriptHtml,
    synchronized: payload.transcript.synchronized,
    cues: payload.transcript.cues,
  });
  return true;
}

export async function listOfflineReadAlongTracks(
  storySlug: string
): Promise<OfflineReadAlongTrack[]> {
  const [transcripts, downloads] = await Promise.all([
    listOfflineTranscripts(storySlug),
    listDownloads(),
  ]);
  const downloadedAudioSlugs = new Set(
    downloads
      .filter((record) => record.story_slug === storySlug && record.type === "audio")
      .map((record) => record.item_slug)
  );
  return transcripts
    .filter((record) => downloadedAudioSlugs.has(record.audio_slug) && record.transcript_html.trim())
    .sort((a, b) => a.audio.order - b.audio.order || a.audio.id - b.audio.id)
    .map(toTrack);
}

/**
 * Returns a complete reader payload only when both halves of offline Read
 * Along are present: the encrypted audio download and its sanitized transcript.
 */
export async function getOfflineReadAlong(
  storySlug: string,
  audioSlug: string
): Promise<ReadAlongResponse | null> {
  const [record, audioDownload, tracks] = await Promise.all([
    getOfflineTranscript(storySlug, audioSlug),
    getDownload(makeDownloadId(storySlug, "audio", audioSlug)),
    listOfflineReadAlongTracks(storySlug),
  ]);
  if (!record || !audioDownload || audioDownload.type !== "audio" || !record.transcript_html.trim()) {
    return null;
  }

  const currentIndex = tracks.findIndex((track) => track.slug === audioSlug);
  if (currentIndex < 0) return null;
  const synchronized = record.synchronized && record.cues.length > 0;

  return {
    story: record.story,
    audio: {
      ...record.audio,
      audio_file: null,
      stream_url: null,
      download_size_bytes: audioDownload.size_bytes || record.audio.download_size_bytes,
      has_transcript: true,
      read_along_available: true,
      transcript_synchronized: synchronized,
    },
    transcript: {
      html: record.transcript_html,
      state: synchronized ? "synchronized" : "unsynchronized",
      synchronized,
      cues: synchronized ? record.cues : [],
    },
    navigation: {
      previous_audio_slug: currentIndex > 0 ? tracks[currentIndex - 1].slug : null,
      next_audio_slug: currentIndex + 1 < tracks.length ? tracks[currentIndex + 1].slug : null,
    },
  };
}

/** A minimal payload that keeps downloaded audio playable when no transcript was stored. */
export async function getOfflineAudioOnlyReadAlong(
  storySlug: string,
  audioSlug: string
): Promise<ReadAlongResponse | null> {
  const downloads = (await listDownloads())
    .filter((record) => record.story_slug === storySlug && record.type === "audio")
    .sort((a, b) => a.order - b.order || a.item_slug.localeCompare(b.item_slug));
  const currentIndex = downloads.findIndex((record) => record.item_slug === audioSlug);
  if (currentIndex < 0) return null;
  const current = downloads[currentIndex];

  return {
    story: {
      id: 0,
      title: current.story_title,
      slug: storySlug,
      language: "",
      story_type: current.story_type || "Story",
      cover_image: current.story_cover_image || null,
      author: current.story_author ? { id: 0, name: current.story_author } : null,
    },
    audio: {
      id: 0,
      title: current.title,
      slug: audioSlug,
      order: current.order,
      audio_file: null,
      stream_url: null,
      duration_seconds: null,
      download_size_bytes: current.size_bytes,
      has_transcript: false,
      read_along_available: false,
      transcript_synchronized: false,
    },
    transcript: {
      html: "",
      state: "empty",
      synchronized: false,
      cues: [],
    },
    navigation: {
      previous_audio_slug: currentIndex > 0 ? downloads[currentIndex - 1].item_slug : null,
      next_audio_slug:
        currentIndex + 1 < downloads.length ? downloads[currentIndex + 1].item_slug : null,
    },
  };
}
