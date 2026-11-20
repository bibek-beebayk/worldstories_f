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
  aspect_ratio: "16:9" | "9:16";
}

export interface VideoTypeOption {
  id: number;
  name: string;
  videos_count: number;
}

export interface AdminVideoType {
  id: number;
  name: string;
  videos_count: number;
}

/** A video as listed on the Watch page — standalone or story-linked. */
export interface PublicVideo {
  id: number;
  title: string;
  display_title: string;
  slug: string;
  youtube_id: string;
  duration_seconds: number | null;
  aspect_ratio: "16:9" | "9:16";
  cover_image: string;
  /** cover_image if set, otherwise YouTube's default thumbnail. */
  thumbnail: string;
  story: {
    id: number;
    title: string;
    slug: string;
    author: string;
    formats: { read: boolean; listen: boolean; read_along: boolean };
  } | null;
  video_type: { id: number; name: string } | null;
  series: { slug: string; name: string; layout: "wide" | "tall" } | null;
  description: string;
  other_versions: Array<{
    id: number;
    slug: string;
    display_title: string;
    duration_seconds: number | null;
    series_name: string;
  }>;
  created_at: string;
}

export interface VideoSeries {
  id: number;
  name: string;
  slug: string;
  description: string;
  order: number;
  layout: "wide" | "tall";
  is_story_content: boolean;
  is_active: boolean;
}

export interface WatchOverview {
  featured: PublicVideo | null;
  count: number;
  continue_watching: Array<{ video: PublicVideo; progress_percent: number; seconds_left: number }>;
  shelves: Array<{ series: VideoSeries; videos: PublicVideo[] }>;
}

export interface PublicVideoDetail extends PublicVideo {
  suggested: PublicVideo[];
}

/** Watch progress keyed on the video itself, independent of any story. */
export interface VideoProgress {
  video_id: number;
  progress: number;
  position_seconds: number;
  duration_seconds: number;
  updated_at: string | null;
}

export interface Genre {
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
  has_read_along?: boolean;
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
  /** True/false in the Library list (there is text to read here); absent or null elsewhere. */
  has_text?: boolean | null;
}

export interface LibraryFacetCount {
  count: number;
}

/** GET /stories/facets/ — counts per filter value, each under the other active filters. */
export interface LibraryFacets {
  total: number;
  genres: Array<LibraryFacetCount & { id: number; slug: string; name: string }>;
  categories: Array<LibraryFacetCount & { id: number; slug: string; name: string }>;
  languages: Array<LibraryFacetCount & { value: string }>;
  lengths: Array<LibraryFacetCount & { value: string; label: string }>;
  countries: Array<LibraryFacetCount & { value: string; label: string }>;
  types: Array<LibraryFacetCount & { id: number; name: string }>;
  statuses: Array<LibraryFacetCount & { value: string; label: string }>;
  /** "all" plus one entry per format. */
  formats: Array<LibraryFacetCount & { value: string }>;
  originals: LibraryFacetCount;
  moods: Array<LibraryFacetCount & { slug: string; name: string }>;
}

