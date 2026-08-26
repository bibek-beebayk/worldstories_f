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
}

export interface Genre{
  id: number;
  name: string;
  stories_count: number;
}

export interface StoryType {
  id: number;
  name: string;
  stories_count?: number;
}

export interface Category {
  id: number;
  name: string;
  stories_count: number;
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

export interface Story {
  id: number;
  slug: string;
  title: string;
  author?: string | null;
  story_type: string;
  language: string;
  description: string;
  cover_image: string;
  site_published_date?: string | null;
  rating: number;
  views: number;
  is_completed: boolean;
  genres?: string[];
  categories?: string[];
  has_audio?: boolean;
  reviews_count?: number;
  is_favorite?: boolean;
  favorites_count?: number;
  // Availability + estimate only, not the full summary text — see
  // StoryListSerializer.get_summary_reading_minutes. Present (non-null) is
  // what gates whether a story is eligible for Quick Read in list views.
  summary_reading_minutes?: number | null;
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
  tags: string[];
  audios: Audio[];
  reviews_count: number;
  reading_time_minutes: number | null;
  listening_time_minutes: number | null;
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
}

export type FileReadingFormat = "epub" | "pdf";

export interface FileReadingProgress {
  format: FileReadingFormat;
  progress: number;
  position: string | null;
  updated_at: string;
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

export interface HomeDataResponse {
  featured_stories: FeaturedStory[];
  weekly_spotlight: Story[];
  new_trending: Story[];
  more_to_explore: Story[];
  quick_reads: Story[];
  tabs: HomeTabs;
  sidebar: HomeSidebar;
}

export interface TrendingDataResponse {
  most_viewed: Story[];
  highest_rated: Story[];
  most_favorited: Story[];
  most_discussed: Story[];
}

export interface OriginalsDataResponse {
  stories: Story[];
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
  preferred_genres: Genre[];
}

export interface ProfileInsightsResponse {
  summary: {
    titles_started: number;
    titles_completed: number;
    active_days_30: number;
    favorite_genre: string | null;
  };
  activity: Array<{
    date: string;
    reading: number;
    listening: number;
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
}

export interface ContinueReadingItem {
  story: Story;
  chapter_slug: string | null;
  chapter_title: string | null;
  chapter_progress: number;
  overall_progress: number;
  updated_at: string;
  excerpt: string;
}

export interface ContinueListeningItem {
  story: Story;
  audio_slug: string | null;
  audio_title: string | null;
  audio_progress: number;
  overall_progress: number;
  updated_at: string;
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
  is_published: boolean;
  publish_at: string | null;
  genres: number[];
  categories: number[];
  tags: number[];
  rating: number;
  views: number;
  source: "admin" | "submission";
  chapter_count: number;
  audio_count: number;
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
}

export interface AdminCategory {
  id: number;
  name: string;
  stories_count?: number;
}

export interface AdminTag {
  id: number;
  name: string;
  slug: string;
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
  order: number;
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
  users: number;
  submissions_pending: number;
  submissions_approved: number;
  submissions_rejected: number;
  reviews: number;
  favorites: number;
  total_story_views: number;
  active_readers: number;
  active_listeners: number;
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
  top_favorited_stories: AdminTopFavoritedStory[];
  top_rated_stories: AdminTopRatedStory[];
}

export type AdminAnalyticsRangeDays = 7 | 30 | 90 | 365;
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
  views_over_time: AdminAnalyticsDayCount[];
  genre_performance: AdminAnalyticsGenrePerformance[];
  story_type_breakdown: AdminAnalyticsStoryTypeBreakdown[];
  completion_split: AdminAnalyticsCompletionSplit[];
  publishing_over_time: AdminAnalyticsDayCount[];
  blog_publishing_over_time: AdminAnalyticsDayCount[];
  blog_posts_count: number;
  stories_count: number;
  audiobooks_count: number;
  quick_read_count: number;
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
  avg_rating: number;
  count: number;
}

export interface AdminAnalyticsEngagementResponse {
  range_days: AdminAnalyticsRangeDays;
  reading_progress_buckets: AdminAnalyticsProgressBucket[];
  chapter_dropoff: AdminAnalyticsChapterDropoff[];
  audio_listen_through: { avg_progress: number; listeners: number };
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
  submissions_over_time: AdminAnalyticsSubmissionsOverTimePoint[];
  funnel: AdminAnalyticsFunnelRow[];
  avg_time_to_review_hours: number;
  by_story_type: AdminAnalyticsStoryTypeCount[];
  by_genre: AdminAnalyticsGenreCount[];
}

export interface AdminAnalyticsAudienceResponse {
  range_days: AdminAnalyticsRangeDays;
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
    blog_reading_minutes: number;
    quick_read_reading_minutes: number;
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
  top_blogs_read: Array<{
    blog_id: number;
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
  audio: { listeners: number; avg_progress: number; listening_minutes: number } | null;
}

export interface AdminBlogDetailAnalyticsResponse {
  range_days: AdminAnalyticsRangeDays;
  blog: { id: number; title: string; slug: string };
  page_opens: number;
  started_reading: number;
  reading_minutes: number;
  signed_in_readers_with_depth_tracked: number;
  avg_progress_signed_in: number;
  completed_signed_in: number;
  progress_distribution_signed_in: Array<{ bucket: string; count: number }>;
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
}

export interface Blog {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string;
  author_name: string | null;
  linked_story: BlogLinkedStory | null;
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
  linked_story: number | null;
  linked_story_detail: { id: number; title: string; slug: string } | null;
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
