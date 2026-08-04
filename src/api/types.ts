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

export interface Story {
  id: number;
  slug: string;
  title: string;
  // author: string;
  story_type: string;
  language: string;
  description: string;
  cover_image: string;
  site_published_date?: string | null;
  rating: number;
  views: number;
  is_completed: boolean;
  genres?: string[];
  has_audio?: boolean;
  reviews_count?: number;
  is_favorite?: boolean;
  favorites_count?: number;
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

export interface SearchResponse {
  titles: PaginatedResponse<Story>;
  authors: PaginatedResponse<Author>;
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
  original_published_year: number | null;
  original_published_month: number | null;
  original_published_day: number | null;
  published_date_label: string | null;
  translations: StoryTranslation[];
  author: Author | null;
  submitted_by: StorySubmittedBy | null;
  genres: Genre[];
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

export interface DiscoverDataResponse {
  genres: Genre[];
  new_releases: Story[];
  hidden_gems: Story[];
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

export interface ContinueReadingItem {
  story: Story;
  chapter_slug: string | null;
  chapter_title: string | null;
  chapter_progress: number;
  overall_progress: number;
  updated_at: string;
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

export interface AdminStory {
  id: number;
  title: string;
  slug: string;
  about: string | null;
  story_type: string;
  language: string;
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
  tags: number[];
  rating: number;
  views: number;
  source: "admin" | "submission";
}

export interface AdminAuthor {
  id: number;
  name: string;
  bio?: string | null;
  image?: string | null;
}

export interface AdminGenre {
  id: number;
  name: string;
}

export interface AdminChapter {
  id: number;
  story: number;
  title: string;
  slug: string;
  content: string;
  order: number;
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
    avg_session_minutes: number;
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
}