/** One tile of the Library's collections strip. `params` is what to apply to the list. */
export interface LibraryCollection {
  key: string;
  label: string;
  params: Record<string, string>;
  count: number;
  covers: string[];
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

export interface Author {
  id: number;
  slug: string;
  name: string;
  sort_name: string;
  bio: string | null;
  image: string | null;
  birth_year: number | null;
  death_year: number | null;
  years_label: string;
  country: string;
  country_label: string;
  era: "ancient" | "pre_1800" | "1800s" | "1900s" | "contemporary" | "";
  known_for: string;
  is_traditional: boolean;
  titles_count: number;
  stories_count: number;
  formats: { audio: boolean; video: boolean; read_along: boolean };
}

export interface AuthorsOverview {
  featured: Author[];
  letters: string[];
  countries: Array<{ country: string; label: string; count: number }>;
  eras: Array<{ era: string; count: number }>;
  traditional_count: number;
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
  /** The look chosen for this story's /read/<slug> page, overriding any site theme. */
  site_theme?: PublicSiteTheme | null;
  is_original: boolean;
  story_type: string;
  about: string;
  /** An outside page for the story (e.g. where to buy it); "" when unset. */
  external_link?: string;
  /** Text for the external-link card (e.g. "Available on Amazon"); "" when unset. */
  link_note?: string;
  /** Button text for external_link; "" falls back to "Visit link". */
  link_label?: string;
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
  stories: number;
  /** Unique people who read, listened or watched in the last 30 days. */
  readers_30d?: number;
  countries?: number;
  languages?: number;
  audio_hours?: number;
  /** Legacy: Author rows. Not a reader/creator count a visitor should see. */
  creators: number;
  /** Legacy: lifetime story views. */
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
  /** Present on the Featured lineup, which mixes stories and videos. */
  kind?: "story" | "video";
  id: number;
  title: string;
  slug: string;
  cover_image: string | null;
  author: string | null;
  is_published: boolean;
  featured_rank: number;
}

/** One entry of the homepage Featured lineup. */
export type FeaturedItem = { kind: "story"; story: FeaturedStory } | { kind: "video"; video: PublicVideo };

export interface DailyStory {
  date: string;
  /** Exactly one of story / video is set. */
  story: FeaturedStory | null;
  video?: PublicVideo | null;
  featured_reason: string;
  configured: boolean;
}

export interface AdminDailyStory {
  date: string;
  story: number | null;
  story_detail: AdminFeaturedStory | null;
  video: number | null;
  video_detail: AdminFeaturedStory | null;
  featured_reason: string;
  active: boolean;
}

export interface HomeDataResponse {
  featured_stories: FeaturedStory[];
  /** The ordered Featured lineup, stories and videos together. */
  featured_items?: FeaturedItem[];
  daily_story: DailyStory | null;
  weekly_spotlight: Story[];
  new_trending: Story[];
  more_to_explore: Story[];
  quick_reads: Story[];
  originals: Story[];
  tabs: HomeTabs;
  sidebar: HomeSidebar;
  /** The hero template showing right now, or null when none applies — the
   *  homepage then falls back to its built-in default. */
  hero?: HeroConfig | null;
  /** Admin-managed homepage body, already ordered and resolved. */
  sections?: HomeSectionData[];
}

export type HeroAnimationPreset = "classic" | "halloween" | "winter" | "christmas" | "none";
export type HeroStatSource =
  "stories" | "readers_30d" | "countries" | "languages" | "audio_hours" | "creators" | "readers" | "custom";
export type HeroTitleSize = "small" | "medium" | "large" | "xlarge";
export type HeroLetterSpacing = "tight" | "normal" | "wide" | "wider";
export type HeroTextSize = "small" | "medium" | "large";

/** Hero fonts and text styling. Fonts are Google Fonts names; "" = the site's own. */
export interface HeroTypography {
  title_font: string;
  title_size: HeroTitleSize;
  title_weight: number;
  title_letter_spacing: HeroLetterSpacing;
  title_uppercase: boolean;
  title_italic: boolean;
  body_font: string;
  description_size: HeroTextSize;
  cta_uppercase: boolean;
}

/** Public hero content, as /home/ serves it (apps/story/serializers.py serialize_hero). */
export interface HeroConfig {
  id?: number;
  title: { prefix: string; highlight: string; highlight_from: string; highlight_to: string };
  description: string;
  /** Missing from older backends — the hero then uses DEFAULT_HERO_TYPOGRAPHY. */
  typography?: HeroTypography;
  info_lines: { icon: string; text: string }[];
  /** Live counts arrive as numbers (abbreviated client-side), custom values as text. */
  stats: { label: string; value: number | string }[];
  cta: { label: string; url: string; bg_from: string; bg_to: string; text_color: string };
  background: {
    color: string;
    image: string;
    accent: string;
    animation: HeroAnimationPreset | string;
    icons: string[];
  };
}

/** A hero template as the admin panel edits it — every field flat. */
export interface AdminHeroTemplate {
  id: number;
  name: string;
  is_default: boolean;
  starts_at: string | null;
  ends_at: string | null;
  /** live = what the homepage shows right now. */
  status: "live" | "scheduled" | "ended" | "idle";
  title_prefix: string;
  title_highlight: string;
  title_highlight_from: string;
  title_highlight_to: string;
  description: string;
  title_font: string;
  title_size: HeroTitleSize;
  title_weight: number;
  title_letter_spacing: HeroLetterSpacing;
  title_uppercase: boolean;
  title_italic: boolean;
  body_font: string;
  description_size: HeroTextSize;
  cta_uppercase: boolean;
  show_info_lines: boolean;
  show_stats: boolean;
  info_line_1_icon: string;
  info_line_1_text: string;
  info_line_2_icon: string;
  info_line_2_text: string;
  stat_1_source: HeroStatSource;
  stat_1_label: string;
  stat_1_value: string;
  stat_2_source: HeroStatSource;
  stat_2_label: string;
  stat_2_value: string;
  stat_3_source: HeroStatSource;
  stat_3_label: string;
  stat_3_value: string;
  cta_label: string;
  cta_url: string;
  cta_bg_from: string;
  cta_bg_to: string;
  cta_text_color: string;
  background_color: string;
  background_image: string;
  accent_color: string;
  animation_preset: HeroAnimationPreset;
  animation_icons: string[];
  updated_at: string;
}

export type AdminHeroTemplateInput = Omit<AdminHeroTemplate, "id" | "is_default" | "status" | "updated_at">;

export interface DiscoverTrendingItem {
  story: Story;
  /** Unique readers, listeners and watchers in the window (staff and bots excluded). */
  readers: number;
  /** 7, or 30 when the week was too quiet to rank. */
  window_days: number;
  /** Places gained since the window before (negative = fell); null if it was not ranked then. */
  rank_change: number | null;
}

export interface DiscoverHiddenGem {
  story: Story;
  /** Ready to show, e.g. "82% of readers finish it". */
  reason: string;
}

export type JustAddedFormat = "read" | "listen" | "read_along" | "watch" | "quick_read";

export interface DiscoverJustAdded {
  story: Story;
  format: JustAddedFormat;
}

export interface DiscoverCountry {
  code: string;
  name: string;
  count: number;
  covers: string[];
}

export interface DiscoverGenre {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface DiscoverDataResponse {
  trending: DiscoverTrendingItem[];
  hidden_gems: DiscoverHiddenGem[];
  just_added: DiscoverJustAdded[];
  countries: DiscoverCountry[];
  popular_genres: DiscoverGenre[];
}

export interface DiscoverSurpriseResponse {
  story: Story | null;
  /** One plain-text line from the story's description. */
  blurb: string;
  /** True when every qualifying story had already been shown and the pool restarted. */
  recycled: boolean;
}

export interface StoryMapCountry {
  code: string;
  name: string;
  stories_count: number;
  region: "Europe" | "Asia" | "Americas" | "Africa" | "Oceania" | "Other";
  top_authors: Array<{ name: string; slug: string }>;
  journey: { title: string; slug: string } | null;
}

export interface StoryMapRegion {
  name: StoryMapCountry["region"];
  stories_count: number;
  countries_count: number;
}

export interface StoryMapResponse {
  countries: StoryMapCountry[];
  regions: StoryMapRegion[];
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
  /** A site theme's id, used for this story's /read/<slug> page. */
  site_theme?: number | null;
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
  external_link: string;
  link_note: string;
  link_label: string;
  pdf_file: string | null;
  pdf_file_url: string | null;
  epub_file: string | null;
  epub_file_url: string | null;
  is_completed: boolean;
  is_original: boolean;
  /** Curated opt-in for the standalone Nepali site. Independent of `language`. */
  show_in_nepali_site: boolean;
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

/** GET /admin/stories/stats/ — the admin Stories overview. Published means live now; Scheduled is published with a future date. */
export interface AdminStoryStats {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
  /** The missing_* counts are among published stories only. */
  missing_summary: number;
  missing_retrospective: number;
  missing_cover: number;
  missing_chapters: number;
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
  slug: string;
  name: string;
  sort_name: string;
  bio?: string | null;
  image?: string | null;
  birth_year: number | null;
  death_year: number | null;
  years_label: string;
  country: string;
  country_label: string;
  era: string;
  known_for: string;
  is_traditional: boolean;
  is_house: boolean;
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
  /** Null for a standalone video that isn't attached to any story. */
  story: number | null;
  story_detail: { id: number; title: string; slug: string } | null;
  /** Optional category (Narration, Trailer, ...). */
  video_type: number | null;
  video_type_detail: { id: number; name: string } | null;
  series: number | null;
  series_detail: VideoSeries | null;
  title: string;
  display_title: string;
  slug: string;
  youtube_url: string;
  youtube_id: string;
  order: number;
  duration_seconds: number | null;
  aspect_ratio: "16:9" | "9:16";
  cover_image_file: string | null;
  cover_image_url: string;
  created_at: string;
  featured_rank: number | null;
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

export type AdminOverviewKpiKey =
  "unique_visitors" | "stories_started" | "stories_completed" | "engagement_minutes" | "new_signups" | "ad_impressions";

export interface AdminOverviewKpi {
  value: number;
  /** null when there is no previous period to compare with (all-time). */
  previous_value: number | null;
  /** null when the previous value was 0 (nothing to compare against). */
  change_pct: number | null;
  sparkline: number[];
}

export interface AdminOverviewPublishMarker {
  type?: "story" | "blog";
  date: string;
  /** The traffic-series `day` this marker sits on; null when the series can't place it. */
  bucket: string | null;
  title: string;
  slug: string;
}

export interface AdminOverviewFunnelStep {
  key: "visits" | "story_opened" | "started" | "completed";
  label: string;
  count: number;
  /** Share of the previous step (0-1); null for the first step or an empty denominator. */
  rate: number | null;
  rate_label: string | null;
}

export interface AdminOverviewFormat {
  minutes: number;
  unique_users: number;
  /** 0-1; null when nobody made progress in the range. */
  avg_completion: number | null;
}

export interface AdminOverviewMover {
  id: number;
  title: string;
  slug: string;
  performance_score: number;
  views: number;
  starts: number;
  completions: number;
  completion_rate: number | null;
  /** Trending only. Places moved up (+) or down (-); null if not ranked last period. */
  rank_change?: number | null;
}

export interface AdminOverviewAttentionItem {
  key: string;
  label: string;
  count: number;
  link: string;
}

export interface AdminOverviewResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  kpis: Record<AdminOverviewKpiKey, AdminOverviewKpi>;
  traffic: {
    series: { day: string; visitors: number }[];
    publish_markers: AdminOverviewPublishMarker[];
  };
  funnel: AdminOverviewFunnelStep[];
  formats: Record<"read" | "listen" | "watch", AdminOverviewFormat>;
  movers: {
    trending: AdminOverviewMover[];
    hidden_gems: AdminOverviewMover[];
    leaky: AdminOverviewMover[];
  };
  needs_attention: AdminOverviewAttentionItem[];
  sources: {
    referrers: { referral_source: string; count: number }[];
    countries: { country_code: string; visitors: number }[];
  };
  catalog: { stories: number; chapters: number; audios: number; videos: number; users: number };
}

export type AdminAnalyticsRangeDays = 1 | 7 | 30 | 90 | 365 | "all";
export type AdminAnalyticsExportSection = "content" | "engagement" | "audience" | "users" | "geography" | "submissions";
export type AdminAnalyticsExportFileFormat = "csv" | "xlsx";

export interface AdminAnalyticsDayCount {
  day: string;
  count: number;
}

export type AdminAnalyticsTimeInterval = "hour" | "day" | "week" | "month";

export type AdminContentKind = "story" | "audiobook" | "quick_read" | "blog";

export type AdminContentPerformanceSort =
  | "performance_score"
  | "views"
  | "reads"
  | "unique_people"
  | "unique_readers"
  | "listens"
  | "unique_listeners"
  | "reading_minutes"
  | "listening_minutes"
  | "engagement_minutes"
  | "interactions"
  | "completions"
  | "completion_rate";

export interface AdminContentPerformanceRow {
  id: number;
  title: string;
  slug: string;
  content_type: AdminContentKind;
  views: number;
  reads: number;
  /** Distinct people who read / listened / watched (listeners only for audiobooks). */
  unique_people: number;
  unique_readers: number;
  listens: number;
  unique_listeners: number;
  reading_minutes: number;
  listening_minutes: number;
  watching_minutes: number;
  /** Session-capped minutes (listening only for audiobooks). */
  engagement_minutes: number;
  interactions: number;
  actions: number;
  completions: number;
  /** 0-1, or null when no signed-in reader's progress is tracked. */
  completion_rate: number | null;
  tracked_people: number;
  downloads: number;
  favorites: number;
  reviews: number;
  reactions: number;
  /** 0-100, normalised within the content type for the range. */
  performance_score: number;
  /** Fewer than 2 unique people: the score says little. */
  low_sample: boolean;
  previous_score: number | null;
  /** Places moved up (+) or down (-); null if unranked last period. */
  rank_change: number | null;
}

export interface AdminContentScoreFormula {
  range: [number, number];
  weights: Record<"people" | "minutes" | "completion" | "actions", number>;
  completion_confidence_people: number;
  low_sample_people: number;
  summary: string;
}

export interface AdminContentPerformanceResponse {
  range_days: AdminAnalyticsRangeDays;
  content_type: AdminContentKind;
  sort: AdminContentPerformanceSort;
  score_formula: AdminContentScoreFormula;
  count: number;
  page: number;
  page_size: number;
  results: AdminContentPerformanceRow[];
}

export interface AdminContentKpi {
  value: number;
  previous_value: number | null;
  /** null when the previous value was 0 or there is no previous period. */
  change_pct: number | null;
}

export type AdminContentKpiKey = "views" | "unique_readers" | "engagement_minutes" | "completions" | "titles_published";

export interface AdminContentPublishMarker {
  date: string;
  /** The series `day` this marker sits on; null when the series can't place it. */
  bucket: string | null;
  title: string;
  slug: string;
  type?: "story" | "blog";
}

export interface AdminContentGroupPerformance {
  name: string;
  stories_in_catalogue: number;
  stories_with_activity: number;
  views: number;
  unique_readers: number;
  engagement_minutes: number;
  completion_rate: number | null;
  views_per_story: number;
}

export type AdminContentGapKey = "no_audio" | "no_quick_read" | "no_cover" | "no_video";

export interface AdminContentGapRow {
  id: number;
  title: string;
  slug: string;
  missing: ("audio" | "quick_read" | "cover" | "video")[];
  views: number;
}

export interface AdminAnalyticsContentResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  kpis: Record<AdminContentKpiKey, AdminContentKpi>;
  views_over_time: {
    series: AdminAnalyticsDayCount[];
    previous_series: AdminAnalyticsDayCount[] | null;
    total: number;
    previous_total: number | null;
    change_pct: number | null;
    publish_markers: AdminContentPublishMarker[];
  };
  top_content: Record<AdminContentKind, { count: number; rows: AdminContentPerformanceRow[] }>;
  score_formula: AdminContentScoreFormula;
  genre_performance: AdminContentGroupPerformance[];
  story_type_performance: AdminContentGroupPerformance[];
  catalogue_gaps: Record<AdminContentGapKey, { total: number; rows: AdminContentGapRow[] }>;
  publishing: {
    stories: number;
    blogs: number;
    previous_stories: number | null;
    previous_blogs: number | null;
    series: { day: string; stories: number; blogs: number }[];
  };
}

export type AdminEngagementKpiKey =
  | "start_rate"
  | "completion_rate"
  | "minutes_per_reader"
  | "returning_rate"
  | "audio_listen_through"
  | "video_watch_through";

export interface AdminEngagementKpi {
  /** null when fewer than `min_sample` people stand behind it. */
  value: number | null;
  previous_value: number | null;
  /** How many people (or pairs) the value is a rate over. */
  sample_size: number;
  previous_sample_size: number | null;
  sample_label: string;
  min_sample: number;
}

export interface AdminEngagementFunnelStep {
  key: string;
  label: string;
  count: number;
  /** "signed_in" steps (completion, video progress) can only be seen for signed-in people. */
  population: "everyone" | "signed_in";
  /** Share of the previous step, within the same population; null for the first step. */
  rate: number | null;
  base: number | null;
  partial: boolean;
  previous_count: number | null;
  previous_rate: number | null;
}

export type AdminEngagementFormat = "read" | "listen" | "watch";
export type AdminEngagementLength = "short" | "medium" | "long";

export interface AdminEngagementDepthPoint {
  pct: number;
  /** Share of starters at this depth, 0-1; null when there are none. */
  rate: number | null;
  reached: number;
  of: number;
  population: "everyone" | "signed_in";
  previous_rate: number | null;
}

export interface AdminEngagementDropOffStory {
  id: number;
  title: string;
  slug: string;
  starters: number;
  /** Reached the last quarter or finished — observable for anonymous readers too. */
  finish_rate: number | null;
  /** Actually completed — signed-in readers only. */
  completion_rate: number | null;
  signed_in_starters: number;
  stop_at: string | null;
  stop_share: number | null;
  stop_chapter: { order: number; title: string } | null;
}

export interface AdminEngagementRetentionBucket {
  eligible: number;
  returned: number;
  rate: number | null;
  previous_rate: number | null;
}

export interface AdminEngagementFeedbackBlock {
  total: number;
  previous_total: number | null;
  sparkline: number[];
}

export interface AdminEngagementOtherRate {
  key: string;
  label: string;
  help: string;
  numerator: number;
  denominator: number;
  rate: number | null;
}

export interface AdminAnalyticsEngagementResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  min_sample: number;
  kpis: Record<AdminEngagementKpiKey, AdminEngagementKpi>;
  funnels: Record<AdminEngagementFormat, AdminEngagementFunnelStep[]>;
  depth_curve: Record<AdminEngagementLength, { starters: number; points: AdminEngagementDepthPoint[] }>;
  drop_off_stories: AdminEngagementDropOffStory[];
  retention: Record<"d1" | "d7" | "d30", AdminEngagementRetentionBucket>;
  feedback: {
    favorites: AdminEngagementFeedbackBlock;
    reviews: AdminEngagementFeedbackBlock & {
      avg_rating: number | null;
      previous_avg_rating: number | null;
      distribution: { rating: number; count: number }[];
    };
    reactions: AdminEngagementFeedbackBlock;
  };
  other_signals: {
    rates: AdminEngagementOtherRate[];
    discovery: Record<string, number>;
  };
}

export type AdminUserStatus = "new" | "active" | "at_risk" | "dormant" | "unverified";

export type AdminUsersKpiKey =
  | "registered_users"
  | "new_users"
  | "active_users"
  | "activation_rate"
  | "visitor_to_signup_rate"
  | "signed_in_minutes_share";

export interface AdminUsersKpi {
  /** null when fewer than `min_sample` people stand behind a rate. */
  value: number | null;
  previous_value: number | null;
  sample_size: number;
  previous_sample_size: number | null;
  min_sample: number;
  /** registered_users only: the running total at the end of each of the last 12 weeks. */
  sparkline?: number[];
}

export interface AdminUsersFunnelStep {
  key: string;
  label: string;
  count: number;
  /** Share of the step above; null for the first step. */
  rate: number | null;
  previous_count: number | null;
}

export interface AdminUserRow {
  id: string;
  username: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  date_joined: string;
  last_login: string | null;
  login_count: number;
  last_active: string | null;
  otp_verified: boolean;
  status: AdminUserStatus;
  signup_source: string | null;
  signup_method: "before_signup" | "after_signup" | "none";
  signup_landing: { path: string; title: string; type: AdminAudiencePageType; resolved: boolean } | null;
  signup_story: { title: string; slug: string } | null;
  active_days: number;
  stories_started: number;
  stories_completed: number;
  reading_minutes: number;
  listening_minutes: number;
  watching_minutes: number;
  favorites: number;
  reviews: number;
  reactions: number;
  current_streak: number;
  longest_streak: number;
  achievements_count: number;
  passport_countries: number;
  journeys_completed: number;
  country: string | null;
}

export interface AdminUsersCohortRow {
  cohort: string;
  size: number;
  weeks: { week: number; eligible: number; active: number; rate: number | null }[];
}

export interface AdminAnalyticsUsersResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  min_sample: number;
  kpis: Record<AdminUsersKpiKey, AdminUsersKpi>;
  signup_funnel: AdminUsersFunnelStep[];
  users: AdminUserRow[];
  users_total: number;
  users_page: number;
  users_pages: number;
  segments: Record<AdminUserStatus, number>;
  signups_over_time: {
    interval: "day" | "week";
    sources: string[];
    series: { day: string; total: number; by_source: Record<string, number> }[];
  };
  cohorts: {
    available: boolean;
    min_users: number;
    total_users: number;
    weeks: number;
    rows: AdminUsersCohortRow[];
  };
  attribution: { attributed: number; total: number; before_signup: number; after_signup: number; none: number };
}

