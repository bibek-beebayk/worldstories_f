import { apiClient } from "./client";
import {
  StoryListResponse,
  Chapter,
  StoryDetail,
  Genre,
  HomeDataResponse,
  TrendingDataResponse,
  OriginalsDataResponse,
  DiscoverDataResponse,
  ReviewListResponse,
  Review,
  ReadingProgress,
} from "./types";

export const storyApi = {
  getStories: (page: number, genres: number[] | [], sort: string, status: string) => apiClient<StoryListResponse>(`/stories/?page=${page}&genres=${genres.join(",")}&sort=${sort}&status=${status}`),

  getStory: (slug: string) => 
    apiClient<StoryDetail>(`/stories/${slug}/`),

  getChapter: (story_slug: string, chapter_slug: string, type: string) =>
    apiClient<Chapter>(`/stories/${story_slug}/chapters/${chapter_slug}/?type=${type}`),

  // getAudio: (story_slug: string, audio_slug: string) =>
  //   apiClient<Audio>(`/stories/${story_slug}/audios/${audio_slug}/`),

  getGenres: () => apiClient<Genre[]>("/genres/"),
  getHomeData: () => apiClient<HomeDataResponse>("/home/"),
  getTrendingData: () => apiClient<TrendingDataResponse>("/trending/"),
  getOriginalsData: () => apiClient<OriginalsDataResponse>("/originals/"),
  getDiscoverData: () => apiClient<DiscoverDataResponse>("/discover/"),
  searchStories: (q: string, page: number = 1, sort: string = "popular") =>
    apiClient<StoryListResponse>(
      `/search/?q=${encodeURIComponent(q)}&page=${page}&sort=${sort}`
    ),
  getStoryReviews: (slug: string, page: number = 1) =>
    apiClient<ReviewListResponse>(`/stories/${slug}/reviews/?page=${page}`),
  createStoryReview: (slug: string, rating: number, comment: string) =>
    apiClient<Review>(`/stories/${slug}/reviews/`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),
  getMyStoryReview: (slug: string) =>
    apiClient<Review>(`/stories/${slug}/reviews/me/`),
  updateMyStoryReview: (slug: string, rating: number, comment: string) =>
    apiClient<Review>(`/stories/${slug}/reviews/me/`, {
      method: "PATCH",
      body: JSON.stringify({ rating, comment }),
    }),
  deleteMyStoryReview: (slug: string) =>
    apiClient<void>(`/stories/${slug}/reviews/me/`, {
      method: "DELETE",
    }),
  getReadingProgress: (story_slug: string) =>
    apiClient<ReadingProgress>(`/reading-progress/${story_slug}/`),
  saveReadingProgress: (
    story_slug: string,
    chapter_slug: string,
    progress: number,
    last_element_id: string = ""
  ) =>
    apiClient<ReadingProgress>(`/reading-progress/${story_slug}/`, {
      method: "PUT",
      body: JSON.stringify({ chapter_slug, progress, last_element_id }),
    }),
};
