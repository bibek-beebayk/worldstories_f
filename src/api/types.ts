export interface Pagination {
    count: number;
    page: number;
    pages: number;
    previous: string | null;
    next: string | null;
    size: number;
}

export interface PaginatedResponse<T> {
  pagination: Pagination;
  results: T[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  slug: string;
  download_size_bytes?: number;
}

export interface Audio {
  id: string;
  title: string;
  audio_file: File;
  order: number;
  slug: string;
  download_size_bytes?: number;
  has_transcript: boolean;
  read_along_available: boolean;
  transcript_synchronized: boolean;
}

export interface ReadAlongResponse {
  story: {
    id: number;
    title: string;
    slug: string;
    language: string;
    story_type: string;
    cover_image: string | null;
    author: { id: number; name: string } | null;
  };
  audio: {
    id: number;
    title: string;
    slug: string;
    order: number;
    audio_file: string | null;
    stream_url: string | null;
    duration_seconds: number | null;
    download_size_bytes: number;
    has_transcript: boolean;
    read_along_available: boolean;
    transcript_synchronized: boolean;
  };
  transcript: {
    html: string;
    state: "empty" | "unsynchronized" | "synchronized";
    synchronized: boolean;
    cues: Array<{ id: number; start_seconds: number; end_seconds: number; text: string }>;
    /** Backend-set default highlight offset in seconds; positive delays the highlight. */
    default_offset_seconds: number;
  };
  navigation: {
    previous_audio_slug: string | null;
    next_audio_slug: string | null;
  };
}

export interface Video {
  id: string;
  title: string;
  slug: string;
  youtube_id: string;
  order: number;
  duration_seconds: number | null;
}

export interface Genre{
  id: number;
  name: string;
  slug: string;
  description: string;
  stories_count: number;
}

export interface GenreDetail extends Genre {
  stories: Story[];
}

export interface StoryType {
  id: number;
  name: string;
  stories_count?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  stories_count: number;
}

export interface CategoryDetail extends Category {
  stories: Story[];
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  description: string;
  stories_count: number;
}

export interface TagDetail extends Tag {
  stories: Story[];
}

export interface Theme {
  id: number;
  name: string;
  slug: string;
  description: string;
  stories_count: number;
}

export interface ThemeDetail extends Theme {
  stories: Story[];
}

export interface Story {
  id: number;
  slug: string;
  title: string;
  author?: string | null;
  story_type: string;
  language: string;
  country?: string;
  description: string;
  cover_image: string;
  site_published_date?: string | null;
  rating: number;
  views: number;
  is_completed: boolean;
  is_original?: boolean;
  genres?: string[];
  categories?: string[];
  has_audio?: boolean;
  has_video?: boolean;
  reviews_count?: number;
  is_favorite?: boolean;
  favorites_count?: number;
  // Availability + estimate only, not the full summary text — see
  // StoryListSerializer.get_summary_reading_minutes. Present (non-null) is
  // what gates whether a story is eligible for Quick Read in list views.
  summary_reading_minutes?: number | null;
  // Whole-story reading estimate, matching the detail page's number but read
  // from the denormalized columns so a card list doesn't pay for it — see
  // reading_time.story_reading_minutes_cached. Null when the story's length
  // is genuinely unknown (no chapters and no cached file estimate), which is
  // the signal to omit the label rather than render "0 min read".
  reading_time_minutes?: number | null;
}

export interface StoryListResponse {
    pagination: Pagination;
    results: Story[];
}

export interface LibraryShelf {
  id: number;
  name: string;
  stories_count: number;
  preview_stories: Story[];
}

export interface LibraryShelvesResponse {
  pagination: Pagination;
  results: LibraryShelf[];
  aggregate: {
    total_stories: number;
  };
}


export interface Author{
  id: number;
  name: string;
  bio: string | null;
  image: string | null;
  stories_count: number;
}

export interface AuthorDetail extends Author {
  stories: Story[];
}

export interface ChapterSearchResult {
  story_slug: string;
  story_title: string;
  story_cover_image: string;
  chapter_slug: string;
  chapter_title: string;
  excerpt: string;
}

export interface SearchResponse {
  titles: PaginatedResponse<Story>;
  authors: PaginatedResponse<Author>;
  chapters: PaginatedResponse<ChapterSearchResult>;
}

export interface StoryTranslation {
  id: number;
  slug: string;
  language: string;
  title: string;
}

export interface StoryDetail extends Story {
  is_original: boolean;
  story_type: string;
  about: string;
  summary: string | null;
  retrospective: string | null;
  original_published_year: number | null;
  original_published_month: number | null;
  original_published_day: number | null;
  published_date_label: string | null;
  translations: StoryTranslation[];
  author: Author | null;
  submitted_by: StorySubmittedBy | null;
  genres: Genre[];
  categories: Category[];
  pdf_file: string | null;
  epub_file: string | null;
  pdf_size_bytes?: number;
  epub_size_bytes?: number;
  chapter_count: number;
  chapters: Chapter[];
  tags: Tag[];
  themes: Theme[];
  audios: Audio[];
  videos: Video[];
  reviews_count: number;
  reading_time_minutes: number | null;
  listening_time_minutes: number | null;
  watch_time_minutes: number | null;
  similar_stories: Story[];
}

export interface ReviewUser {
  id: string;
  email: string;
  username: string;
}

export interface StorySubmittedBy {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
}

export interface Review {
  id: number;
  user: ReviewUser;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewListResponse {
  pagination: Pagination;
  results: Review[];
}

export interface ReadingProgress {
  chapter_slug: string | null;
  progress: number;
  overall_progress: number;
  chapter_progresses: Array<{
    chapter_slug: string;
    progress: number;
  }>;
  last_element_id: string | null;
  updated_at: string;
  /**
   * True only on the response to the save that *finished* the story, and only
   * for a signed-in reader. The server decides this on the write itself
   * (apps/stats/completion.py), so a second device, or the same device with
   * its storage cleared, gets `false` — which the old localStorage-keyed
   * mechanism could not do. Use it as the one-shot "just finished now" trigger
   * for the completion screen and, later, first country unlocks.
   */
  story_completed?: boolean;
  /**
   * The ISO country code this completion just added to the reader's Story
   * Passport, or null. Set only on the write that first reached that country,
   * so it is the one-shot cue for the unlock toast. See
   * apps/stats/passport.py::newly_unlocked_country.
   */
  unlocked_country?: string | null;
  /**
   * Achievements earned by *this* write, for a one-shot notification. Awarded
   * server-side by a conditional update, so a re-run or a second device gets
   * an empty list. See apps/stats/achievements.py.
   */
  unlocked_achievements?: EarnedAchievement[];
}

export interface AudioReadingProgress {
  audio_slug: string | null;
  progress: number;
  position_seconds: number;
  duration_seconds: number;
  overall_progress: number;
  audio_progresses: Array<{
    audio_slug: string;
    progress: number;
    position_seconds: number;
    duration_seconds: number;
  }>;
  updated_at: string;
  /**
   * True only on the response to the save that *finished* the story, and only
   * for a signed-in reader. The server decides this on the write itself
   * (apps/stats/completion.py), so a second device, or the same device with
   * its storage cleared, gets `false` — which the old localStorage-keyed
   * mechanism could not do. Use it as the one-shot "just finished now" trigger
   * for the completion screen and, later, first country unlocks.
   */
  story_completed?: boolean;
  /**
   * The ISO country code this completion just added to the reader's Story
   * Passport, or null. Set only on the write that first reached that country,
   * so it is the one-shot cue for the unlock toast. See
   * apps/stats/passport.py::newly_unlocked_country.
   */
  unlocked_country?: string | null;
  /**
   * Achievements earned by *this* write, for a one-shot notification. Awarded
   * server-side by a conditional update, so a re-run or a second device gets
   * an empty list. See apps/stats/achievements.py.
   */
  unlocked_achievements?: EarnedAchievement[];
}

export interface VideoWatchProgress {
  video_slug: string | null;
  progress: number;
  position_seconds: number;
  duration_seconds: number;
  overall_progress: number;
  video_progresses: Array<{
    video_slug: string;
    progress: number;
    position_seconds: number;
    duration_seconds: number;
  }>;
  updated_at: string;
  /**
   * True only on the response to the save that *finished* the story, and only
   * for a signed-in reader. The server decides this on the write itself
   * (apps/stats/completion.py), so a second device, or the same device with
   * its storage cleared, gets `false` — which the old localStorage-keyed
   * mechanism could not do. Use it as the one-shot "just finished now" trigger
   * for the completion screen and, later, first country unlocks.
   */
  story_completed?: boolean;
  /**
   * The ISO country code this completion just added to the reader's Story
   * Passport, or null. Set only on the write that first reached that country,
   * so it is the one-shot cue for the unlock toast. See
   * apps/stats/passport.py::newly_unlocked_country.
   */
  unlocked_country?: string | null;
  /**
   * Achievements earned by *this* write, for a one-shot notification. Awarded
   * server-side by a conditional update, so a re-run or a second device gets
   * an empty list. See apps/stats/achievements.py.
   */
  unlocked_achievements?: EarnedAchievement[];
}

export type FileReadingFormat = "epub" | "pdf";

export interface FileReadingProgress {
  format: FileReadingFormat;
  progress: number;
  position: string | null;
  updated_at: string;
  /**
   * True only on the response to the save that *finished* the story, and only
   * for a signed-in reader. The server decides this on the write itself
   * (apps/stats/completion.py), so a second device, or the same device with
   * its storage cleared, gets `false` — which the old localStorage-keyed
   * mechanism could not do. Use it as the one-shot "just finished now" trigger
   * for the completion screen and, later, first country unlocks.
   */
  story_completed?: boolean;
  /**
   * The ISO country code this completion just added to the reader's Story
   * Passport, or null. Set only on the write that first reached that country,
   * so it is the one-shot cue for the unlock toast. See
   * apps/stats/passport.py::newly_unlocked_country.
   */
  unlocked_country?: string | null;
  /**
   * Achievements earned by *this* write, for a one-shot notification. Awarded
   * server-side by a conditional update, so a re-run or a second device gets
   * an empty list. See apps/stats/achievements.py.
   */
  unlocked_achievements?: EarnedAchievement[];
}

export interface FavoriteStatusResponse {
  is_favorite: boolean;
  favorites_count: number;
}

export interface HomeStats {
  creators: number;
  stories: number;
  readers: number;
}

export interface HomeTabs {
  recommended: Story[];
  popular: Story[];
  new: Story[];
}

export interface HomeSidebar {
  recommended: Story[];
  stats: HomeStats;
}

export interface FeaturedStory extends Story {
  about?: string;
}

/** Admin picker/list row for the Featured Stories screen — not the heavy AdminStory shape. */
export interface AdminFeaturedStory {
  id: number;
  title: string;
  slug: string;
  cover_image: string | null;
  author: string | null;
  is_published: boolean;
  featured_rank: number;
}

export interface DailyStory {
  date: string;
  story: FeaturedStory;
  featured_reason: string;
  configured: boolean;
}

export interface AdminDailyStory {
  date: string;
  story: number;
  story_detail: AdminFeaturedStory;
  featured_reason: string;
  active: boolean;
}

export interface HomeDataResponse {
  featured_stories: FeaturedStory[];
  daily_story: DailyStory | null;
  weekly_spotlight: Story[];
  new_trending: Story[];
  more_to_explore: Story[];
  quick_reads: Story[];
  originals: Story[];
  tabs: HomeTabs;
  sidebar: HomeSidebar;
}

export interface TrendingDataResponse {
  most_viewed: Story[];
  highest_rated: Story[];
  most_favorited: Story[];
  most_discussed: Story[];
}

export interface DiscoverFacet {
  value: string;
  label: string;
  stories_count: number;
}

export interface DiscoverDataResponse extends TrendingDataResponse {
  genres: Genre[];
  categories: Category[];
  story_types: StoryType[];
  languages: DiscoverFacet[];
  new_releases: Story[];
  hidden_gems: Story[];
}

export interface StoryMapCountry {
  code: string;
  name: string;
  stories_count: number;
}

export interface StoryMapResponse {
  countries: StoryMapCountry[];
  total_stories: number;
  countries_count: number;
  max_stories_count: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  is_superuser: boolean;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  date_joined: string;
  favorites_count: number;
  reviews_count: number;
  reading_in_progress_count: number;
  listening_in_progress_count: number;
  watching_in_progress_count: number;
  preferred_genres: Genre[];
}

export interface ProfileInsightsResponse {
  summary: {
    titles_started: number;
    /** From the durable StoryCompletion record, not inferred from progress. */
    titles_completed: number;
    active_days_30: number;
    favorite_genre: string | null;
    /**
     * Measured from actual reading/listening/watching session durations, not
     * summed from the stories' estimated lengths — a reader who abandoned a
     * long book on page two has not read it. See §4.4.
     */
    total_reading_minutes: number;
    /** Distinct countries of finished stories. The Story Passport
     *  (Milestone 5) builds its page around this same fact. */
    countries_explored: number;
  };
  activity: Array<{
    date: string;
    reading: number;
    listening: number;
    watching: number;
  }>;
  formats: Array<{
    name: string;
    value: number;
  }>;
  genres: Array<{
    name: string;
    value: number;
  }>;
}

export interface ReadingStreakResponse {
  current_streak: number;
  longest_streak: number;
  /** Streak achievements earned by this check — a streak grows because a day
   *  passed, so this is the only place that measure can change. */
  unlocked_achievements?: EarnedAchievement[];
}

export interface ContinueReadingItem {
  story: Story;
  chapter_slug: string | null;
  chapter_title: string | null;
  chapter_progress: number;
  overall_progress: number;
  updated_at: string;
  excerpt: string;
  // Null when the story has no length estimate at all — omit the label
  // rather than claim "~0 min remaining".
  remaining_minutes: number | null;
}

export interface ContinueListeningItem {
  story: Story;
  audio_slug: string | null;
  audio_title: string | null;
  audio_progress: number;
  overall_progress: number;
  updated_at: string;
  // Null when the story has no length estimate at all — omit the label
  // rather than claim "~0 min remaining".
  remaining_minutes: number | null;
}

export interface ContinueWatchingItem {
  story: Story;
  video_slug: string | null;
  video_title: string | null;
  video_progress: number;
  overall_progress: number;
  updated_at: string;
  // Null when the story has no length estimate at all — omit the label
  // rather than claim "~0 min remaining".
  remaining_minutes: number | null;
}

export interface FavoriteItem {
  id: number;
  story: Story;
  created_at: string;
}

export interface MyReviewItem {
  id: number;
  story: Story;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: number;
  title: string;
  about: string;
  content: string;
  story_type: string;
  language: string;
  genres: number[] | Genre[];
  cover_image: string | null;
  cover_image_file?: string | null;
  notes: string | null;
  pdf_file: string | null;
  epub_file?: string | null;
  status: "pending" | "requires_edit" | "approved" | "rejected";
  published_story?: number | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

export type AiGenerationStatus = "pending" | "processing" | "completed" | "failed";
export type AiGenerationSource = "metadata" | "content";
export type AiGenerationInputField = "title" | "author" | "content";

export interface AdminStory {
  id: number;
  title: string;
  slug: string;
  about: string | null;
  summary: string | null;
  summary_status: AiGenerationStatus | null;
  summary_source: AiGenerationSource | null;
  summary_confident: boolean | null;
  summary_confidence_note: string | null;
  summary_error: string | null;
  retrospective: string | null;
  retrospective_status: AiGenerationStatus | null;
  retrospective_source: AiGenerationSource | null;
  retrospective_confident: boolean | null;
  retrospective_confidence_note: string | null;
  retrospective_error: string | null;
  story_type: number;
  language: string;
  country: string;
  translations: StoryTranslation[];
  author: number | null;
  submitted_by: StorySubmittedBy | null;
  original_published_year: number | null;
  original_published_month: number | null;
  original_published_day: number | null;
  published_date_label: string | null;
  site_published_date: string | null;
  cover_image: string | null;
  cover_image_file: string | null;
  cover_image_url: string;
  pdf_file: string | null;
  pdf_file_url: string | null;
  epub_file: string | null;
  epub_file_url: string | null;
  is_completed: boolean;
  is_original: boolean;
  is_published: boolean;
  publish_at: string | null;
  genres: number[];
  categories: number[];
  tags: number[];
  themes: number[];
  rating: number;
  views: number;
  source: "admin" | "submission";
  chapter_count: number;
  audio_count: number;
  video_count: number;
}

export type AiGenerationModel = "claude-opus-5" | "claude-sonnet-5" | "claude-haiku-4-5";

export interface PromptSettings {
  summary_instructions: string;
  summary_model: AiGenerationModel;
  retrospective_instructions: string;
  retrospective_model: AiGenerationModel;
  excerpt_instructions: string;
  excerpt_model: AiGenerationModel;
  book_fetch_instructions: string;
  book_fetch_model: AiGenerationModel;
}

export interface AdminAuthor {
  id: number;
  name: string;
  bio?: string | null;
  image?: string | null;
  stories_count?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  date_joined: string;
  last_login: string | null;
  login_count: number;
  otp_verified: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  favorites_count: number;
  reviews_count: number;
  submissions_count: number;
}

export interface AdminGenre {
  id: number;
  name: string;
  slug: string;
  stories_count?: number;
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  stories_count?: number;
}

export interface AdminTag {
  id: number;
  name: string;
  slug: string;
  stories_count?: number;
}

export interface AdminTheme {
  id: number;
  name: string;
  slug: string;
  stories_count?: number;
}

export interface AdminChapter {
  id: number;
  story: number;
  title: string;
  slug: string;
  content: string;
  order: number;
}

export type BookFetchJobStatus = "pending" | "processing" | "completed" | "failed";

export interface BookFetchJob {
  id: number;
  requested_count: number;
  created_count: number;
  skipped_count: number;
  status: BookFetchJobStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type EpubImportJobStatus = "pending" | "processing" | "completed" | "failed";

export interface EpubImportJob {
  id: number;
  story: number;
  status: EpubImportJobStatus;
  error_message: string | null;
  chapters_created: number;
  created_at: string;
  updated_at: string;
}

export interface AdminAudio {
  id: number;
  story: number;
  title: string;
  slug: string;
  audio_file: string | null;
  transcript: string;
  transcript_synchronized: boolean;
  cue_count: number;
  order: number;
  read_along_offset_ms: number;
}

export type AudioTranscriptState = "empty" | "unsynchronized" | "synchronized";

export interface AdminAudioTranscriptCue {
  id: number;
  order: number;
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface AudioTranscriptImportResult {
  transcript_state: AudioTranscriptState;
  cue_count: number;
  transcript: string;
}

export interface AudioTranscriptCuesResponse {
  cues: AdminAudioTranscriptCue[];
  cue_count: number;
  transcript_state: AudioTranscriptState;
}

export interface AdminVideo {
  id: number;
  story: number;
  title: string;
  slug: string;
  youtube_url: string;
  youtube_id: string;
  order: number;
  duration_seconds: number | null;
}

export interface AdminSubmission {
  id: number;
  user: string;
  user_email: string;
  title: string;
  about: string;
  content: string;
  story_type: string;
  language: string;
  genres: Genre[];
  cover_image: string | null;
  cover_image_url: string | null;
  notes: string | null;
  pdf_file: string | null;
  pdf_file_url: string | null;
  epub_file: string | null;
  epub_file_url: string | null;
  status: "pending" | "requires_edit" | "approved" | "rejected";
  reviewer_notes: string | null;
  published_story: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminOverviewSummary {
  stories: number;
  chapters: number;
  audios: number;
  videos: number;
  users: number;
  submissions_pending: number;
  submissions_approved: number;
  submissions_rejected: number;
  reviews: number;
  favorites: number;
  total_story_views: number;
  active_readers: number;
  active_listeners: number;
  active_watchers: number;
}

export interface AdminMostReadStory {
  id: number;
  title: string;
  slug: string;
  cover_image: string | null;
  readers_count: number;
  views: number;
  rating: number;
}

export interface AdminMostListenedAudio {
  id: number;
  title: string;
  slug: string;
  story_id: number;
  story_title: string;
  story_slug: string;
  listeners_count: number;
  avg_progress: number;
}

export interface AdminMostWatchedVideo {
  id: number;
  title: string;
  slug: string;
  story_id: number;
  story_title: string;
  story_slug: string;
  watchers_count: number;
  avg_progress: number;
}

export interface AdminTopFavoritedStory {
  id: number;
  title: string;
  slug: string;
  favorites_count: number;
}

export interface AdminTopRatedStory {
  id: number;
  title: string;
  slug: string;
  rating: number;
  views: number;
}

export interface AdminOverviewResponse {
  summary: AdminOverviewSummary;
  most_read_stories: AdminMostReadStory[];
  most_listened_audios: AdminMostListenedAudio[];
  most_watched_videos: AdminMostWatchedVideo[];
  top_favorited_stories: AdminTopFavoritedStory[];
  top_rated_stories: AdminTopRatedStory[];
}

export type AdminAnalyticsRangeDays = 1 | 7 | 30 | 90 | 365;
export type AdminAnalyticsExportSection =
  | "content"
  | "engagement"
  | "audience"
  | "users"
  | "geography"
  | "submissions";
export type AdminAnalyticsExportFileFormat = "csv" | "xlsx";

export interface AdminAnalyticsDayCount {
  day: string;
  count: number;
}

export type AdminAnalyticsTimeInterval = "hour" | "day" | "week" | "month";

export interface AdminAnalyticsGenrePerformance {
  id: number;
  name: string;
  stories_count: number;
  avg_rating: number;
  total_views: number;
  total_favorites: number;
}

export interface AdminAnalyticsStoryTypeBreakdown {
  story_type: string;
  count: number;
  avg_rating: number;
  avg_views: number;
}

export interface AdminAnalyticsCompletionSplit {
  is_completed: boolean;
  count: number;
  avg_rating: number;
  avg_views: number;
}

export interface AdminAnalyticsContentResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  publishing_interval: AdminAnalyticsTimeInterval;
  views_over_time: AdminAnalyticsDayCount[];
  genre_performance: AdminAnalyticsGenrePerformance[];
  story_type_breakdown: AdminAnalyticsStoryTypeBreakdown[];
  completion_split: AdminAnalyticsCompletionSplit[];
  publishing_over_time: AdminAnalyticsDayCount[];
  blog_publishing_over_time: AdminAnalyticsDayCount[];
  blog_posts_count: number;
  stories_count: number;
  audiobooks_count: number;
  watchable_count: number;
  quick_read_count: number;
  top_stories: AdminContentPerformanceRow[];
  top_audiobooks: AdminContentPerformanceRow[];
  top_blogs: AdminContentPerformanceRow[];
}

export type AdminContentPerformanceSort =
  | "performance_score"
  | "views"
  | "reads"
  | "unique_readers"
  | "listens"
  | "unique_listeners"
  | "reading_minutes"
  | "listening_minutes"
  | "engagement_minutes"
  | "interactions"
  | "completions";

export interface AdminContentPerformanceRow {
  id: number;
  title: string;
  slug: string;
  content_type: "story" | "audiobook" | "blog";
  views: number;
  reads: number;
  unique_readers: number;
  listens: number;
  unique_listeners: number;
  reading_minutes: number;
  listening_minutes: number;
  watching_minutes: number;
  engagement_minutes: number;
  interactions: number;
  completions: number;
  downloads: number;
  favorites: number;
  reviews: number;
  performance_score: number;
}

export interface AdminContentPerformanceResponse {
  range_days: AdminAnalyticsRangeDays;
  content_type: "story" | "audiobook" | "blog";
  sort: AdminContentPerformanceSort;
  count: number;
  page: number;
  page_size: number;
  results: AdminContentPerformanceRow[];
}

export interface AdminAnalyticsProgressBucket {
  bucket: string;
  count: number;
}

export interface AdminAnalyticsChapterDropoff {
  chapter_order: number;
  avg_progress: number;
  readers: number;
}

export interface AdminAnalyticsRatingCount {
  rating: number;
  count: number;
}

export interface AdminAnalyticsRatingTrendPoint {
  day: string;
  // null for a bucket with no reviews — an average has no zero, so the chart
  // draws a break there rather than a dip to the axis.
  avg_rating: number | null;
  count: number;
}

export interface AdminAnalyticsEngagementResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  reading_progress_buckets: AdminAnalyticsProgressBucket[];
  chapter_dropoff: AdminAnalyticsChapterDropoff[];
  audio_listen_through: { avg_progress: number; listeners: number };
  video_watch_through: { avg_progress: number; watchers: number };
  favorites_over_time: AdminAnalyticsDayCount[];
  rating_distribution: AdminAnalyticsRatingCount[];
  rating_trend: AdminAnalyticsRatingTrendPoint[];
  view_to_read_conversion: { views: number; readers: number; conversion_rate: number };
}

export interface AdminAnalyticsLoginBucket {
  bucket: string;
  count: number;
}

export interface AdminAnalyticsUsersResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  signups_over_time: AdminAnalyticsDayCount[];
  total_users: number;
  active_users: number;
  login_frequency_buckets: AdminAnalyticsLoginBucket[];
  otp_conversion: { joined: number; verified: number; rate: number };
}

export interface AdminAnalyticsSubmissionsOverTimePoint {
  day: string;
  status: string;
  count: number;
}

export interface AdminAnalyticsFunnelRow {
  status: string;
  count: number;
  percent: number;
}

export interface AdminAnalyticsStoryTypeCount {
  story_type: string;
  count: number;
}

export interface AdminAnalyticsGenreCount {
  id: number;
  name: string;
  count: number;
}

export interface AdminAnalyticsSubmissionsResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  submissions_over_time: AdminAnalyticsSubmissionsOverTimePoint[];
  funnel: AdminAnalyticsFunnelRow[];
  avg_time_to_review_hours: number;
  by_story_type: AdminAnalyticsStoryTypeCount[];
  by_genre: AdminAnalyticsGenreCount[];
}

export interface AdminAnalyticsAudienceResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  summary: {
    visitors: number;
    returning_visitors: number;
    returning_rate: number;
    readers: number;
    returning_readers: number;
    reader_retention_rate: number;
    ad_impressions: number;
    downloads: number;
    unique_downloaders: number;
    completions: number;
    completion_rate: number;
    reading_minutes: number;
    listening_minutes: number;
    watching_minutes: number;
    blog_reading_minutes: number;
    quick_read_reading_minutes: number;
    read_along_listening_minutes: number;
    read_along_sessions: number;
    avg_session_minutes: number;
    total_page_views: number;
    median_browsing_session_minutes: number;
  };
  daily_activity: Array<{
    day: string;
    ad_impressions: number;
    downloads: number;
    completions: number;
    reading_minutes: number;
    listening_minutes: number;
    watching_minutes: number;
    read_along_minutes: number;
  }>;
  visitor_retention: Array<{
    day: string;
    new_visitors: number;
    returning_visitors: number;
  }>;
  ad_placements: Array<{ path: string; size: string; count: number }>;
  ad_impressions_by_content_type: Array<{ content_type: string; count: number }>;
  referral_sources: Array<{ referral_source: string; count: number }>;
  download_types: Array<{ content_type: string; count: number; bytes: number }>;
  completion_types: Array<{ content_type: string; count: number }>;
  top_downloads: Array<{
    story_id: number;
    title: string;
    slug: string;
    count: number;
    bytes: number;
  }>;
  top_listened: Array<{
    story_id: number;
    title: string;
    slug: string;
    sessions: number;
    minutes: number;
  }>;
  top_watched: Array<{
    story_id: number;
    title: string;
    slug: string;
    sessions: number;
    minutes: number;
  }>;
  top_blogs_read: Array<{
    blog_id: number;
    title: string;
    slug: string;
    sessions: number;
    minutes: number;
  }>;
  top_read_along: Array<{
    story_id: number;
    title: string;
    slug: string;
    sessions: number;
    minutes: number;
  }>;
  top_pages: Array<{ path: string; views: number; unique_visitors: number }>;
}

export interface AdminAnalyticsCountryRow {
  country: string;
  country_code: string;
  logins: number;
  users: number;
}

export interface AdminAnalyticsGeographyResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  total_logins: number;
  unresolved_logins: number;
  countries_reached: number;
  by_country: AdminAnalyticsCountryRow[];
  by_city: Array<{ city: string; country: string; logins: number; users: number }>;
  logins_over_time: Array<{ day: string; count: number; users: number }>;
}