export type AdminUserTimelineKind =
  | "story_session"
  | "quick_read_session"
  | "blog_session"
  | "audio_session"
  | "video_session"
  | "completion"
  | "favorite"
  | "review"
  | "achievement";

export interface AdminUserTimelineItem {
  kind: AdminUserTimelineKind;
  at: string;
  title: string;
  minutes?: number;
  sessions?: number;
  progress?: number | null;
  rating?: number;
  source?: string;
}

export interface AdminUserTimelineResponse {
  user_id: string;
  total: number;
  items: AdminUserTimelineItem[];
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
  comparison?: Omit<AdminAnalyticsSubmissionsResponse, "comparison"> | null;
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  submissions_over_time: AdminAnalyticsSubmissionsOverTimePoint[];
  funnel: AdminAnalyticsFunnelRow[];
  avg_time_to_review_hours: number;
  by_story_type: AdminAnalyticsStoryTypeCount[];
  by_genre: AdminAnalyticsGenreCount[];
}

export type AdminAudienceKpiKey =
  | "unique_visitors"
  | "engaged_visitors"
  | "engaged_rate"
  | "returning_rate"
  | "median_engaged_minutes"
  | "signed_in_share";

export interface AdminAudienceKpi {
  /** null when fewer than `min_sample` people stand behind a rate. */
  value: number | null;
  previous_value: number | null;
  sample_size: number;
  previous_sample_size: number | null;
  min_sample: number;
}

