interface Pagination {
    count: number;
    page: number;
    pages: number;
    previous: string | null;
    next: string | null;
    size: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  slug: string;
}

export interface Audio {
  id: string;
  title: string;
  audio_file: File;
  order: number;
  slug: string;
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
  description: string;
  cover_image: string;
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


export interface Author{
  id: number;
  name: string;
  bio: string;
  image: string;
  stories_count: number;
}

export interface StoryDetail extends Story {
  story_type: string;
  about: string;
  author: Author;
  genres: Genre[];
  chapter_count: number;
  chapters: Chapter[];
  tags: string[] | [];
  audios: Audio[] | [];
  reviews_count: number;
}

export interface ReviewUser {
  id: string;
  email: string;
  username: string;
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
  originals: Story[];
  new: Story[];
}

export interface HomeSidebar {
  recommended: Story[];
  stats: HomeStats;
}

export interface HomeDataResponse {
  featured_story: Story | null;
  weekly_spotlight: Story[];
  new_trending: Story[];
  tabs: HomeTabs;
  sidebar: HomeSidebar;
}

export interface TrendingDataResponse {
  today: Story[];
  week: Story[];
  month: Story[];
  alltime: Story[];
}

export interface OriginalsDataResponse {
  stories: Story[];
}

export interface DiscoverDataResponse {
  genres: Genre[];
  new_releases: Story[];
  hidden_gems: Story[];
}