export interface AdminStoryDetailAnalyticsResponse {
  range_days: AdminAnalyticsRangeDays;
  story: { id: number; title: string; slug: string };
  time_series: AdminTitleAnalyticsTimeSeries;
  page_opens: number;
  started_reading: number;
  completed_reading: number;
  avg_progress: number;
  reading_minutes: number;
  completions_tracked: number;
  favorites_count: number;
  reviews_count: number;
  avg_rating_in_range: number;
  chapter_breakdown: Array<{
    chapter_order: number;
    chapter_title: string;
    chapter_slug: string;
    readers: number;
    avg_progress: number;
    completed: number;
  }>;
  has_audio: boolean;
  audio: {
    listeners: number;
    avg_progress: number;
    listening_minutes: number;
    read_along_listening_minutes: number;
  } | null;
  has_video: boolean;
  video: { watchers: number; avg_progress: number; watching_minutes: number } | null;
}

export interface AdminBlogDetailAnalyticsResponse {
  range_days: AdminAnalyticsRangeDays;
  blog: { id: number; title: string; slug: string };
  time_series: AdminTitleAnalyticsTimeSeries;
  page_opens: number;
  started_reading: number;
  reading_minutes: number;
  signed_in_readers_with_depth_tracked: number;
  avg_progress_signed_in: number;
  completed_signed_in: number;
  progress_distribution_signed_in: Array<{ bucket: string; count: number }>;
}

