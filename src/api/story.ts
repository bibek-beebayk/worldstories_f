import { apiClient, fetchAuthenticatedBinary } from "./client";
import {
  StoryListResponse,
  Chapter,
  Story,
  StoryDetail,
  Genre,
  Category,
  HomeDataResponse,
  OriginalsDataResponse,
  DiscoverDataResponse,
  ReviewListResponse,
  Review,
  ReadingProgress,
  AudioReadingProgress,
  FileReadingProgress,
  FileReadingFormat,
  FavoriteStatusResponse,
  PaginatedResponse,
  Submission,
  AdminStory,
  AdminChapter,
  AdminAudio,
  AiGenerationInputField,
  EpubImportJob,
  BookFetchJob,
  PromptSettings,
  Blog,
  AdminBlog,
  AdminSubmission,
  AdminOverviewResponse,
  AdminAuthor,
  AdminUser,
  AdminGenre,
  AdminCategory,
  LibraryShelvesResponse,
  AdminAnalyticsRangeDays,
  AdminAnalyticsContentResponse,
  AdminAnalyticsEngagementResponse,
  AdminAnalyticsUsersResponse,
  AdminAnalyticsSubmissionsResponse,
  AdminAnalyticsAudienceResponse,
  Author,
  AuthorDetail,
  SearchResponse,
  StoryQueueItem,
  StoryQueueItemPayload,
  StoryQueueTitleCheck,
  StoryQueueImportPreview,
  StoryQueueImportRecord,
  StoryMapResponse,
} from "./types";