export interface AdminAudienceTrafficQuality {
  /** Flagged visit events over all visit events in the range (0-1). */
  bot_share: number | null;
  previous_bot_share: number | null;
  flagged_visit_events: number;
  visit_events: number;
  /** Visitors who arrived from a source we can name, over visitors we could attribute (0-1). */
  referrer_coverage: number | null;
  direct_share: number | null;
  last_bot_flag_run: {
    ran_at: string;
    flagged_events: number;
    flagged_visitors: number;
    rules: string;
    hours_ago: number;
  } | null;
}

export interface AdminAudiencePoint {
  day: string;
  new_visitors: number;
  returning_visitors: number;
}

export interface AdminAudienceAcquisitionRow {
  source: string;
  unique_visitors: number;
  previous_unique_visitors: number | null;
  engaged_visitors: number;
  engaged_rate: number | null;
  unique_starters: number;
  story_completions: number;
  returning_visitors: number;
  returning_rate: number | null;
}

export type AdminAudiencePageType =
  "story" | "read" | "listen" | "watch" | "blog" | "page" | "home" | "library" | "other";

export interface AdminAudienceLandingPage {
  path: string;
  type: AdminAudiencePageType;
  title: string;
  admin_link: string | null;
  resolved: boolean;
  unique_visitors: number;
  sessions: number;
  /** Share of sessions with a single page view and no reading, listening or watching (0-1). */
  bounce_rate: number | null;
  /** Share of sessions that started reading, listening or watching (0-1). */
  started_rate: number | null;
}

