import { apiClient } from "./client";
import { StoryListResponse, Chapter, Story, StoryDetail, Genre } from "./types";

export const storyApi = {
  getStories: (page: number, genres: number[] | [], sort: string, status: string) => apiClient<StoryListResponse>(`/stories/?page=${page}&genres=${genres.join(",")}&sort=${sort}&status=${status}`),

  getStory: (slug: string) => 
    apiClient<StoryDetail>(`/stories/${slug}/`),

  getChapter: (story_slug: string, chapter_slug: string) =>
    apiClient<Chapter>(`/stories/${story_slug}/${chapter_slug}/`),

  getGenres: () => apiClient<Genre[]>("/genres/"),
};
