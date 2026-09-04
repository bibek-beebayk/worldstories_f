import { apiClient, fetchAuthenticatedBinary, fetchAuthenticatedFile } from "./client";
import {
  StoryListResponse,
  Chapter,
  JourneyDetail,
  JourneyListResponse,
  MoodListResponse,
  Story,
  StoryCompletionResponse,
  StoryReactionsResponse,
  SurpriseResponse,
  StoryDetail,
  Genre,
  GenreDetail,
  Category,
  CategoryDetail,
  Tag,
  TagDetail,
  Theme,
  ThemeDetail,
  HomeDataResponse,
  DiscoverDataResponse,
  ReviewListResponse,
  Review,
  ReadingProgress,
  AudioReadingProgress,
  VideoWatchProgress,
  FileReadingProgress,
  FileReadingFormat,
  FavoriteStatusResponse,
  PaginatedResponse,
  Submission,
  AdminStory,
  AdminFeaturedStory,
  AdminDailyStory,
  AdminChapter,
  AdminAudio,
  AudioTranscriptImportResult,
  AudioTranscriptCuesResponse,
  AdminVideo,
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
  AdminTag,
  AdminJourney,
  AdminJourneyItem,
  AdminMood,
  AdminStoryMood,
  AdminTheme,
  StoryType,
  LibraryShelvesResponse,
  AdminAnalyticsRangeDays,
  AdminAnalyticsContentResponse,
  AdminContentPerformanceResponse,
  AdminContentPerformanceSort,
  AdminAnalyticsEngagementResponse,
  AdminAnalyticsUsersResponse,
  AdminAnalyticsSubmissionsResponse,
  EngagementMetricsResponse,
  AdminAnalyticsAudienceResponse,
  AdminAnalyticsGeographyResponse,
  AdminAnalyticsExportSection,
  AdminAnalyticsExportFileFormat,
  AdminStoryDetailAnalyticsResponse,
  AdminBlogDetailAnalyticsResponse,
  AdminQuickReadDetailAnalyticsResponse,
  BlogReadingProgress,
  QuickReadProgress,
  Author,
  AuthorDetail,
  SearchResponse,
  StoryQueueItem,
  StoryQueueItemPayload,
  StoryQueueTitleCheck,
  StoryQueueImportPreview,
  StoryQueueImportRecord,
  TaxonomyImportPreview,
  TaxonomyImportRow,
  StoryMapResponse,
  ReadAlongResponse,
} from "./types";