export type AdminAudienceFormat = "read" | "listen" | "watch" | "quick_read" | "blog";

export interface AdminAudienceBehaviour {
  format_split: { format: AdminAudienceFormat; unique_people: number; minutes: number }[];
  devices: { ua_family: string; visitors: number }[];
  countries: { country_code: string; visitors: number }[];
  completions: {
    stories: number;
    chapters: number;
    read_along: number;
    other: number;
    story_starters: number;
    story_completion_rate: number | null;
  };
}

export interface AdminAnalyticsAudienceResponse {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  min_sample: number;
  traffic_quality: AdminAudienceTrafficQuality;
  kpis: Record<AdminAudienceKpiKey, AdminAudienceKpi>;
  visitors_over_time: {
    series: AdminAudiencePoint[];
    previous_series: AdminAudiencePoint[] | null;
    publish_markers: AdminContentPublishMarker[];
  };
  acquisition: AdminAudienceAcquisitionRow[];
  landing_pages: AdminAudienceLandingPage[];
  slug_warnings: {
    total: number;
    stories: { id: number; title: string; slug: string; admin_link: string }[];
  };
  behaviour: AdminAudienceBehaviour;
}

export interface AdminMonetizationKpi {
  value: number;
  previous_value: number | null;
  change_pct: number | null;
}

export interface AdminAnalyticsMonetizationResponse {
  range_days: AdminAnalyticsRangeDays;
  has_data: boolean;
  kpis: Record<"ad_impressions" | "downloads" | "unique_downloaders", AdminMonetizationKpi>;
  ad_placements: { path: string; title: string; type: AdminAudiencePageType; size: string; count: number }[];
  ad_by_content_type: { content_type: string; count: number }[];
  download_types: { content_type: string; count: number; bytes: number }[];
  top_downloads: { story_id: number; title: string; slug: string; count: number; bytes: number }[];
}

export interface AdminAnalyticsCountryRow {
  country: string;
  country_code: string;
  logins: number;
  users: number;
}

export interface AdminAnalyticsGeographyResponse {
  comparison?: Omit<AdminAnalyticsGeographyResponse, "comparison"> | null;
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  total_logins: number;
  unresolved_logins: number;
  countries_reached: number;
  by_country: AdminAnalyticsCountryRow[];
  by_city: Array<{ city: string; country: string; logins: number; users: number }>;
  logins_over_time: Array<{ day: string; count: number; users: number }>;
}

export type AdminGeographyScope = "visitors" | "signed_in";

export interface AdminGeographyKpi<T = number> {
  /** null when too few visitors stand behind it. */
  value: T | null;
  previous_value: T | null;
  sample_size: number;
  previous_sample_size: number | null;
  min_sample: number;
}

export interface AdminGeographyCountryRow {
  country_code: string;
  country: string;
  visitors: number;
  previous_visitors: number | null;
  engaged_visitors: number;
  engaged_rate: number | null;
  readers: number;
  minutes: number;
  completions: number;
  signed_in_users: number;
  top_story: { id: number; title: string; slug: string } | null;
  top_format: "read" | "listen" | "watch" | "quick_read" | "blog" | null;
  top_source: string | null;
  /** Suspected-bot share of this country's visit events, taken before bots are excluded. */
  bot_share: number | null;
  bot_visit_events: number;
}

