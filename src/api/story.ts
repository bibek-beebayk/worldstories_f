import { apiClient } from "./client";
import { StoryListResponse, Chapter, Story, StoryDetail } from "./types";

export const storyApi = {
  getStories: () => apiClient<StoryListResponse>("/stories/"),

  getStory: (slug: string) => 
    apiClient<StoryDetail>(`/stories/${slug}/`),

  getChapter: (story_slug: string, chapter_slug: string) =>
    apiClient<Chapter>(`/stories/${story_slug}/${chapter_slug}/`),
};
