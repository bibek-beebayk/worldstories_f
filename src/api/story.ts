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
  AudioReadingProgress,
  FavoriteStatusResponse,
  PaginatedResponse,
  Submission,
  AdminStory,
  AdminChapter,
  AdminAudio,
  AdminSubmission,
  AdminOverviewResponse,
  AdminAuthor,
  AdminGenre,
} from "./types";

export const storyApi = {
  getStories: (
    page: number,
    genres: number[] | [],
    sort: string,
    status: string,
    q: string = ""
  ) =>
    apiClient<StoryListResponse>(
      `/stories/?page=${page}&genres=${genres.join(",")}&sort=${sort}&status=${status}&q=${encodeURIComponent(q)}`
    ),

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
  getAudioProgress: (story_slug: string) =>
    apiClient<AudioReadingProgress>(`/audio-progress/${story_slug}/`),
  saveAudioProgress: (
    story_slug: string,
    audio_slug: string,
    progress: number,
    position_seconds: number,
    duration_seconds: number
  ) =>
    apiClient<AudioReadingProgress>(`/audio-progress/${story_slug}/`, {
      method: "PUT",
      body: JSON.stringify({
        audio_slug,
        progress,
        position_seconds,
        duration_seconds,
      }),
    }),
  addFavorite: (slug: string) =>
    apiClient<FavoriteStatusResponse>(`/stories/${slug}/favorite/`, {
      method: "POST",
    }),
  removeFavorite: (slug: string) =>
    apiClient<FavoriteStatusResponse>(`/stories/${slug}/favorite/`, {
      method: "DELETE",
    }),
  createSubmission: (formData: FormData) =>
    apiClient<Submission>("/submissions/", {
      method: "POST",
      body: formData,
    }),
  getMySubmissions: (page: number = 1) =>
    apiClient<PaginatedResponse<Submission>>(`/submissions/?page=${page}`),
  getMySubmission: (id: number) =>
    apiClient<Submission>(`/submissions/${id}/`),
  updateMySubmission: (id: number, formData: FormData) =>
    apiClient<Submission>(`/submissions/${id}/`, {
      method: "PATCH",
      body: formData,
    }),
  deleteMySubmission: (id: number) =>
    apiClient<void>(`/submissions/${id}/`, {
      method: "DELETE",
    }),
  getAdminStories: (page: number = 1, q: string = "") =>
    apiClient<PaginatedResponse<AdminStory>>(
      `/admin/stories/?page=${page}&search=${encodeURIComponent(q)}`
    ),
  getAdminStory: (id: number) =>
    apiClient<AdminStory>(`/admin/stories/${id}/`),
  createAdminStory: (formData: FormData) =>
    apiClient<AdminStory>("/admin/stories/", {
      method: "POST",
      body: formData,
    }),
  updateAdminStory: (id: number, formData: FormData) =>
    apiClient<AdminStory>(`/admin/stories/${id}/`, {
      method: "PATCH",
      body: formData,
    }),
  getAdminChapters: (storyId: number) =>
    apiClient<PaginatedResponse<AdminChapter>>(`/admin/chapters/?story=${storyId}`),
  getAdminAudios: (storyId: number) =>
    apiClient<PaginatedResponse<AdminAudio>>(`/admin/audios/?story=${storyId}`),
  getAdminSubmissions: (page: number = 1, q: string = "", status: string = "all") =>
    apiClient<PaginatedResponse<AdminSubmission>>(
      `/admin/submissions/?page=${page}&search=${encodeURIComponent(q)}${
        status !== "all" ? `&status=${encodeURIComponent(status)}` : ""
      }`
    ),
  getAdminSubmission: (id: number) =>
    apiClient<AdminSubmission>(`/admin/submissions/${id}/`),
  getAdminOverview: () =>
    apiClient<AdminOverviewResponse>("/admin/overview/"),
  getAdminAuthors: () =>
    apiClient<AdminAuthor[]>("/admin/authors/"),
  createAdminAuthor: (payload: { name: string; bio?: string; image?: string }) =>
    apiClient<AdminAuthor>("/admin/authors/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAdminGenres: () =>
    apiClient<AdminGenre[]>("/admin/genres/"),
  createAdminGenre: (name: string) =>
    apiClient<AdminGenre>("/admin/genres/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  createAdminChapter: (payload: {
    story: number;
    title: string;
    slug?: string;
    content: string;
    order: number;
  }) =>
    apiClient<AdminChapter>("/admin/chapters/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminChapter: (
    id: number,
    payload: Partial<{
      title: string;
      slug: string;
      content: string;
      order: number;
    }>
  ) =>
    apiClient<AdminChapter>(`/admin/chapters/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminChapter: (id: number) =>
    apiClient<void>(`/admin/chapters/${id}/`, {
      method: "DELETE",
    }),
  createAdminAudio: (formData: FormData) =>
    apiClient<AdminAudio>("/admin/audios/", {
      method: "POST",
      body: formData,
    }),
  updateAdminAudio: (id: number, formData: FormData) =>
    apiClient<AdminAudio>(`/admin/audios/${id}/`, {
      method: "PATCH",
      body: formData,
    }),
  deleteAdminAudio: (id: number) =>
    apiClient<void>(`/admin/audios/${id}/`, {
      method: "DELETE",
    }),
  updateAdminSubmission: (
    id: number,
    payload: Partial<{
      status: "pending" | "requires_edit" | "approved" | "rejected";
      reviewer_notes: string;
    }>
  ) =>
    apiClient<AdminSubmission>(`/admin/submissions/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