export interface AdminGeographyVisitorsResponse {
  scope: "visitors";
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  min_sample: number;
  has_previous: boolean;
  kpis: {
    countries_reached: AdminGeographyKpi;
    top_country: AdminGeographyKpi<{ country_code: string; country: string; visitors: number; share: number | null }>;
    outside_top_country_share: AdminGeographyKpi;
    country_coverage: AdminGeographyKpi;
    bot_share: AdminGeographyKpi;
  };
  by_country: AdminGeographyCountryRow[];
  series: { key: string; label: string }[];
  over_time: Array<{ day: string } & Record<string, number | string>>;
  cities: Array<{ city: string; region: string; country_code: string; country: string; visitors: number }>;
  /** "events" = measured for everyone; "signed_in_only" = the login-based fallback. */
  cities_source: "events" | "signed_in_only";
  /** Earliest event that carries a country (ISO), or null. */
  data_since: string | null;
}

export type AdminGeographyResponse =
  AdminGeographyVisitorsResponse | (AdminAnalyticsGeographyResponse & { scope: "signed_in" });

export interface AdminGeographyCountryDetail {
  country_code: string;
  country: string;
  range_days: AdminAnalyticsRangeDays;
  visitors: number;
  top_stories: Array<{ id: number; title: string; slug: string; visitors: number; readers: number; minutes: number }>;
  landing_pages: Array<{
    path: string;
    title: string;
    type: string;
    resolved: boolean;
    admin_link: string | null;
    visitors: number;
  }>;
  referral_sources: Array<{ referral_source: string; count: number }>;
  devices: Array<{ ua_family: string; visitors: number }>;
  languages: Array<{ language: string; name: string; readers: number }>;
}

export interface AdminStoryDetailAnalyticsResponse {
  range_days: AdminAnalyticsRangeDays;
  story: { id: number; title: string; slug: string };
  time_series: AdminTitleAnalyticsTimeSeries;
  page_opens: number;
  started_reading: number;
  completed_reading: number;
  completion_rate: number;
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
  referral_sources: Array<{ referral_source: string; count: number }>;
  countries: Array<{ country_code: string; visitors: number }>;
  lifetime: {
    total_views: number;
    total_readers_ever: number;
    total_completions: number;
    total_favorites: number;
    total_reviews: number;
    avg_rating: number;
    total_downloads: number;
    median_time_to_completion_hours: number | null;
  };
}

export interface AdminBlogDetailAnalyticsResponse {
  range_days: AdminAnalyticsRangeDays;
  blog: { id: number; title: string; slug: string };
  time_series: AdminTitleAnalyticsTimeSeries;
  page_opens: number;
  started_reading: number;
  completion_rate: number;
  reading_minutes: number;
  signed_in_readers_with_depth_tracked: number;
  avg_progress_signed_in: number;
  completed_signed_in: number;
  progress_distribution_signed_in: Array<{ bucket: string; count: number }>;
  referral_sources: Array<{ referral_source: string; count: number }>;
  countries: Array<{ country_code: string; visitors: number }>;
  lifetime: {
    total_views: number;
    total_readers_ever: number;
    total_completions: number;
  };
}