export interface AdminTitleAnalyticsTimeSeries {
  interval: "hour" | "day";
  points: Array<{
    period: string;
    views: number;
    reads: number;
    reading_minutes: number;
    interactions: number;
  }>;
}

export interface BlogReadingProgress {
  progress: number;
  updated_at: string;
}

export interface BlogLinkedStory {
  id: number;
  slug: string;
  title: string;
  cover_image: string;
  author: string | null;
  story_type: string;
  language: string;
}

export interface BlogLinkedBlog {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string;
  author_name: string | null;
  published_at: string;
}

export interface Blog {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string;
  author_name: string | null;
  linked_stories?: BlogLinkedStory[];
  linked_blogs?: BlogLinkedBlog[];
  /** Temporary compatibility with API responses from before linked_stories became many-to-many. */
  linked_story?: BlogLinkedStory | null;
  published_at: string;
  updated_at: string;
}

export interface AdminBlog {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  excerpt_status: AiGenerationStatus | null;
  excerpt_source: AiGenerationSource | null;
  excerpt_confident: boolean | null;
  excerpt_confidence_note: string | null;
  excerpt_error: string | null;
  content: string;
  cover_image_file: string | null;
  cover_image_url: string;
  author_name: string | null;
  linked_stories?: number[];
  linked_story_details?: { id: number; title: string; slug: string }[];
  linked_blogs?: number[];
  linked_blog_details?: { id: number; title: string; slug: string }[];
  /** Temporary compatibility with API responses from before linked_stories became many-to-many. */
  linked_story?: number | null;
  linked_story_detail?: { id: number; title: string; slug: string } | null;
  is_published: boolean;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryQueueItem {
  id: number;
  title: string;
  author_name: string;
  about: string | null;
  content: string;
  notes: string;
  story_type: number | null;
  country: string;
  language: string;
  genres: number[];
  categories: number[];
  tags: number[];
  themes: number[];
  original_published_year: number | null;
  original_published_month: number | null;
  original_published_day: number | null;
  published_date_label: string | null;
  epub_link: string;
  pdf_link: string;
  cover_image_link: string;
  is_added: boolean;
  added_story: number | null;
  created_at: string;
}

export interface StoryQueueTitleMatch {
  id: number;
  title: string;
}

export interface StoryQueueTitleStoryMatch extends StoryQueueTitleMatch {
  slug: string;
  is_published: boolean;
}

export interface StoryQueueTitleQueueMatch extends StoryQueueTitleMatch {
  author_name: string;
}

export interface StoryQueueTitleCheck {
  story_matches: StoryQueueTitleStoryMatch[];
  queue_matches: StoryQueueTitleQueueMatch[];
}

export interface StoryQueueItemPayload {
  title: string;
  author_name: string;
  about?: string;
  content?: string;
  notes?: string;
  story_type?: number | null;
  country?: string;
  language?: string;
  genres?: number[];
  categories?: number[];
  tags?: number[];
  themes?: number[];
  original_published_year?: number | null;
  original_published_month?: number | null;
  original_published_day?: number | null;
  epub_link?: string;
  pdf_link?: string;
  cover_image_link?: string;
}

export type StoryQueueImportDuplicateReason =
  | "already_a_story"
  | "already_in_queue"
  | "duplicate_in_file"
  | "missing_title";

export interface StoryQueueImportRecord {
  title: string;
  author_name: string;
  about: string;
  story_type: string;
  country: string;
  language: string;
  genres: string[];
  categories: string[];
  tags: string[];
  themes: string[];
  original_published_year: number | null;
  original_published_month: number | null;
  original_published_day: number | null;
  published_date_label: string | null;
  epub_link: string;
  pdf_link: string;
  cover_image_link: string;
}

export interface StoryQueueImportDuplicate extends StoryQueueImportRecord {
  reason: StoryQueueImportDuplicateReason;
}

export interface StoryQueueImportPreview {
  to_add: StoryQueueImportRecord[];
  duplicates: StoryQueueImportDuplicate[];
  errors: string[];
  to_add_count: number;
  duplicate_count: number;
  error_count: number;
  total_rows: number;
}

// Bulk-edits tags/themes/genres/categories on already-published Story rows
// (matched by title, disambiguated by author_name) — distinct from the
// Story Queue import above, which creates new StoryQueue rows instead of
// editing existing Story rows. Field names here match
// apps/story/taxonomy_bulk_update.py's actual response exactly (flat,
// prefixed per field — not nested) rather than a generic wrapper shape.
export type TaxonomyMatchStatus = "matched" | "ambiguous" | "not_found";

export interface TaxonomyImportCandidate {
  id: number;
  slug: string;
  title: string;
  author_name: string;
}

// Normalized per-field view — the wire format is the flat, prefixed keys
// on TaxonomyImportRow below (current_tags, proposed_tags, tags_added,
// tags_removed, ...); this is what a UI helper plucks those into so
// tags/themes/genres can share one rendering function instead of three
// near-identical ones.
export interface TaxonomyFieldDiff {
  current: string[];
  proposed: string[] | null;
  added: string[];
  removed: string[];
}

export interface TaxonomyImportRow {
  title: string;
  author_name: string;
  match_status: TaxonomyMatchStatus;
  story_id: number | null;
  story_slug: string | null;
  ambiguous_candidates: TaxonomyImportCandidate[];