export const storyApi = {
  getStories: (
    page: number,
    genres: number[] | [],
    sort: string,
    status: string,
    q: string = "",
    language: string = "all",
    storyType: string = "all",
    categories: number[] | [] = [],
    hasAudio: boolean = false,
    hasSummary: boolean = false,
    country: string = "all"
  ) =>
    apiClient<StoryListResponse>(
      `/stories/?page=${page}&genres=${genres.join(",")}&categories=${categories.join(",")}&sort=${sort}&status=${status}&q=${encodeURIComponent(q)}&language=${encodeURIComponent(language)}&story_type=${encodeURIComponent(storyType)}&country=${encodeURIComponent(country)}${hasAudio ? "&has_audio=true" : ""}${hasSummary ? "&has_summary=true" : ""}`
    ),

  getStory: (slug: string) =>
    apiClient<StoryDetail>(`/stories/${slug}/`),

  getBecauseFinished: (slug: string) =>
    apiClient<Story[]>(`/stories/${slug}/because-finished/`),

  getChapter: (story_slug: string, chapter_slug: string, type: string) =>
    apiClient<Chapter>(`/stories/${story_slug}/chapters/${chapter_slug}/?type=${type}`),

  // getAudio: (story_slug: string, audio_slug: string) =>
  //   apiClient<Audio>(`/stories/${story_slug}/audios/${audio_slug}/`),

  getGenres: () => apiClient<Genre[]>("/genres/"),
  getCategories: () => apiClient<Category[]>("/categories/"),
  getAuthors: (page: number = 1) =>
    apiClient<PaginatedResponse<Author>>(`/authors/?page=${page}`),
  getAuthor: (id: number) => apiClient<AuthorDetail>(`/authors/${id}/`),
  getLibraryShelves: (page: number) =>
    apiClient<LibraryShelvesResponse>(`/library-shelves/?page=${page}`),
  getHomeData: () => apiClient<HomeDataResponse>("/home/"),
  getOriginalsData: () => apiClient<OriginalsDataResponse>("/originals/"),
  getDiscoverData: () => apiClient<DiscoverDataResponse>("/discover/"),
  getStoryMap: () => apiClient<StoryMapResponse>("/story-map/"),
  searchStories: (
    q: string,
    page: number = 1,
    sort: string = "popular",
    language: string = "all",
    authorPage: number = 1,
    chapterPage: number = 1
  ) =>
    apiClient<SearchResponse>(
      `/search/?q=${encodeURIComponent(q)}&page=${page}&author_page=${authorPage}&chapter_page=${chapterPage}` +
        `&sort=${sort}&language=${encodeURIComponent(language)}`
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
  getFileReadingProgress: (story_slug: string, format: FileReadingFormat) =>
    apiClient<FileReadingProgress>(`/file-reading-progress/${story_slug}/${format}/`),
  saveFileReadingProgress: (
    story_slug: string,
    format: FileReadingFormat,
    progress: number,
    position: string
  ) =>
    apiClient<FileReadingProgress>(`/file-reading-progress/${story_slug}/${format}/`, {
      method: "PUT",
      body: JSON.stringify({ progress, position }),
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
  getAdminStories: (
    page: number = 1,
    q: string = "",
    filters: {
      is_published?: boolean;
      is_completed?: boolean;
      has_summary?: boolean;
      has_retrospective?: boolean;
    } = {}
  ) =>
    apiClient<PaginatedResponse<AdminStory>>(
      `/admin/stories/?page=${page}&search=${encodeURIComponent(q)}` +
        Object.entries(filters)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `&${key}=${value}`)
          .join("")
    ),
  exportAdminStories: (
    q: string = "",
    filters: {
      is_published?: boolean;
      is_completed?: boolean;
      has_summary?: boolean;
      has_retrospective?: boolean;
    } = {}
  ) =>
    fetchAuthenticatedBinary(
      `/admin/stories/export/?search=${encodeURIComponent(q)}` +
        Object.entries(filters)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `&${key}=${value}`)
          .join("")
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
  linkStoryTranslation: (id: number, targetStoryId: number) =>
    apiClient<AdminStory>(`/admin/stories/${id}/link-translation/`, {
      method: "POST",
      body: JSON.stringify({ target_story_id: targetStoryId }),
    }),
  unlinkStoryTranslation: (id: number) =>
    apiClient<AdminStory>(`/admin/stories/${id}/unlink-translation/`, {
      method: "POST",
    }),
  importStoryEpub: (id: number, epubFile?: File) => {
    if (epubFile) {
      const formData = new FormData();
      formData.append("epub_file", epubFile);
      return apiClient<EpubImportJob>(`/admin/stories/${id}/import-epub/`, {
        method: "POST",
        body: formData,
      });
    }
    return apiClient<EpubImportJob>(`/admin/stories/${id}/import-epub/`, {
      method: "POST",
    });
  },
  getStoryEpubImportStatus: (storyId: number, jobId: number) =>
    apiClient<EpubImportJob>(`/admin/stories/${storyId}/import-epub/${jobId}/`),
  generateStorySummary: (id: number, inputFields: AiGenerationInputField[] = ["title", "author", "content"]) =>
    apiClient<AdminStory>(`/admin/stories/${id}/generate-summary/`, {
      method: "POST",
      body: JSON.stringify({ input_fields: inputFields }),
    }),
  generateStoryRetrospective: (id: number, inputFields: AiGenerationInputField[] = ["title", "author", "content"]) =>
    apiClient<AdminStory>(`/admin/stories/${id}/generate-retrospective/`, {
      method: "POST",
      body: JSON.stringify({ input_fields: inputFields }),
    }),
  getPromptSettings: () => apiClient<PromptSettings>("/admin/prompt-settings/"),
  updatePromptSettings: (payload: Partial<PromptSettings>) =>
    apiClient<PromptSettings>("/admin/prompt-settings/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getBlogs: (page: number = 1, q: string = "", sort: string = "newest", linkedToStory?: boolean) =>
    apiClient<PaginatedResponse<Blog>>(
      `/blog/?page=${page}&search=${encodeURIComponent(q)}&sort=${sort}` +
        (linkedToStory !== undefined ? `&linked_to_story=${linkedToStory}` : "")
    ),
  getBlog: (slug: string) => apiClient<Blog>(`/blog/${slug}/`),
  getBlogsForStory: (storySlug: string) =>
    apiClient<PaginatedResponse<Blog>>(`/blog/?linked_story=${encodeURIComponent(storySlug)}`),
  getAdminBlogs: (page: number = 1, q: string = "") =>
    apiClient<PaginatedResponse<AdminBlog>>(`/admin/blog/?page=${page}&search=${encodeURIComponent(q)}`),
  getAdminBlog: (id: number) => apiClient<AdminBlog>(`/admin/blog/${id}/`),
  createAdminBlog: (formData: FormData) =>
    apiClient<AdminBlog>("/admin/blog/", { method: "POST", body: formData }),
  updateAdminBlog: (id: number, formData: FormData) =>
    apiClient<AdminBlog>(`/admin/blog/${id}/`, { method: "PATCH", body: formData }),
  deleteAdminBlog: (id: number) => apiClient<void>(`/admin/blog/${id}/`, { method: "DELETE" }),
  getStoryQueue: (page: number = 1, isAdded?: boolean) =>
    apiClient<PaginatedResponse<StoryQueueItem>>(
      `/admin/story-queue/?page=${page}${isAdded === undefined ? "" : `&is_added=${isAdded}`}`
    ),
  createStoryQueueItem: (payload: StoryQueueItemPayload) =>
    apiClient<StoryQueueItem>("/admin/story-queue/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addStoryQueueItem: (id: number) =>
    apiClient<StoryQueueItem>(`/admin/story-queue/${id}/add/`, { method: "POST" }),
  checkStoryQueueTitle: (title: string) =>
    apiClient<StoryQueueTitleCheck>(`/admin/story-queue/check-title/?title=${encodeURIComponent(title)}`),
  deleteStoryQueueItem: (id: number) =>
    apiClient<void>(`/admin/story-queue/${id}/`, { method: "DELETE" }),
  fetchStoryQueueBooks: (count: number) =>
    apiClient<BookFetchJob>("/admin/story-queue/fetch-books/", {
      method: "POST",
      body: JSON.stringify({ count }),
    }),
  getStoryQueueFetchBooksStatus: (jobId: number) =>
    apiClient<BookFetchJob>(`/admin/story-queue/fetch-books/${jobId}/`),
  previewStoryQueueImport: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<StoryQueueImportPreview>("/admin/story-queue/import-preview/", {
      method: "POST",
      body: formData,
    });
  },
  confirmStoryQueueImport: (records: StoryQueueImportRecord[]) =>
    apiClient<{ created_count: number; skipped_count: number }>("/admin/story-queue/import-confirm/", {
      method: "POST",
      body: JSON.stringify({ records }),
    }),
  generateBlogExcerpt: (id: number) =>
    apiClient<AdminBlog>(`/admin/blog/${id}/generate-excerpt/`, { method: "POST" }),
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
  getAdminAnalyticsContent: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsContentResponse>(`/admin/analytics/content/?days=${days}`),
  getAdminAnalyticsEngagement: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsEngagementResponse>(`/admin/analytics/engagement/?days=${days}`),
  getAdminAnalyticsUsers: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsUsersResponse>(`/admin/analytics/users/?days=${days}`),
  getAdminAnalyticsSubmissions: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsSubmissionsResponse>(`/admin/analytics/submissions/?days=${days}`),
  getAdminAnalyticsAudience: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsAudienceResponse>(`/admin/analytics/audience/?days=${days}`),
  getAdminAuthors: () =>
    apiClient<AdminAuthor[]>("/admin/authors/"),
  createAdminAuthor: (payload: { name: string; bio?: string; image?: string }) =>
    apiClient<AdminAuthor>("/admin/authors/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminAuthor: (id: number, payload: { name: string; bio?: string; image?: string }) =>
    apiClient<AdminAuthor>(`/admin/authors/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminAuthor: (id: number) =>
    apiClient<void>(`/admin/authors/${id}/`, { method: "DELETE" }),
  getAdminUsers: (page: number = 1, q: string = "") =>
    apiClient<PaginatedResponse<AdminUser>>(
      `/admin/users/?page=${page}&search=${encodeURIComponent(q)}`
    ),
  updateAdminUser: (
    id: string,
    payload: Partial<{ is_staff: boolean; is_superuser: boolean; is_active: boolean }>
  ) =>
    apiClient<AdminUser>(`/admin/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getAdminGenres: () =>
    apiClient<AdminGenre[]>("/admin/genres/"),
  createAdminGenre: (name: string) =>
    apiClient<AdminGenre>("/admin/genres/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  getAdminCategories: () =>
    apiClient<AdminCategory[]>("/admin/categories/"),
  createAdminCategory: (name: string) =>
    apiClient<AdminCategory>("/admin/categories/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateAdminCategory: (id: number, name: string) =>
    apiClient<AdminCategory>(`/admin/categories/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAdminCategory: (id: number) =>
    apiClient<void>(`/admin/categories/${id}/`, { method: "DELETE" }),
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
