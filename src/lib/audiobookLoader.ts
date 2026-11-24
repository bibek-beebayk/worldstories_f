import { data, redirect } from "react-router";
import { ApiError } from "@/api/client";
import { storyApi } from "@/api/story";
import type { PublicAudiobookDetail, ReadAlongPayload } from "@/api/types";
import { audiobookUrl, readAlongUrl } from "@/lib/urls";

export interface AudiobookNotFoundData {
  notFound: true;
  slug: string;
}

export function isAudiobookNotFoundData(value: unknown): value is AudiobookNotFoundData {
  return Boolean(
    value &&
      typeof value === "object" &&
      "notFound" in value &&
      (value as { notFound?: unknown }).notFound === true,
  );
}

/**
 * Two-step slug resolution for `/listen/:slug` and `/listen/:slug/:chapter_slug`:
 * 1. Look up `slug` as an Audiobook slug.
 * 2. If 404, look up `slug` as a Story slug; if the story has an audiobook,
 *    issue a 301 redirect to that audiobook's canonical URL.
 * 3. Otherwise return a 404 response.
 */
export async function loadAudiobookOrRedirect(
  slug: string,
  trackSlug?: string,
): Promise<PublicAudiobookDetail | ReturnType<typeof data<AudiobookNotFoundData>>> {
  try {
    return await storyApi.getAudiobook(slug);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) {
      console.error("[SSR loader] audiobook request failed:", error);
    }
  }

  try {
    const story = await storyApi.getStory(slug);
    const firstAudiobook = story.audiobooks?.[0];
    if (firstAudiobook && firstAudiobook.slug && firstAudiobook.slug !== slug) {
      throw redirect(audiobookUrl(firstAudiobook.slug, trackSlug), 301);
    }
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
  }

  return data<AudiobookNotFoundData>({ notFound: true, slug }, { status: 404 });
}

/**
 * Two-step slug resolution for `/read-along/:slug` (landing) and
 * `/read-along/:slug/:audio_slug` (reader).
 */
export async function loadReadAlongLandingOrRedirect(
  slug: string,
): Promise<PublicAudiobookDetail | ReturnType<typeof data<AudiobookNotFoundData>>> {
  try {
    return await storyApi.getAudiobook(slug);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) {
      console.error("[SSR loader] read-along audiobook request failed:", error);
    }
  }

  try {
    const story = await storyApi.getStory(slug);
    const firstAudiobook = story.audiobooks?.[0];
    if (firstAudiobook && firstAudiobook.slug && firstAudiobook.slug !== slug) {
      throw redirect(readAlongUrl(firstAudiobook.slug), 301);
    }
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
  }

  return data<AudiobookNotFoundData>({ notFound: true, slug }, { status: 404 });
}

export async function loadReadAlongReaderOrRedirect(
  slug: string,
  audioSlug: string,
): Promise<ReadAlongPayload | ReturnType<typeof data<AudiobookNotFoundData>>> {
  try {
    return await storyApi.getAudiobookReadAlong(slug, audioSlug);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) {
      console.error("[SSR loader] audiobook read-along request failed:", error);
    }
  }

  try {
    const story = await storyApi.getStory(slug);
    const firstAudiobook = story.audiobooks?.[0];
    if (firstAudiobook && firstAudiobook.slug && firstAudiobook.slug !== slug) {
      throw redirect(readAlongUrl(firstAudiobook.slug, audioSlug), 301);
    }
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
  }

  return data<AudiobookNotFoundData>({ notFound: true, slug }, { status: 404 });
}
