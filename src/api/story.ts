import { apiClient, fetchAuthenticatedBinary, fetchAuthenticatedFile } from "./client";
import {
  NepalikathaAnalytics,
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
  AdminAudiobookDetail,
  AdminAudiobookListItem,
  AdminAudiobookListParams,
  AdminAudiobookSeries,
  AdminAudiobookSeriesBulkResult,
  AdminAudiobookSeriesDetail,
  AdminAudiobookStats,
  AdminAudiobookTrack,
  AdminAudiobookUploadTracksResult,
  AdminStorySearchItem,
  AudiobookProgressPayload,
  AudiobooksOverviewResponse,
  AudiobookStats,
  AudioTranscriptImportResult,
  PublicAudiobook,
  PublicAudiobookDetail,
  PublicAudiobookListParams,
  AudioTranscriptCuesResponse,
  AdminVideo,
  PublicVideo,
  AdminVideoType,
  VideoTypeOption,
  PublicVideoDetail,
  VideoProgress,
  VideoSeries,
  WatchOverview,
  AiGenerationInputField,
  EpubImportJob,
  BookFetchJob,
  PromptSettings,
  Blog,
  AdminBlog,
  AdminBlogListParams,
  AdminBlogStats,
  AdminSubmission,
  AdminOverviewResponse,
  AdminAuthor,
  AdminUser,
  AdminGenre,
  AdminCategory,
  AdminTag,
  AdminJourney,
  AdminHeroTemplate,
  AdminPage,
  AdminPageInput,
  AdminPageListItem,
  AdminPageTheme,
  AdminSiteTheme,
  PublicSiteTheme,
  SiteThemeInput,
  PageThemeValues,
  PublicPageResponse,
  AdminHeroTemplateInput,
  AdminHomeSection,
  AdminHomeSectionInput,
  AdminHomeSectionPreviewPayload,
  AdminHomeSectionPreviewResponse,
  HomeSectionTemplate,
  HomeSectionTypesMeta,
  AdminStoryStats,
  AdminBlogTopic,
  BlogOverview,
  DiscoverSurpriseResponse,
  LibraryCollection,
  LibraryFacets,
  HomeSectionAnalytics,
  MissingCoverStories,
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
  AdminUserTimelineResponse,
  AdminAnalyticsSubmissionsResponse,
  AdminAnalyticsAudienceResponse,
  AdminAnalyticsMonetizationResponse,
  AdminGeographyCountryDetail,
  AdminGeographyResponse,
  AdminGeographyScope,
  AdminAnalyticsExportSection,
  AdminAnalyticsExportFileFormat,
  AdminStoryDetailAnalyticsResponse,
  AdminBlogDetailAnalyticsResponse,
  AdminQuickReadDetailAnalyticsResponse,
  BlogReadingProgress,
  QuickReadProgress,
  Author,
  AuthorsOverview,
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
  AudiobookStats,
  QuickReadHeroResponse,
} from "./types";