export interface AdminQuickReadDetailAnalyticsResponse {
  range_days: AdminAnalyticsRangeDays;
  story: { id: number; title: string; slug: string };
  time_series: {
    interval: "hour" | "day" | "month";
    points: Array<{
      period: string;
      opens: number;
      completions: number;
      full_story_clicks: number;
      reading_minutes: number;
    }>;
  };
  opens: number;
  unique_readers: number;
  completions: number;
  completion_rate: number;
  full_story_clicks: number;
  full_story_conversion_rate: number;
  clicks_after_completion: number;
  reading_minutes: number;
  readers_with_depth_tracked: number;
  avg_progress: number;
  progress_distribution: Array<{ bucket: string; count: number }>;
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

export interface QuickReadProgress {
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
  /** The first book the post links to, for the card's book chip. The blog list sends just its
   *  title and slug; older responses carried the full story. */
  linked_story?: BlogLinkedStory | null;
  topics?: BlogTopicRef[];
  /** Whole minutes to read, from the post's word count; null on posts saved before it existed. */
  reading_time_minutes?: number | null;
  /** Unique readers in the last 30 days; only on the blog list and overview. */
  reads_30d?: number | null;
  published_at: string;
  updated_at: string;
}

export interface BlogTopicRef {
  name: string;
  slug: string;
}

export interface BlogTopicCount extends BlogTopicRef {
  id: number;
  post_count: number;
}

export interface BlogLinkedBook {
  id: number;
  title: string;
  slug: string;
  author: string | null;
  cover_image: string;
  /** How many published posts link to it. */
  post_count: number;
}

/** GET /blog/overview/ — the top of the blog page. */
export interface BlogOverview {
  featured: Blog | null;
  /** True when an editor pinned it; false when it is simply the newest post. */
  featured_is_pinned: boolean;
  most_read: Blog[];
  topics: BlogTopicCount[];
  total_posts: number;
  linked_books: BlogLinkedBook[];
}

export interface AdminBlogTopic {
  id: number;
  name: string;
  slug: string;
  order: number;
  description: string;
  post_count?: number;
}

export interface AdminBlogStats {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
  missing_excerpt: number;
  missing_topics: number;
  missing_cover: number;
  no_linked_stories: number;
}

export interface AdminBlogListParams {
  page?: number;
  search?: string;
  status?: "published" | "draft" | "scheduled";
  has_excerpt?: boolean;
  has_topics?: boolean;
  has_cover?: boolean;
  has_linked_stories?: boolean;
  topic?: number;
  sort?: "newest" | "oldest" | "updated" | "title_asc" | "title_desc";
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
  /** Omitted on list responses; populated on retrieve/create/update. */
  content?: string;
  cover_image_file: string | null;
  cover_image_url: string;
  author_name: string | null;
  linked_stories?: number[];
  linked_story_details?: { id: number; title: string; slug: string }[];
  linked_blogs?: number[];
  linked_blog_details?: { id: number; title: string; slug: string }[];
  topics?: number[];
  topic_details?: { id: number; name: string; slug: string }[];
  topics_status?: AiGenerationStatus | null;
  topics_source?: AiGenerationSource | null;
  topics_confident?: boolean | null;
  topics_confidence_note?: string | null;
  topics_error?: string | null;
  /** Computed from the content on save; read-only. */
  reading_time_minutes?: number | null;
  is_featured?: boolean;
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
  "already_a_story" | "already_in_queue" | "duplicate_in_file" | "missing_title";

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

export interface JourneySummary {
  slug: string;
  title: string;
  description: string;
  type: string;
  /** The journey's own artwork, or the first story's cover. */
  cover_image: string;
  /** Up to two story covers, for a collage. */
  covers?: string[];
  /** Required stories finished, out of the total required. */
  completed: number;
  total: number;
  is_complete: boolean;
  next_story?: { slug: string; title: string; cover_image: string } | null;
}

export interface JourneyListResponse {
  journeys: JourneySummary[];
}

export interface JourneyItem {
  position: number;
  /** Optional items do not hold a journey open — an editor can add a bonus
   *  story without moving the finish line. */
  required: boolean;
  completed: boolean;
  story: Story;
}

export interface JourneyDetail extends JourneySummary {
  items: JourneyItem[];
}

export interface AdminJourneyItem {
  id: number;
  story: number;
  story_title: string;
  story_slug: string;
  story_cover: string;
  story_published: boolean;
  position: number;
  required: boolean;
}

export interface AdminJourney {
  id: number;
  title: string;
  slug: string;
  description: string;
  cover_image: string;
  type: string;
  active: boolean;
  order: number;
  items: AdminJourneyItem[];
  item_count: number;
  /** Completion is judged on required items only, so an editor needs this
   *  separately from the total. */
  required_count: number;
  created_at: string;
}

export type ReactionType = "loved" | "funny" | "surprising" | "emotional" | "thought_provoking";

export interface ReactionCount {
  type: ReactionType;
  label: string;
  count: number;
}

export interface StoryReactionsResponse {
  /** Every type, including those at zero — a story should not offer fewer
   *  ways to answer the longer it goes unreacted-to. */
  reactions: ReactionCount[];
  total: number;
  /** Null for a signed-out reader, or one who has not reacted. */
  my_reaction: ReactionType | null;
}

export interface WeeklyRecapResponse {
  days: number;
  stories_completed: number;
  minutes_read: number;
  countries_explored: number;
  journeys_completed: number;
  current_streak: number;
  favourite_genre: string | null;
  /** False for a quiet week. Five zeroes tell a reader only that they did
   *  nothing, so the card renders nothing at all in that case. */
  has_activity: boolean;
}

export interface NepalikathaAnalytics {
  range_days: AdminAnalyticsRangeDays;
  time_interval: AdminAnalyticsTimeInterval;
  visitors: number;
  page_views: number;
  readers: number;
  stories_read: number;
  reading_sessions: number;
  reading_seconds: number;
  average_reading_seconds: number | null;
  over_time: { day: string; visitors: number; page_views: number; reading_seconds: number }[];
  top_stories: { slug: string; title: string; readers: number; reads: number; reading_seconds: number }[];
}

// ---------------------------------------------------------------------------
// Admin-built pages (/pages/<slug>) — apps/pages on the backend.
// ---------------------------------------------------------------------------

export type PageStoryLayout = "grid" | "rail";

export interface RichTextBlockConfig {
  html: string;
}
export interface StoryListBlockConfig {
  heading: string;
  story_ids: number[];
  layout: PageStoryLayout;
}
export interface StoryQueryBlockConfig {
  heading: string;
  genre: string;
  category: string;
  tag: string;
  theme: string;
  country: string;
  sort: "newest" | "popular" | "top_rated";
  limit: number;
  layout: PageStoryLayout;
}
export interface BannerBlockConfig {
  heading: string;
  text: string;
  image: string;
  cta_label: string;
  cta_url: string;
  background_color: string;
}
export interface ImageBlockConfig {
  url: string;
  alt: string;
  caption: string;
}
export interface FaqBlockConfig {
  heading: string;
  items: { question: string; answer: string }[];
}
export interface CtaBlockConfig {
  text: string;
  label: string;
  url: string;
  bg_color: string;
  text_color: string;
}

export type PageBlockData =
  | { type: "rich_text"; config: RichTextBlockConfig }
  | { type: "story_list"; config: StoryListBlockConfig }
  | { type: "story_query"; config: StoryQueryBlockConfig }
  | { type: "banner"; config: BannerBlockConfig }
  | { type: "image"; config: ImageBlockConfig }
  | { type: "faq"; config: FaqBlockConfig }
  | { type: "cta"; config: CtaBlockConfig };

export type PageBlockType = PageBlockData["type"];

/** A block as the public page receives it — story blocks come with card data. */
export type PublicPageBlock = PageBlockData & {
  id: number;
  stories?: Story[];
  see_all_url?: string | null;
};

export type PageContentWidth = "narrow" | "normal" | "wide" | "full";
export type PageSectionSpacing = "compact" | "normal" | "relaxed";

/** The look page themes and site themes share (apps/pages/models.py ThemeLook). */
export interface ThemeLookValues {
  background_color: string;
  surface_color: string;
  text_color: string;
  muted_text_color: string;
  heading_color: string;
  primary_color: string;
  primary_text_color: string;
  border_color: string;
  heading_font: string;
  body_font: string;
  radius: number;
  background_image: string;
  background_overlay_color: string;
  background_overlay_opacity: number;
  custom_css: string;
}

/** Everything a page theme controls: the shared look plus page-only layout. */
export interface PageThemeValues extends ThemeLookValues {
  body_font_size: number;
  heading_weight: number;
  heading_uppercase: boolean;
  content_width: PageContentWidth;
  section_spacing: PageSectionSpacing;
}

export type SiteThemeMode = "off" | "always" | "scheduled";
export type SiteThemeApplyTo = "site" | "pages";

/** A live site theme as the public site receives it, highest priority first. */
export interface PublicSiteTheme extends ThemeLookValues {
  id: number;
  apply_to: SiteThemeApplyTo;
  /** "/library" matches exactly; "/story/*" matches every path under it. */
  page_paths: string[];
}

export interface SiteThemeInput extends ThemeLookValues {
  name: string;
  mode: SiteThemeMode;
  starts_at: string | null;
  ends_at: string | null;
  apply_to: SiteThemeApplyTo;
  page_paths: string[];
}

export interface AdminSiteTheme extends SiteThemeInput {
  id: number;
  status: "off" | "always" | "live" | "scheduled" | "ended";
  updated_at: string;
}

export interface PublicPageTheme extends PageThemeValues {
  id: number;
}

export interface AdminPageTheme extends PageThemeValues {
  id: number;
  name: string;
  /** How many pages use it — shown before deleting. */
  page_count: number;
  updated_at: string;
}

export interface PublicPage {
  title: string;
  slug: string;
  path: string;
  meta_title: string;
  meta_description: string;
  og_image: string;
  noindex: boolean;
  is_preview: boolean;
  /** null = the site's own look. */
  theme: PublicPageTheme | null;
  published_at: string;
  updated_at: string;
  blocks: PublicPageBlock[];
}

/** An old slug answers with where the page lives now. */
export type PublicPageResponse = PublicPage | { redirect: string };

export type PageTemplate = "static" | "book_list" | "blank";
export type PageStatus = "draft" | "published";
export type PageStatusLabel = "draft" | "scheduled" | "live";

export interface AdminPageListItem {
  id: number;
  title: string;
  slug: string;
  path: string;
  template: PageTemplate;
  status: PageStatus;
  status_label: PageStatusLabel;
  publish_at: string | null;
  updated_at: string;
}

/** A block as the editor holds it; story lists carry titles for display. */
export type AdminPageBlock = PageBlockData & {
  id?: number;
  stories?: { id: number; title: string; is_published: boolean }[];
};

export interface AdminPage extends AdminPageListItem {
  meta_title: string;
  meta_description: string;
  og_image: string;
  noindex: boolean;
  theme: number | null;
  blocks: AdminPageBlock[];
  created_at: string;
}

export interface AdminPageInput {
  title: string;
  slug: string;
  template: PageTemplate;
  status: PageStatus;
  publish_at: string | null;
  meta_title: string;
  meta_description: string;
  og_image: string;
  noindex: boolean;
  theme: number | null;
  blocks: PageBlockData[];
}

export type HomeSectionType =
  | "stories_query"
  | "stories_manual"
  | "videos"
  | "blogs"
  | "banner"
  | "ad_slot"
  | "new_entries"
  | "continue_shelf"
  | "reading_journey"
  | "recommended"
  | "journeys_banner"
  | "explore_tiles";
export type HomeSectionVariant = "standard" | "quick_read" | "originals";
export type HomeSectionLayout = "grid" | "rail" | "trending";
export type HomeSectionShowTo = "all" | "signed_in" | "signed_out";
export type HomeSectionCardStyle = "default" | "compact";

/** One resolved section from /home/ (apps/story/home_sections.py). `items` is
 *  stories, videos or blog cards depending on `section_type`. */
export interface HomeSectionData {
  id: number;
  section_type: HomeSectionType;
  variant: HomeSectionVariant;
  title: string;
  subtitle: string;
  icon: string;
  layout: HomeSectionLayout;
  columns_mobile: number;
  columns_desktop: number;
  card_style: HomeSectionCardStyle;
  item_limit: number;
  allow_repeats: boolean;
  see_all_url: string;
  see_all_label: string;
  config: Record<string, unknown>;
  items: unknown[];
}

export interface HomeSectionConfig {
  sort?: string;
  genres?: number[];
  categories?: number[];
  tags?: number[];
  themes?: number[];
  moods?: string[];
  story_type?: number | null;
  language?: string;
  original_only?: boolean;
  has_summary?: boolean;
  has_audio?: boolean;
  has_video?: boolean;
  has_read_along?: boolean;
  require_cover?: boolean;
  story_ids?: number[];
  video_type?: number | null;
  standalone_only?: boolean;
  button_label?: string;
  button_url?: string;
  theme?: string;
  ad_size?: string;
}

export interface AdminHomeSection {
  id: number;
  title: string;
  subtitle: string;
  section_type: HomeSectionType;
  variant: HomeSectionVariant;
  position: number;
  is_enabled: boolean;
  icon: string;
  layout: HomeSectionLayout;
  columns_mobile: number;
  columns_desktop: number;
  card_style: HomeSectionCardStyle;
  item_limit: number;
  allow_repeats: boolean;
  show_see_all: boolean;
  see_all_label: string;
  see_all_url: string;
  config: HomeSectionConfig;
  stories_detail: { id: number; title: string }[];
  updated_at: string;
  show_to: HomeSectionShowTo;
  starts_at: string | null;
  ends_at: string | null;
}

export interface HomeSectionClickWindow {
  clicks: number;
  /** clicks ÷ homepage visits in the window; null with no visits. */
  click_through: number | null;
}

export interface HomeSectionAnalytics {
  windows: number[];
  visits: Record<string, number>;
  sections: Record<string, Record<string, HomeSectionClickWindow>>;
}

export interface MissingCoverStories {
  total: number;
  results: { id: number; title: string; slug: string; views: number }[];
}

export type AdminHomeSectionInput = Omit<AdminHomeSection, "id" | "position" | "stories_detail" | "updated_at"> & {
  position?: number;
};

export interface HomeSectionTypesMeta {
  types: { value: HomeSectionType; label: string; content: boolean; fields: string[] }[];
  variants: { value: HomeSectionVariant; label: string }[];
  layouts: { value: HomeSectionLayout; label: string }[];
  card_styles: { value: HomeSectionCardStyle; label: string }[];
  show_to?: { value: HomeSectionShowTo; label: string }[];
  sorts: string[];
  banner_themes: string[];
  ad_sizes: string[];
  icons: string[];
}

export type FeedbackCategory = "bug" | "idea" | "content" | "praise" | "other";
export type FeedbackStatus = "new" | "reviewed" | "resolved";

export interface FeedbackInput {
  category: FeedbackCategory;
  message: string;
  rating?: number | null;
  email?: string;
  page_url?: string;
  images?: File[];
}

export interface AdminFeedback {
  id: number;
  user_email: string | null;
  user_name: string | null;
  email: string;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  page_url: string;
  user_agent: string;
  images: { id: number; url: string }[];
  status: FeedbackStatus;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface AdminFeedbackListResponse extends PaginatedResponse<AdminFeedback> {
  status_counts: Record<FeedbackStatus, number>;
}