  current_tags: string[];
  proposed_tags: string[] | null;
  tags_added: string[];
  tags_removed: string[];
  new_tags_to_create: string[];

  current_themes: string[];
  proposed_themes: string[] | null;
  themes_added: string[];
  themes_removed: string[];
  new_themes_to_create: string[];

  current_genres: string[];
  proposed_genres: string[] | null;
  genres_added: string[];
  genres_removed: string[];
  new_genres_to_create: string[];

  // Categories' variant carries new_categories_not_created (they're NEVER
  // created, unlike tags/themes/genres' new_X_to_create) plus two
  // category-specific business-rule flags instead of a create list.
  current_categories: string[];
  proposed_categories: string[] | null;
  categories_added: string[];
  categories_removed: string[];
  new_categories_not_created: string[];
  category_count_warning: string | null;
  category_forbidden_value: string | null;
}

export interface TaxonomyImportPreview {
  rows: TaxonomyImportRow[];
  matched_count: number;
  ambiguous_count: number;
  not_found_count: number;
  errors: string[];
  total_rows: number;
}


export interface StoryCompletionSection {
  key: "more_like_this" | "more_from_country" | "similar_length";
  title: string;
  stories: Story[];
}

export interface StoryCompletionResponse {
  story_slug: string;
  story_title: string;
  /** ISO 3166-1 alpha-2, or null when the story has no country of origin. */
  country: string | null;
  country_name: string | null;
  /**
   * The single "read next" pick. Null when there is genuinely nothing to
   * suggest — a small catalogue, or a reader who has already engaged with
   * everything similar. Render the screen without it rather than padding.
   */
  primary: Story | null;
  /** Only non-empty sections are returned. */
  sections: StoryCompletionSection[];
}


export interface ReadingHistoryItem {
  story: Story;
  last_read_at: string;
  /** The furthest any surface of this story reached, 0–1. */
  progress: number;
  /** From the completion record — a story can be complete while no single
   *  surface reads 100%, e.g. finished as an audiobook. */
  completed: boolean;
}

export interface ReadingHistoryResponse {
  pagination: Pagination;
  results: ReadingHistoryItem[];
}


export interface PassportCountry {
  code: string;
  name: string;
  stories_available: number;
  stories_completed: number;
  explored: boolean;
  /** When the reader first completed a story from here; null if never. */
  unlocked_at: string | null;
}

export interface StoryPassportResponse {
  countries_explored: number;
  /** Countries that actually have published stories — not the 196-entry ISO
   *  list, which would measure the reader against a catalogue that does not
   *  exist. */
  countries_available: number;
  stories_completed: number;
  countries: PassportCountry[];
}

export interface PassportCountryDetail {
  code: string;
  name: string;
  explored: boolean;
  stories_available: number;
  stories_completed: number;
  completed: Story[];
  continue_exploring: Story[];
}


export interface EarnedAchievement {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface AchievementProgress extends EarnedAchievement {
  target_value: number;
  /** Capped at target_value by the API, so a bar can use it directly. */
  progress: number;
  completed: boolean;
  completed_at: string | null;
}

export interface AchievementsResponse {
  earned: number;
  total: number;
  results: AchievementProgress[];
}


export interface Mood {
  id: number;
  slug: string;
  name: string;
  icon: string;
  description: string;
  /** Counts only assignments readers may see, so a mood offered here always
   *  has stories behind it. */
  stories_count: number;
}

export interface MoodListResponse {
  moods: Mood[];
}

export interface SurpriseResponse {
  /** Null when nothing matches — notably when a time budget cannot be met,
   *  which is answered honestly rather than with something longer. */
  story: Story | null;
}


export interface AdminMood {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  active: boolean;
  order: number;
  /** Assignments readers can actually see — matches the public mood list, so
   *  the two surfaces can never appear to disagree. */
  stories_count: number;
  /** AI suggestions waiting on a person. */
  pending_review_count: number;
}

export interface AdminStoryMood {
  id: number;
  story: number;
  story_title: string;
  story_slug: string;
  mood: number;
  mood_name: string;
  mood_slug: string;
  mood_icon: string;
  source: "admin" | "ai";
  reviewed: boolean;
  note: string;
  /** False for an unreviewed AI suggestion — stored, but never shown to
   *  readers. See StoryMood.is_public. */
  is_public: boolean;
  created_at: string;
}