export const storyApi = {
  getAdminNepalikathaAnalytics: (days: number) =>
    apiClient<NepalikathaAnalytics>(`/admin/analytics/nepalikatha/?days=${days}`),
  getReadAlong: (storySlug: string, audioSlug: string) =>
    apiClient<ReadAlongResponse>(
      `/stories/${encodeURIComponent(storySlug)}/read-along/${encodeURIComponent(audioSlug)}/`,
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
    moods: string[] = [],
    // Also appended at the end for the same reason as `moods` above.
    hasReadAlong: boolean = false,
    // Text-only filtering for map/library explorers. Appended to preserve the
    // long-standing positional call contract above.
    format: string = "all",
    audioLength: string = "all",
    maxAudioMinutes?: number,
    summaryLength: string = "all",
    notReadQuick: boolean = false,
  ) =>
    apiClient<StoryListResponse>(
      `/stories/?page=${page}&genres=${genres.join(",")}&categories=${categories.join(",")}&sort=${sort}&status=${status}&q=${encodeURIComponent(q)}&language=${encodeURIComponent(language)}&story_type=${encodeURIComponent(String(storyType))}&country=${encodeURIComponent(country)}${hasAudio ? "&has_audio=true" : ""}${hasSummary ? "&has_summary=true" : ""}${hasVideo ? "&has_video=true" : ""}${moods.length ? `&moods=${encodeURIComponent(moods.join(","))}` : ""}${hasReadAlong ? "&has_read_along=true" : ""}${format !== "all" ? `&format=${encodeURIComponent(format)}` : ""}${audioLength && audioLength !== "all" ? `&audio_length=${encodeURIComponent(audioLength)}` : ""}${maxAudioMinutes !== undefined ? `&max_audio_minutes=${encodeURIComponent(String(maxAudioMinutes))}` : ""}${summaryLength && summaryLength !== "all" ? `&summary_length=${encodeURIComponent(summaryLength)}` : ""}${notReadQuick ? "&not_read_quick=true" : ""}`,
    ),

  getAudiobookStats: () => apiClient<AudiobookStats>("/stories/audiobook-stats/"),
  getQuickReadHero: () => apiClient<QuickReadHeroResponse>("/stories/quick-read-hero/"),

  // The Library page: every filter travels as a named param (see lib/libraryParams.ts).
  getLibraryStories: (page: number, params: Record<string, string>) =>
    apiClient<StoryListResponse>(`/stories/?${new URLSearchParams({ ...params, page: String(page) }).toString()}`),
  getLibraryFacets: (params: Record<string, string>) =>
    apiClient<LibraryFacets>(`/stories/facets/?${new URLSearchParams(params).toString()}`),
  getLibraryCollections: () => apiClient<{ results: LibraryCollection[] }>("/stories/collections/"),
  // Signed-in only. One request for a whole page of cards.
  getStoryProgress: (ids: number[]) =>
    apiClient<{ progress: Record<string, number> }>(`/stories/progress/?ids=${ids.join(",")}`),

  getStory: (slug: string) => apiClient<StoryDetail>(`/stories/${slug}/`),

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
  getJourney: (slug: string) => apiClient<JourneyDetail>(`/journeys/${encodeURIComponent(slug)}/`),

  getBecauseFinished: (slug: string) => apiClient<Story[]>(`/stories/${slug}/because-finished/`),

  // The end-of-story screen's payload — one primary "read next" pick plus the
  // themed sections. Composed from the same recommendation path as
  // because-finished above; open to anonymous readers, who get the generic
  // similarity ranking rather than a personalized one.
  getStoryCompletion: (slug: string) =>
    apiClient<StoryCompletionResponse>(`/stories/${encodeURIComponent(slug)}/completion/`),

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
  getAuthors: (
    filters: { q?: string; letter?: string; country?: string; era?: string; genre?: string; sort?: string } = {},
  ) => {
    const params = new URLSearchParams({ page_size: "all" });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return apiClient<PaginatedResponse<Author>>(`/authors/?${params.toString()}`);
  },
  getAuthorsOverview: () => apiClient<AuthorsOverview>("/authors/overview/"),
  getVideos: (
    page: number = 1,
    filters: { q?: string; series?: string; length?: string; sort?: string; videoType?: number | null } = {},
  ) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters.q) params.set("q", filters.q);
    if (filters.series) params.set("series", filters.series);
    if (filters.length) params.set("length", filters.length);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.videoType) params.set("video_type", String(filters.videoType));
    return apiClient<PaginatedResponse<PublicVideo>>(`/videos/?${params.toString()}`);
  },
  getVideoTypes: () => apiClient<VideoTypeOption[]>("/video-types/"),
  getVideoSeries: () => apiClient<VideoSeries[]>("/video-series/"),
  getWatchOverview: () => apiClient<WatchOverview>("/videos/overview/"),
  getVideo: (id: number | string) => apiClient<PublicVideoDetail>(`/videos/${id}/`),
  getWatchProgress: (video_id: number | string) => apiClient<VideoProgress>(`/watch-progress/${video_id}/`),
  saveWatchProgress: (
    video_id: number | string,
    progress: number,
    position_seconds: number,
    duration_seconds: number,
  ) =>
    apiClient<VideoProgress>(`/watch-progress/${video_id}/`, {
      method: "PUT",
      body: JSON.stringify({ progress, position_seconds, duration_seconds }),
    }),
  getAuthor: (id: number | string) => apiClient<AuthorDetail>(`/authors/${id}/`),
  getLibraryShelves: (page: number) => apiClient<LibraryShelvesResponse>(`/library-shelves/?page=${page}`),
  getHomeData: () => apiClient<HomeDataResponse>("/home/"),
  getOriginals: (page: number = 1) =>
    apiClient<StoryListResponse>(`/stories/?is_original=true&page=${page}&sort=recent`),
  getDiscoverData: () => apiClient<DiscoverDataResponse>("/discover/"),
  getDiscoverSurprise: (exclude: number[]) =>
    apiClient<DiscoverSurpriseResponse>(`/discover/surprise/?exclude=${exclude.join(",")}`),
  getStoryMap: () => apiClient<StoryMapResponse>("/story-map/"),
  searchStories: (
    q: string,
    page: number = 1,
    sort: string = "popular",
    language: string = "all",
    authorPage: number = 1,
    chapterPage: number = 1,
  ) =>
    apiClient<SearchResponse>(
      `/search/?q=${encodeURIComponent(q)}&page=${page}&author_page=${authorPage}&chapter_page=${chapterPage}` +
        `&sort=${sort}&language=${encodeURIComponent(language)}`,
    ),
  getStoryReviews: (slug: string, page: number = 1) =>
    apiClient<ReviewListResponse>(`/stories/${slug}/reviews/?page=${page}`),
  createStoryReview: (slug: string, rating: number, comment: string) =>
    apiClient<Review>(`/stories/${slug}/reviews/`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),
  getMyStoryReview: (slug: string) => apiClient<Review>(`/stories/${slug}/reviews/me/`),
  updateMyStoryReview: (slug: string, rating: number, comment: string) =>
    apiClient<Review>(`/stories/${slug}/reviews/me/`, {
      method: "PATCH",
      body: JSON.stringify({ rating, comment }),
    }),
  deleteMyStoryReview: (slug: string) =>
    apiClient<void>(`/stories/${slug}/reviews/me/`, {
      method: "DELETE",
    }),
  getReadingProgress: (story_slug: string) => apiClient<ReadingProgress>(`/reading-progress/${story_slug}/`),
  saveReadingProgress: (story_slug: string, chapter_slug: string, progress: number, last_element_id: string = "") =>
    apiClient<ReadingProgress>(`/reading-progress/${story_slug}/`, {
      method: "PUT",
      body: JSON.stringify({ chapter_slug, progress, last_element_id }),
    }),
  getAudioProgress: (story_slug: string) => apiClient<AudioReadingProgress>(`/audio-progress/${story_slug}/`),
  saveAudioProgress: (
    story_slug: string,
    audio_slug: string,
    progress: number,
    position_seconds: number,
    duration_seconds: number,
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
  getVideoProgress: (story_slug: string) => apiClient<VideoWatchProgress>(`/video-progress/${story_slug}/`),
  getFileReadingProgress: (story_slug: string, format: FileReadingFormat) =>
    apiClient<FileReadingProgress>(`/file-reading-progress/${story_slug}/${format}/`),
  saveFileReadingProgress: (story_slug: string, format: FileReadingFormat, progress: number, position: string) =>
    apiClient<FileReadingProgress>(`/file-reading-progress/${story_slug}/${format}/`, {
      method: "PUT",
      body: JSON.stringify({ progress, position }),
    }),
  getBlogReadingProgress: (blog_slug: string) => apiClient<BlogReadingProgress>(`/blog-reading-progress/${blog_slug}/`),
  saveBlogReadingProgress: (blog_slug: string, progress: number) =>
    apiClient<BlogReadingProgress>(`/blog-reading-progress/${blog_slug}/`, {
      method: "PUT",
      body: JSON.stringify({ progress }),
    }),
  getQuickReadProgress: (story_slug: string) => apiClient<QuickReadProgress>(`/quick-read-progress/${story_slug}/`),
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
  getMySubmissions: (page: number = 1) => apiClient<PaginatedResponse<Submission>>(`/submissions/?page=${page}`),
  getMySubmission: (id: number) => apiClient<Submission>(`/submissions/${id}/`),
  updateMySubmission: (id: number, formData: FormData) =>
    apiClient<Submission>(`/submissions/${id}/`, {
      method: "PATCH",
      body: formData,
    }),
  deleteMySubmission: (id: number) =>
    apiClient<void>(`/submissions/${id}/`, {
      method: "DELETE",
    }),
  getAdminStoryStats: () => apiClient<AdminStoryStats>("/admin/stories/stats/"),
  getAdminStories: (
    page: number = 1,
    q: string = "",
    filters: {
      is_published?: boolean;
      is_completed?: boolean;
      is_original?: boolean;
      has_summary?: boolean;
      has_retrospective?: boolean;
      has_cover?: boolean;
      has_chapters?: boolean;
      status?: "published" | "draft" | "scheduled";
      sort?: "newest" | "oldest" | "title_asc" | "title_desc";
    } = {},
  ) =>
    apiClient<PaginatedResponse<AdminStory>>(
      `/admin/stories/?page=${page}&search=${encodeURIComponent(q)}` +
        Object.entries(filters)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `&${key}=${value}`)
          .join(""),
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
    } = {},
  ) =>
    fetchAuthenticatedBinary(
      `/admin/stories/export/?search=${encodeURIComponent(q)}` +
        Object.entries({ ...filters, ...sources })
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `&${key}=${value}`)
          .join(""),
    ),
  getAdminStory: (id: number) => apiClient<AdminStory>(`/admin/stories/${id}/`),
  getFeaturedStories: () => apiClient<AdminFeaturedStory[]>("/admin/stories/featured/"),
  setFeaturedItems: (items: { kind: "story" | "video"; id: number }[]) =>
    apiClient<AdminFeaturedStory[]>("/admin/stories/featured/", {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),
  getDailyStory: (date: string) =>
    apiClient<AdminDailyStory | null>(`/admin/stories/daily/?date=${encodeURIComponent(date)}`),
  setDailyStory: (payload: {
    date: string;
    story?: number;
    video?: number;
    featured_reason: string;
    active: boolean;
  }) =>
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
  getBlogs: (page: number = 1, q: string = "", sort: string = "newest", linkedToStory?: boolean, topic: string = "") =>
    apiClient<PaginatedResponse<Blog>>(
      `/blog/?page=${page}&q=${encodeURIComponent(q)}&sort=${sort}` +
        (linkedToStory !== undefined ? `&linked_to_story=${linkedToStory}` : "") +
        (topic ? `&topic=${encodeURIComponent(topic)}` : ""),
    ),
  getBlogOverview: () => apiClient<BlogOverview>("/blog/overview/"),
  getAdminBlogTopics: () => apiClient<AdminBlogTopic[]>("/admin/blog-topics/"),
  suggestBlogTopics: (id: number) => apiClient<AdminBlog>(`/admin/blog/${id}/suggest-topics/`, { method: "POST" }),
  getBlog: (slug: string) => apiClient<Blog>(`/blog/${slug}/`),
  getBlogsForStory: (storySlug: string) =>
    apiClient<PaginatedResponse<Blog>>(`/blog/?linked_story=${encodeURIComponent(storySlug)}`),
  getAdminBlogStats: () => apiClient<AdminBlogStats>("/admin/blog/stats/"),
  getAdminBlogs: (params: AdminBlogListParams = {}) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    if (params.has_excerpt !== undefined) query.set("has_excerpt", String(params.has_excerpt));
    if (params.has_topics !== undefined) query.set("has_topics", String(params.has_topics));
    if (params.has_cover !== undefined) query.set("has_cover", String(params.has_cover));
    if (params.has_linked_stories !== undefined) query.set("has_linked_stories", String(params.has_linked_stories));
    if (params.topic !== undefined) query.set("topic", String(params.topic));
    if (params.sort) query.set("sort", params.sort);
    const qs = query.toString();
    return apiClient<PaginatedResponse<AdminBlog>>(`/admin/blog/${qs ? `?${qs}` : ""}`);
  },
  getAdminBlog: (id: number) => apiClient<AdminBlog>(`/admin/blog/${id}/`),
  createAdminBlog: (formData: FormData) => apiClient<AdminBlog>("/admin/blog/", { method: "POST", body: formData }),
  updateAdminBlog: (id: number, formData: FormData) =>
    apiClient<AdminBlog>(`/admin/blog/${id}/`, { method: "PATCH", body: formData }),
  deleteAdminBlog: (id: number) => apiClient<void>(`/admin/blog/${id}/`, { method: "DELETE" }),
  getStoryQueue: (page: number = 1, isAdded?: boolean) =>
    apiClient<PaginatedResponse<StoryQueueItem>>(
      `/admin/story-queue/?page=${page}${isAdded === undefined ? "" : `&is_added=${isAdded}`}`,
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
  addStoryQueueItem: (id: number) => apiClient<StoryQueueItem>(`/admin/story-queue/${id}/add/`, { method: "POST" }),
  checkStoryQueueTitle: (title: string, excludeQueueId?: number) =>
    apiClient<StoryQueueTitleCheck>(
      `/admin/story-queue/check-title/?title=${encodeURIComponent(title)}` +
        (excludeQueueId ? `&exclude_queue_id=${excludeQueueId}` : ""),
    ),
  deleteStoryQueueItem: (id: number) => apiClient<void>(`/admin/story-queue/${id}/`, { method: "DELETE" }),
  fetchStoryQueueBooks: (count: number) =>
    apiClient<BookFetchJob>("/admin/story-queue/fetch-books/", {
      method: "POST",
      body: JSON.stringify({ count }),
    }),
  getStoryQueueFetchBooksStatus: (jobId: number) => apiClient<BookFetchJob>(`/admin/story-queue/fetch-books/${jobId}/`),
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
      },
    ),
  generateBlogExcerpt: (id: number) => apiClient<AdminBlog>(`/admin/blog/${id}/generate-excerpt/`, { method: "POST" }),
  getAdminChapters: (storyId: number) =>
    apiClient<PaginatedResponse<AdminChapter>>(`/admin/chapters/?story=${storyId}`),
  getAdminAudios: (storyId: number) => apiClient<PaginatedResponse<AdminAudio>>(`/admin/audios/?story=${storyId}`),
  getAdminSubmissions: (page: number = 1, q: string = "", status: string = "all") =>
    apiClient<PaginatedResponse<AdminSubmission>>(
      `/admin/submissions/?page=${page}&search=${encodeURIComponent(q)}${
        status !== "all" ? `&status=${encodeURIComponent(status)}` : ""
      }`,
    ),
  getAdminSubmission: (id: number) => apiClient<AdminSubmission>(`/admin/submissions/${id}/`),
  getAdminOverview: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminOverviewResponse>(`/admin/overview/?days=${days}`),
  getAdminAnalyticsContent: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsContentResponse>(`/admin/analytics/content/?days=${days}`),
  getAdminContentPerformance: (
    kind: "story" | "audiobook" | "quick_read" | "blog",
    days: AdminAnalyticsRangeDays,
    page: number,
    sort: AdminContentPerformanceSort,
  ) =>
    apiClient<AdminContentPerformanceResponse>(
      `/admin/analytics/content-rankings/?kind=${kind}&days=${days}&page=${page}&sort=${sort}`,
    ),
  getAdminAnalyticsEngagement: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsEngagementResponse>(`/admin/analytics/engagement/?days=${days}`),
  getAdminAnalyticsUsers: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsUsersResponse>(`/admin/analytics/users/?days=${days}`),
  getAdminUserTimeline: (userId: string) =>
    apiClient<AdminUserTimelineResponse>(`/admin/analytics/users/${userId}/timeline/`),

  getAdminAnalyticsSubmissions: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsSubmissionsResponse>(`/admin/analytics/submissions/?days=${days}`),
  getAdminAnalyticsAudience: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsAudienceResponse>(`/admin/analytics/audience/?days=${days}`),
  getAdminAnalyticsMonetization: (days: AdminAnalyticsRangeDays) =>
    apiClient<AdminAnalyticsMonetizationResponse>(`/admin/analytics/monetization/?days=${days}`),
  getAdminAnalyticsGeography: (days: AdminAnalyticsRangeDays, scope: AdminGeographyScope = "visitors") =>
    apiClient<AdminGeographyResponse>(`/admin/analytics/geography/?days=${days}&scope=${scope}`),
  getAdminAnalyticsGeographyCountry: (countryCode: string, days: AdminAnalyticsRangeDays) =>
    apiClient<AdminGeographyCountryDetail>(
      `/admin/analytics/geography/${encodeURIComponent(countryCode)}/?days=${days}`,
    ),
  getAdminStoryDetailAnalytics: (storySlug: string, days: AdminAnalyticsRangeDays) =>
    apiClient<AdminStoryDetailAnalyticsResponse>(`/admin/analytics/stories/${storySlug}/?days=${days}`),
  getAdminBlogDetailAnalytics: (blogSlug: string, days: AdminAnalyticsRangeDays) =>
    apiClient<AdminBlogDetailAnalyticsResponse>(`/admin/analytics/blog/${blogSlug}/?days=${days}`),
  getAdminQuickReadDetailAnalytics: (storySlug: string, days: AdminAnalyticsRangeDays) =>
    apiClient<AdminQuickReadDetailAnalyticsResponse>(`/admin/analytics/quick-reads/${storySlug}/?days=${days}`),
  exportAdminAnalytics: (
    sections: AdminAnalyticsExportSection[],
    days: AdminAnalyticsRangeDays,
    fileFormat: AdminAnalyticsExportFileFormat,
  ) =>
    fetchAuthenticatedFile(
      `/admin/analytics/export/?sections=${sections.join(",")}&days=${days}&file_format=${fileFormat}`,
      `analytics-export.${fileFormat}`,
    ),
  getAdminAuthors: () => apiClient<AdminAuthor[]>("/admin/authors/"),
  createAdminAuthor: (payload: Partial<AdminAuthor> & { name: string }) =>
    apiClient<AdminAuthor>("/admin/authors/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminAuthor: (id: number, payload: Partial<AdminAuthor> & { name: string }) =>
    apiClient<AdminAuthor>(`/admin/authors/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminAuthor: (id: number) => apiClient<void>(`/admin/authors/${id}/`, { method: "DELETE" }),
  mergeAdminAuthor: (id: number, target: number) =>
    apiClient<{ target: AdminAuthor; moved: Array<{ relation: string; count: number }> }>(
      `/admin/authors/${id}/merge/`,
      {
        method: "POST",
        body: JSON.stringify({ target }),
      },
    ),
  getAdminUsers: (page: number = 1, q: string = "") =>
    apiClient<PaginatedResponse<AdminUser>>(`/admin/users/?page=${page}&search=${encodeURIComponent(q)}`),
  updateAdminUser: (id: string, payload: Partial<{ is_staff: boolean; is_superuser: boolean; is_active: boolean }>) =>
    apiClient<AdminUser>(`/admin/users/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getAdminGenres: () => apiClient<AdminGenre[]>("/admin/genres/"),
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
  deleteAdminGenre: (id: number) => apiClient<void>(`/admin/genres/${id}/`, { method: "DELETE" }),
  getAdminCategories: () => apiClient<AdminCategory[]>("/admin/categories/"),
  createAdminCategory: (name: string) =>
    apiClient<AdminCategory>("/admin/categories/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  getAdminTags: () => apiClient<AdminTag[]>("/admin/tags/"),
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
  deleteAdminTag: (id: number) => apiClient<void>(`/admin/tags/${id}/`, { method: "DELETE" }),
  getAdminJourneys: () => apiClient<AdminJourney[]>("/admin/journeys/"),
  createAdminJourney: (payload: { title: string; description?: string; type?: string }) =>
    apiClient<AdminJourney>("/admin/journeys/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminJourney: (
    id: number,
    payload: Partial<{
      title: string;
      description: string;
      type: string;
      active: boolean;
      order: number;
      cover_image: string;
    }>,
  ) =>
    apiClient<AdminJourney>(`/admin/journeys/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminJourney: (id: number) => apiClient<void>(`/admin/journeys/${id}/`, { method: "DELETE" }),
  // Replaces the whole ordered set; position comes from the order sent, so
  // reordering needs no separate call.
  setAdminJourneyItems: (id: number, items: Array<{ story: number; required: boolean }>) =>
    apiClient<AdminJourneyItem[]>(`/admin/journeys/${id}/items/`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),

  // `preview` only matters for a signed-in superuser: it also returns drafts.
  getPage: (slug: string, preview = false) =>
    apiClient<PublicPageResponse>(`/pages/${encodeURIComponent(slug)}/${preview ? "?preview=1" : ""}`),
  getAdminPages: () => apiClient<AdminPageListItem[]>("/admin/pages/"),
  getAdminPage: (id: number) => apiClient<AdminPage>(`/admin/pages/${id}/`),
  createAdminPage: (payload: { title: string; template: AdminPageInput["template"] }) =>
    apiClient<AdminPage>("/admin/pages/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminPage: (id: number, payload: Partial<AdminPageInput>) =>
    apiClient<AdminPage>(`/admin/pages/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminPage: (id: number) => apiClient<void>(`/admin/pages/${id}/`, { method: "DELETE" }),
  duplicateAdminPage: (id: number) => apiClient<AdminPage>(`/admin/pages/${id}/duplicate/`, { method: "POST" }),
  getSiteSettings: () => apiClient<{ show_publisher_info: boolean }>("/site-settings/"),
  getAdminSiteSettings: () => apiClient<{ show_publisher_info: boolean }>("/admin/site-settings/"),
  updateAdminSiteSettings: (payload: { show_publisher_info: boolean }) =>
    apiClient<{ show_publisher_info: boolean }>("/admin/site-settings/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getLiveSiteThemes: () => apiClient<PublicSiteTheme[]>("/site-themes/live/"),
  getAdminSiteThemes: () => apiClient<AdminSiteTheme[]>("/admin/site-themes/"),
  createAdminSiteTheme: (payload: Partial<SiteThemeInput> & { name: string }) =>
    apiClient<AdminSiteTheme>("/admin/site-themes/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminSiteTheme: (id: number, payload: Partial<SiteThemeInput>) =>
    apiClient<AdminSiteTheme>(`/admin/site-themes/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminSiteTheme: (id: number) => apiClient<void>(`/admin/site-themes/${id}/`, { method: "DELETE" }),
  // Only one site theme is on at a time: activating one switches the rest off.
  activateAdminSiteTheme: (id: number) =>
    apiClient<AdminSiteTheme>(`/admin/site-themes/${id}/activate/`, { method: "POST" }),
  deactivateAdminSiteTheme: (id: number) =>
    apiClient<AdminSiteTheme>(`/admin/site-themes/${id}/deactivate/`, { method: "POST" }),
  duplicateAdminSiteTheme: (id: number) =>
    apiClient<AdminSiteTheme>(`/admin/site-themes/${id}/duplicate/`, { method: "POST" }),
  getAdminPageThemes: () => apiClient<AdminPageTheme[]>("/admin/page-themes/"),
  createAdminPageTheme: (payload: PageThemeValues & { name: string }) =>
    apiClient<AdminPageTheme>("/admin/page-themes/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminPageTheme: (id: number, payload: Partial<PageThemeValues & { name: string }>) =>
    apiClient<AdminPageTheme>(`/admin/page-themes/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminPageTheme: (id: number) => apiClient<void>(`/admin/page-themes/${id}/`, { method: "DELETE" }),
  duplicateAdminPageTheme: (id: number) =>
    apiClient<AdminPageTheme>(`/admin/page-themes/${id}/duplicate/`, { method: "POST" }),

  getAdminHeroTemplates: () => apiClient<AdminHeroTemplate[]>("/admin/hero-templates/"),
  createAdminHeroTemplate: (payload: Partial<AdminHeroTemplateInput>) =>
    apiClient<AdminHeroTemplate>("/admin/hero-templates/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminHeroTemplate: (id: number, payload: Partial<AdminHeroTemplateInput>) =>
    apiClient<AdminHeroTemplate>(`/admin/hero-templates/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminHeroTemplate: (id: number) => apiClient<void>(`/admin/hero-templates/${id}/`, { method: "DELETE" }),
  setDefaultAdminHeroTemplate: (id: number) =>
    apiClient<AdminHeroTemplate>(`/admin/hero-templates/${id}/set-default/`, { method: "POST" }),
  duplicateAdminHeroTemplate: (id: number) =>
    apiClient<AdminHeroTemplate>(`/admin/hero-templates/${id}/duplicate/`, { method: "POST" }),

  getAdminHomeSections: () => apiClient<AdminHomeSection[]>("/admin/home-sections/"),
  getAdminHomeSectionAnalytics: () => apiClient<HomeSectionAnalytics>("/admin/home-sections/analytics/"),
  getAdminMissingCovers: () => apiClient<MissingCoverStories>("/admin/home-sections/missing-covers/"),
  getAdminHomeSectionTypes: () => apiClient<HomeSectionTypesMeta>("/admin/home-sections/types/"),
  getAdminHomeSectionTemplates: () => apiClient<HomeSectionTemplate[]>("/admin/home-sections/templates/"),
  createAdminHomeSectionFromTemplate: (key: string) =>
    apiClient<AdminHomeSection>("/admin/home-sections/from-template/", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
  previewAdminHomeSection: (payload: AdminHomeSectionPreviewPayload) =>
    apiClient<AdminHomeSectionPreviewResponse>("/admin/home-sections/preview/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createAdminHomeSection: (payload: Partial<AdminHomeSectionInput>) =>
    apiClient<AdminHomeSection>("/admin/home-sections/", { method: "POST", body: JSON.stringify(payload) }),
  updateAdminHomeSection: (id: number, payload: Partial<AdminHomeSectionInput>) =>
    apiClient<AdminHomeSection>(`/admin/home-sections/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAdminHomeSection: (id: number) => apiClient<void>(`/admin/home-sections/${id}/`, { method: "DELETE" }),
  toggleAdminHomeSection: (id: number) =>
    apiClient<AdminHomeSection>(`/admin/home-sections/${id}/toggle/`, { method: "POST" }),
  duplicateAdminHomeSection: (id: number) =>
    apiClient<AdminHomeSection>(`/admin/home-sections/${id}/duplicate/`, { method: "POST" }),
  reorderAdminHomeSections: (ids: number[]) =>
    apiClient<AdminHomeSection[]>("/admin/home-sections/reorder/", { method: "POST", body: JSON.stringify({ ids }) }),

  getAdminMoods: () => apiClient<AdminMood[]>("/admin/moods/"),
  createAdminMood: (payload: { name: string; icon?: string; description?: string }) =>
    apiClient<AdminMood>("/admin/moods/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminMood: (
    id: number,
    payload: Partial<{ name: string; icon: string; description: string; active: boolean; order: number }>,
  ) =>
    apiClient<AdminMood>(`/admin/moods/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminMood: (id: number) => apiClient<void>(`/admin/moods/${id}/`, { method: "DELETE" }),
  // Machine suggestions nobody has looked at yet — the queue that makes
  // "allow admin review" a workflow rather than a database column.
  getPendingMoodReviews: () => apiClient<AdminStoryMood[]>("/admin/moods/pending-review/"),
  reviewMoodAssignment: (assignmentId: number, approved: boolean, note?: string) =>
    apiClient<AdminStoryMood | void>(`/admin/moods/assignments/${assignmentId}/review/`, {
      method: "POST",
      body: JSON.stringify({ approved, ...(note ? { note } : {}) }),
    }),
  getStoryMoods: (storyId: number) => apiClient<AdminStoryMood[]>(`/admin/moods/assignments/${storyId}/`),
  setStoryMoods: (storyId: number, moodIds: number[]) =>
    apiClient<AdminStoryMood[]>(`/admin/moods/assignments/${storyId}/`, {
      method: "POST",
      body: JSON.stringify({ moods: moodIds }),
    }),

  getAdminThemes: () => apiClient<AdminTheme[]>("/admin/themes/"),
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
  deleteAdminTheme: (id: number) => apiClient<void>(`/admin/themes/${id}/`, { method: "DELETE" }),
  updateAdminCategory: (id: number, name: string) =>
    apiClient<AdminCategory>(`/admin/categories/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAdminCategory: (id: number) => apiClient<void>(`/admin/categories/${id}/`, { method: "DELETE" }),
  getAdminVideoTypes: () => apiClient<AdminVideoType[]>("/admin/video-types/"),
  createAdminVideoType: (name: string) =>
    apiClient<AdminVideoType>("/admin/video-types/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  getAdminStoryTypes: () => apiClient<StoryType[]>("/admin/story-types/"),
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
  deleteAdminStoryType: (id: number) => apiClient<void>(`/admin/story-types/${id}/`, { method: "DELETE" }),
  createAdminChapter: (payload: { story: number; title: string; slug?: string; content: string; order: number }) =>
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
    }>,
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
    cues: Array<{ order: number; start_ms: number; end_ms: number; text: string }>,
  ) =>
    apiClient<AudioTranscriptImportResult>(`/admin/audios/${id}/transcript-cues/`, {
      method: "PUT",
      body: JSON.stringify({ cues }),
    }),
  getAdminVideos: (storyId: number) => apiClient<PaginatedResponse<AdminVideo>>(`/admin/videos/?story=${storyId}`),
  // Videos admin page: paged, newest first. `hasStory` narrows to videos
  // attached to a story (true) or standalone ones (false).
  listAdminVideos: (page: number = 1, q: string = "", hasStory?: boolean, series?: string) =>
    apiClient<PaginatedResponse<AdminVideo>>(
      `/admin/videos/?page=${page}&search=${encodeURIComponent(q)}` +
        (hasStory === undefined ? "" : `&has_story=${hasStory}`) +
        (series ? `&series=${encodeURIComponent(series)}` : ""),
    ),
  createAdminVideoForm: (formData: FormData) =>
    apiClient<AdminVideo>("/admin/videos/", { method: "POST", body: formData }),
  updateAdminVideoForm: (id: number, formData: FormData) =>
    apiClient<AdminVideo>(`/admin/videos/${id}/`, { method: "PATCH", body: formData }),
  createAdminVideo: (payload: {
    story: number;
    title: string;
    order: number;
    slug?: string;
    youtube_url: string;
    duration_seconds?: string | number | null;
    aspect_ratio: "16:9" | "9:16";
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
      aspect_ratio: "16:9" | "9:16";
    }>,
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
    }>,
  ) =>
    apiClient<AdminSubmission>(`/admin/submissions/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // --- Admin Audiobooks ---
  listAdminAudiobooks: (params: AdminAudiobookListParams = {}) => {
    const qs = new URLSearchParams();
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    if (params.q && params.q.trim()) qs.set("q", params.q.trim());
    if (params.story_link && params.story_link !== "all") qs.set("story_link", params.story_link);
    if (params.series) qs.set("series", params.series);
    if (params.series_filter) qs.set("series_filter", params.series_filter);
    if (params.exclude_series) qs.set("exclude_series", params.exclude_series);
    if (params.status) qs.set("status", params.status);
    if (params.ordering) qs.set("ordering", params.ordering);
    const query = qs.toString();
    return apiClient<PaginatedResponse<AdminAudiobookListItem>>(`/admin/audiobooks/${query ? `?${query}` : ""}`);
  },
  getAdminAudiobook: (id: number) => apiClient<AdminAudiobookDetail>(`/admin/audiobooks/${id}/`),
  createAdminAudiobook: (payload: FormData | Record<string, unknown>) =>
    apiClient<AdminAudiobookDetail>("/admin/audiobooks/", {
      method: "POST",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
  updateAdminAudiobook: (id: number, payload: FormData | Record<string, unknown>) =>
    apiClient<AdminAudiobookDetail>(`/admin/audiobooks/${id}/`, {
      method: "PATCH",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
  deleteAdminAudiobook: (id: number) =>
    apiClient<void>(`/admin/audiobooks/${id}/`, {
      method: "DELETE",
    }),
  getAdminAudiobookStats: () => apiClient<AdminAudiobookStats>("/admin/audiobooks/stats/"),
  searchAdminStoriesForAudiobook: (q: string) =>
    apiClient<AdminStorySearchItem[]>(`/admin/audiobooks/story-search/?q=${encodeURIComponent(q)}`),
  uploadAdminAudiobookTracks: (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    return apiClient<AdminAudiobookUploadTracksResult>(`/admin/audiobooks/${id}/tracks/`, {
      method: "POST",
      body: formData,
    });
  },
  reorderAdminAudiobookTracks: (id: number, ids: number[]) =>
    apiClient<AdminAudiobookTrack[]>(`/admin/audiobooks/${id}/tracks/reorder/`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  updateAdminAudiobookTrack: (
    audiobookId: number,
    trackId: number,
    payload: FormData | { title?: string; order?: number; read_along_offset_ms?: number },
  ) =>
    apiClient<AdminAudiobookTrack>(`/admin/audiobooks/${audiobookId}/tracks/${trackId}/`, {
      method: "PATCH",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
  deleteAdminAudiobookTrack: (audiobookId: number, trackId: number) =>
    apiClient<void>(`/admin/audiobooks/${audiobookId}/tracks/${trackId}/`, {
      method: "DELETE",
    }),
  rereadAdminAudiobookTrackDuration: (audiobookId: number, trackId: number) =>
    apiClient<AdminAudiobookTrack>(`/admin/audiobooks/${audiobookId}/tracks/${trackId}/reread-duration/`, {
      method: "POST",
    }),
  moveAdminAudiobookTrack: (audiobookId: number, trackId: number, targetAudiobookId: number) =>
    apiClient<AdminAudiobookTrack>(`/admin/audiobooks/${audiobookId}/tracks/${trackId}/move/`, {
      method: "POST",
      body: JSON.stringify({ audiobook_id: targetAudiobookId }),
    }),
  listAdminAudiobookSeries: (q?: string) =>
    apiClient<AdminAudiobookSeries[]>(`/admin/audiobook-series/${q ? `?search=${encodeURIComponent(q)}` : ""}`),
  getAdminAudiobookSeries: (id: number) => apiClient<AdminAudiobookSeriesDetail>(`/admin/audiobook-series/${id}/`),
  createAdminAudiobookSeries: (payload: { title: string; slug?: string; description?: string }) =>
    apiClient<AdminAudiobookSeries>("/admin/audiobook-series/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminAudiobookSeries: (id: number, payload: Partial<{ title: string; slug: string; description: string }>) =>
    apiClient<AdminAudiobookSeries>(`/admin/audiobook-series/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminAudiobookSeries: (id: number) =>
    apiClient<void>(`/admin/audiobook-series/${id}/`, {
      method: "DELETE",
    }),
  addAudiobooksToAdminSeries: (seriesId: number, audiobookIds: number[]) =>
    apiClient<{ added: number; skipped: number }>(`/admin/audiobook-series/${seriesId}/add-audiobooks/`, {
      method: "POST",
      body: JSON.stringify({ audiobook_ids: audiobookIds }),
    }),
  removeAudiobooksFromAdminSeries: (seriesId: number, audiobookIds: number[]) =>
    apiClient<{ removed: number }>(`/admin/audiobook-series/${seriesId}/remove-audiobooks/`, {
      method: "POST",
      body: JSON.stringify({ audiobook_ids: audiobookIds }),
    }),
  reorderAdminSeries: (seriesId: number, ids: number[]) =>
    apiClient<AdminAudiobookSeriesDetail>(`/admin/audiobook-series/${seriesId}/reorder/`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  bulkAdminAudiobookSeries: (payload: { ids: number[]; series_ids: number[]; mode: "add" | "remove" }) =>
    apiClient<AdminAudiobookSeriesBulkResult>("/admin/audiobooks/bulk-series/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // --- Public Audiobooks (Phase 3) ---
  getAudiobooks: (params: PublicAudiobookListParams = {}) => {
    const qs = new URLSearchParams();
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    if (params.q && params.q.trim()) qs.set("q", params.q.trim());
    if (params.genre && params.genre !== "all") qs.set("genre", params.genre);
    if (params.language && params.language !== "all") qs.set("language", params.language);
    if (params.series) qs.set("series", params.series);
    if (params.narrator && params.narrator.trim()) qs.set("narrator", params.narrator.trim());
    if (params.has_read_along) qs.set("has_read_along", "true");
    if (params.audio_length && params.audio_length !== "all") qs.set("audio_length", params.audio_length);
    if (params.max_minutes !== undefined) qs.set("max_minutes", String(params.max_minutes));
    if (params.sort) qs.set("sort", params.sort);
    const query = qs.toString();
    return apiClient<PaginatedResponse<PublicAudiobook>>(`/audiobooks/${query ? `?${query}` : ""}`);
  },
  getAudiobooksOverview: () => apiClient<AudiobooksOverviewResponse>("/audiobooks/overview/"),
  getAudiobook: (slug: string) => apiClient<PublicAudiobookDetail>(`/audiobooks/${encodeURIComponent(slug)}/`),
  getAudiobookStatsPublic: () => apiClient<AudiobookStats>("/audiobooks/stats/"),
  getAudiobookProgress: (slug: string) =>
    apiClient<AudioReadingProgress>(`/audio-progress/audiobook/${encodeURIComponent(slug)}/`),
  saveAudiobookProgress: (slug: string, payload: AudiobookProgressPayload) =>
    apiClient<AudioReadingProgress>(`/audio-progress/audiobook/${encodeURIComponent(slug)}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getAudiobookReadAlong: (slug: string, audioSlug: string) =>
    apiClient<ReadAlongPayload>(`/audiobooks/${encodeURIComponent(slug)}/read-along/${encodeURIComponent(audioSlug)}/`),
};
