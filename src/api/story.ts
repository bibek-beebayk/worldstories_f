import { apiClient } from "./client";
import { StoryListResponse, Chapter, StoryDetail, Genre, Audio } from "./types";

export const storyApi = {
  getStories: (page: number, genres: number[] | [], sort: string, status: string) => apiClient<StoryListResponse>(`/stories/?page=${page}&genres=${genres.join(",")}&sort=${sort}&status=${status}`),

  getStory: (slug: string) => 
    apiClient<StoryDetail>(`/stories/${slug}/`),

  getChapter: (story_slug: string, chapter_slug: string, type: string) =>
    apiClient<Chapter>(`/stories/${story_slug}/${chapter_slug}/?type=${type}`),

  // getAudio: (story_slug: string, audio_slug: string) =>
  //   apiClient<Audio>(`/stories/${story_slug}/audios/${audio_slug}/`),

  getGenres: () => apiClient<Genre[]>("/genres/"),
};
