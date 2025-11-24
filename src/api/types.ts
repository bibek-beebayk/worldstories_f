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

export interface Genre{
  id: number;
  name: string;
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
}

export interface StoryDetail extends Story {
  story_type: string;
  about: string;
  author: Author;
  genres: Genre[];
  chapter_count: number;
  chapters: Chapter[];
  tags: string[] | [];
}