export const storyApi = {
  getReadAlong: (storySlug: string, audioSlug: string) =>
    apiClient<ReadAlongResponse>(
      `/stories/${encodeURIComponent(storySlug)}/read-along/${encodeURIComponent(audioSlug)}/`
    ),
  getStories: (
    page: number,
    genres: number[] | [],
    sort: string,
    status: string,
    q: string = "",
    language: string = "all",
    storyType: string | number = "all",
    categories: number[] | [] = [],
    hasAudio: boolean = false,
    hasSummary: boolean = false,
    country: string = "all",
    hasVideo: boolean = false,
    // Mood slugs. Appended rather than slotted in: this signature is already
    // long and positional, so a new parameter anywhere but the end would
    // silently shift every existing call.
    moods: string[] = []
  ) =>
    apiClient<StoryListResponse>(
      `/stories/?page=${page}&genres=${genres.join(",")}&categories=${categories.join(",")}&sort=${sort}&status=${status}&q=${encodeURIComponent(q)}&language=${encodeURIComponent(language)}&story_type=${encodeURIComponent(String(storyType))}&country=${encodeURIComponent(country)}${hasAudio ? "&has_audio=true" : ""}${hasSummary ? "&has_summary=true" : ""}${hasVideo ? "&has_video=true" : ""}${moods.length ? `&moods=${encodeURIComponent(moods.join(","))}` : ""}`
    ),

  getStory: (slug: string) =>
    apiClient<StoryDetail>(`/stories/${slug}/`),

  // Explicit view beacon. The story detail GET above is issued by the SSR
  // render server, so counting a view there recorded the render host's IP and
  // User-Agent instead of the visitor's — see _register_view in the backend.
  // This fires from the browser only, so the backend sees the real visitor.
  registerStoryView: (slug: string) =>
    apiClient<void>(`/stories/${encodeURIComponent(slug)}/view/`, {
      method: "POST",
      body: "{}",
    }),

  // One story, at random from a shortlist the existing ranking produced.
  getSurpriseStory: (options: { exclude?: string; maxMinutes?: number } = {}) => {
    const params = new URLSearchParams();
    if (options.exclude) params.set("exclude", options.exclude);
    if (options.maxMinutes) params.set("max_minutes", String(options.maxMinutes));
    return apiClient<SurpriseResponse>(`/stories/surprise/?${params.toString()}`);
  },

  getMoods: () => apiClient<MoodListResponse>("/moods/"),

  // Totals are public; setting one needs an account. Posting the reaction you
  // already have removes it.
  getStoryReactions: (slug: string) =>
    apiClient<StoryReactionsResponse>(`/stories/${encodeURIComponent(slug)}/reactions/`),
  setStoryReaction: (slug: string, reactionType: string) =>
    apiClient<StoryReactionsResponse>(`/stories/${encodeURIComponent(slug)}/reactions/`, {
      method: "POST",
      body: JSON.stringify({ reaction_type: reactionType }),
    }),

  // Progress comes back derived from the reader's completions, so there is no
  // enrolment step and nothing to sync.
  getJourneys: () => apiClient<JourneyListResponse>("/journeys/"),
  getJourney: (slug: string) =>
    apiClient<JourneyDetail>(`/journeys/${encodeURIComponent(slug)}/`),

  getBecauseFinished: (slug: string) =>
    apiClient<Story[]>(`/stories/${slug}/because-finished/`),

  // The end-of-story screen's payload — one primary "read next" pick plus the
  // themed sections. Composed from the same recommendation path as
  // because-finished above; open to anonymous readers, who get the generic
  // similarity ranking rather than a personalized one.
  getStoryCompletion: (slug: string) =>
    apiClient<StoryCompletionResponse>(
      `/stories/${encodeURIComponent(slug)}/completion/`
    ),

  getChapter: (story_slug: string, chapter_slug: string, type: string) =>
    apiClient<Chapter>(`/stories/${story_slug}/chapters/${chapter_slug}/?type=${type}`),

  // getAudio: (story_slug: string, audio_slug: string) =>
  //   apiClient<Audio>(`/stories/${story_slug}/audios/${audio_slug}/`),

  getGenres: () => apiClient<Genre[]>("/genres/"),
  getGenre: (slug: string) => apiClient<GenreDetail>(`/genres/${slug}/`),
  getCategories: () => apiClient<Category[]>("/categories/"),
  getCategory: (slug: string) => apiClient<CategoryDetail>(`/categories/${slug}/`),
  getTags: () => apiClient<Tag[]>("/tags/"),
  getTag: (slug: string) => apiClient<TagDetail>(`/tags/${slug}/`),
  getThemes: () => apiClient<Theme[]>("/themes/"),
  getTheme: (slug: string) => apiClient<ThemeDetail>(`/themes/${slug}/`),
  getStoryTypes: () => apiClient<StoryType[]>("/story-types/"),
  getAuthors: (page: number = 1) =>
    apiClient<PaginatedResponse<Author>>(`/authors/?page=${page}`),
  getAuthor: (id: number) => apiClient<AuthorDetail>(`/authors/${id}/`),
  getLibraryShelves: (page: number) =>
    apiClient<LibraryShelvesResponse>(`/library-shelves/?page=${page}`),
  getHomeData: () => apiClient<HomeDataResponse>("/home/"),
  getOriginals: (page: number = 1) =>
    apiClient<StoryListResponse>(`/stories/?is_original=true&page=${page}&sort=recent`),
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
  getVideoProgress: (story_slug: string) =>
    apiClient<VideoWatchProgress>(`/video-progress/${story_slug}/`),
  saveVideoProgress: (
    story_slug: string,
    video_slug: string,
    progress: number,
    position_seconds: number,
    duration_seconds: number
  ) =>
    apiClient<VideoWatchProgress>(`/video-progress/${story_slug}/`, {
      method: "PUT",
      body: JSON.stringify({
        video_slug,
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
  getBlogReadingProgress: (blog_slug: string) =>
    apiClient<BlogReadingProgress>(`/blog-reading-progress/${blog_slug}/`),
  saveBlogReadingProgress: (blog_slug: string, progress: number) =>
    apiClient<BlogReadingProgress>(`/blog-reading-progress/${blog_slug}/`, {
      method: "PUT",
      body: JSON.stringify({ progress }),
    }),
  getQuickReadProgress: (story_slug: string) =>
    apiClient<QuickReadProgress>(`/quick-read-progress/${story_slug}/`),
  saveQuickReadProgress: (story_slug: string, progress: number) =>
    apiClient<QuickReadProgress>(`/quick-read-progress/${story_slug}/`, {
      method: "PUT",
      body: JSON.stringify({ progress }),
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
      is_original?: boolean;
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
      is_original?: boolean;
      has_summary?: boolean;
      has_retrospective?: boolean;
    } = {},
    sources: {
      include_stories?: boolean;
      include_queue?: boolean;
    } = {}
  ) =>
    fetchAuthenticatedBinary(
      `/admin/stories/export/?search=${encodeURIComponent(q)}` +
        Object.entries({ ...filters, ...sources })
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `&${key}=${value}`)
          .join("")
    ),
  getAdminStory: (id: number) =>
    apiClient<AdminStory>(`/admin/stories/${id}/`),
  getFeaturedStories: () =>
    apiClient<AdminFeaturedStory[]>("/admin/stories/featured/"),
  setFeaturedStories: (storyIds: number[]) =>
    apiClient<AdminFeaturedStory[]>("/admin/stories/featured/", {
      method: "PUT",
      body: JSON.stringify({ story_ids: storyIds }),
    }),
  getDailyStory: (date: string) =>
    apiClient<AdminDailyStory | null>(`/admin/stories/daily/?date=${encodeURIComponent(date)}`),
  setDailyStory: (payload: { date: string; story: number; featured_reason: string; active: boolean }) =>
    apiClient<AdminDailyStory>("/admin/stories/daily/", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteDailyStory: (date: string) =>
    apiClient<void>(`/admin/stories/daily/?date=${encodeURIComponent(date)}`, { method: "DELETE" }),
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
  updateStoryQueueItem: (id: number, payload: StoryQueueItemPayload) =>
    apiClient<StoryQueueItem>(`/admin/story-queue/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  addStoryQueueItem: (id: number) =>
    apiClient<StoryQueueItem>(`/admin/story-queue/${id}/add/`, { method: "POST" }),
  checkStoryQueueTitle: (title: string, excludeQueueId?: number) =>
    apiClient<StoryQueueTitleCheck>(
      `/admin/story-queue/check-title/?title=${encodeURIComponent(title)}` +
        (excludeQueueId ? `&exclude_queue_id=${excludeQueueId}` : "")
    ),
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
  previewTaxonomyBulkUpdate: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<TaxonomyImportPreview>("/admin/stories/bulk-taxonomy-preview/", {
      method: "POST",
      body: formData,
    });
  },
  confirmTaxonomyBulkUpdate: (records: TaxonomyImportRow[]) =>
    apiClient<{ updated_count: number; skipped_count: number; errors: string[] }>(
      "/admin/stories/bulk-taxonomy-confirm/",
      {
        method: "POST",
        body: JSON.stringify({ records }),
      }
    ),
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
  getAdminContentPerformance: (
    kind: "story" | "audiobook" | "quick_read" | "blog",
    days: AdminAnalyticsRangeDays,
    page: number,
    sort: AdminContentPerformanceSort
  ) =>
    apiClient<AdminContentPerformanceResponse>(
      `/admin/analytics/content-rankings/?kind=${kind}&days=${days}&page=${page}&sort=${sort}`
    ),
  getAdminAnalyticsEngagement: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsEngagementResponse>(`/admin/analytics/engagement/?days=${days}`),
  getAdminAnalyticsUsers: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsUsersResponse>(`/admin/analytics/users/?days=${days}`),
  getAdminAnalyticsEngagementMetrics: (days: AdminAnalyticsRangeDays) =>
    apiClient<EngagementMetricsResponse>(
      `/admin/analytics/engagement-metrics/?days=${days}`
    ),

  getAdminAnalyticsSubmissions: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsSubmissionsResponse>(`/admin/analytics/submissions/?days=${days}`),
  getAdminAnalyticsAudience: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsAudienceResponse>(`/admin/analytics/audience/?days=${days}`),
  getAdminAnalyticsGeography: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsGeographyResponse>(`/admin/analytics/geography/?days=${days}`),
  getAdminStoryDetailAnalytics: (storySlug: string, days: AdminAnalyticsRangeDays) =>
    apiClient<AdminStoryDetailAnalyticsResponse>(`/admin/analytics/stories/${storySlug}/?days=${days}`),
  getAdminBlogDetailAnalytics: (blogSlug: string, days: AdminAnalyticsRangeDays) =>
    apiClient<AdminBlogDetailAnalyticsResponse>(`/admin/analytics/blog/${blogSlug}/?days=${days}`),
  getAdminQuickReadDetailAnalytics: (storySlug: string, days: AdminAnalyticsRangeDays) =>
    apiClient<AdminQuickReadDetailAnalyticsResponse>(
      `/admin/analytics/quick-reads/${storySlug}/?days=${days}`
    ),
  exportAdminAnalytics: (
    sections: AdminAnalyticsExportSection[],
    days: AdminAnalyticsRangeDays,
    fileFormat: AdminAnalyticsExportFileFormat
  ) =>
    fetchAuthenticatedFile(
      `/admin/analytics/export/?sections=${sections.join(",")}&days=${days}&file_format=${fileFormat}`,
      `analytics-export.${fileFormat}`
    ),
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
  updateAdminGenre: (id: number, name: string) =>
    apiClient<AdminGenre>(`/admin/genres/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAdminGenre: (id: number) =>
    apiClient<void>(`/admin/genres/${id}/`, { method: "DELETE" }),
  getAdminCategories: () =>
    apiClient<AdminCategory[]>("/admin/categories/"),
  createAdminCategory: (name: string) =>
    apiClient<AdminCategory>("/admin/categories/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  getAdminTags: () =>
    apiClient<AdminTag[]>("/admin/tags/"),
  createAdminTag: (name: string) =>
    apiClient<AdminTag>("/admin/tags/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateAdminTag: (id: number, name: string) =>
    apiClient<AdminTag>(`/admin/tags/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAdminTag: (id: number) =>
    apiClient<void>(`/admin/tags/${id}/`, { method: "DELETE" }),
  getAdminJourneys: () => apiClient<AdminJourney[]>("/admin/journeys/"),
  createAdminJourney: (payload: { title: string; description?: string; type?: string }) =>
    apiClient<AdminJourney>("/admin/journeys/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminJourney: (
    id: number,
    payload: Partial<{ title: string; description: string; type: string; active: boolean; order: number; cover_image: string }>
  ) =>
    apiClient<AdminJourney>(`/admin/journeys/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminJourney: (id: number) =>
    apiClient<void>(`/admin/journeys/${id}/`, { method: "DELETE" }),
  // Replaces the whole ordered set; position comes from the order sent, so
  // reordering needs no separate call.
  setAdminJourneyItems: (
    id: number,
    items: Array<{ story: number; required: boolean }>
  ) =>
    apiClient<AdminJourneyItem[]>(`/admin/journeys/${id}/items/`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),

  getAdminMoods: () => apiClient<AdminMood[]>("/admin/moods/"),
  createAdminMood: (payload: { name: string; icon?: string; description?: string }) =>
    apiClient<AdminMood>("/admin/moods/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminMood: (
    id: number,
    payload: Partial<{ name: string; icon: string; description: string; active: boolean; order: number }>
  ) =>
    apiClient<AdminMood>(`/admin/moods/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminMood: (id: number) =>
    apiClient<void>(`/admin/moods/${id}/`, { method: "DELETE" }),
  // Machine suggestions nobody has looked at yet — the queue that makes
  // "allow admin review" a workflow rather than a database column.
  getPendingMoodReviews: () =>
    apiClient<AdminStoryMood[]>("/admin/moods/pending-review/"),
  reviewMoodAssignment: (assignmentId: number, approved: boolean, note?: string) =>
    apiClient<AdminStoryMood | void>(`/admin/moods/assignments/${assignmentId}/review/`, {
      method: "POST",
      body: JSON.stringify({ approved, ...(note ? { note } : {}) }),
    }),
  getStoryMoods: (storyId: number) =>
    apiClient<AdminStoryMood[]>(`/admin/moods/assignments/${storyId}/`),
  setStoryMoods: (storyId: number, moodIds: number[]) =>
    apiClient<AdminStoryMood[]>(`/admin/moods/assignments/${storyId}/`, {
      method: "POST",
      body: JSON.stringify({ moods: moodIds }),
    }),

  getAdminThemes: () =>
    apiClient<AdminTheme[]>("/admin/themes/"),
  createAdminTheme: (name: string) =>
    apiClient<AdminTheme>("/admin/themes/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateAdminTheme: (id: number, name: string) =>
    apiClient<AdminTheme>(`/admin/themes/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAdminTheme: (id: number) =>
    apiClient<void>(`/admin/themes/${id}/`, { method: "DELETE" }),
  updateAdminCategory: (id: number, name: string) =>
    apiClient<AdminCategory>(`/admin/categories/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAdminCategory: (id: number) =>
    apiClient<void>(`/admin/categories/${id}/`, { method: "DELETE" }),
  getAdminStoryTypes: () =>
    apiClient<StoryType[]>("/admin/story-types/"),
  createAdminStoryType: (name: string) =>
    apiClient<StoryType>("/admin/story-types/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateAdminStoryType: (id: number, name: string) =>
    apiClient<StoryType>(`/admin/story-types/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAdminStoryType: (id: number) =>
    apiClient<void>(`/admin/story-types/${id}/`, { method: "DELETE" }),
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
  /** Superuser-only: set a track's default Read Along highlight offset (milliseconds). */
  setReadAlongOffset: (id: number, offsetMs: number) =>
    apiClient<AdminAudio>(`/admin/audios/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ read_along_offset_ms: offsetMs }),
    }),
  importAudioTranscript: (id: number, formData: FormData) =>
    apiClient<AudioTranscriptImportResult>(`/admin/audios/${id}/import-transcript/`, {
      method: "POST",
      body: formData,
    }),
  clearAudioTranscript: (id: number) =>
    apiClient<AudioTranscriptImportResult>(`/admin/audios/${id}/clear-transcript/`, {
      method: "POST",
    }),
  getAudioTranscriptCues: (id: number) =>
    apiClient<AudioTranscriptCuesResponse>(`/admin/audios/${id}/transcript-cues/`),
  replaceAudioTranscriptCues: (
    id: number,
    cues: Array<{ order: number; start_ms: number; end_ms: number; text: string }>
  ) =>
    apiClient<AudioTranscriptImportResult>(`/admin/audios/${id}/transcript-cues/`, {
      method: "PUT",
      body: JSON.stringify({ cues }),
    }),
  getAdminVideos: (storyId: number) =>
    apiClient<PaginatedResponse<AdminVideo>>(`/admin/videos/?story=${storyId}`),
  createAdminVideo: (payload: {
    story: number;
    title: string;
    order: number;
    slug?: string;
    youtube_url: string;
    duration_seconds?: string | number | null;
  }) =>
    apiClient<AdminVideo>("/admin/videos/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminVideo: (
    id: number,
    payload: Partial<{
      title: string;
      order: number;
      slug: string;
      youtube_url: string;
      duration_seconds: string | number | null;
    }>
  ) =>
    apiClient<AdminVideo>(`/admin/videos/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminVideo: (id: number) =>
    apiClient<void>(`/admin/videos/${id}/`, {
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
