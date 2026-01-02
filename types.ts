
export interface Comic {
  slug: string;
  title: string;
  image: string;
  type?: string;
  chapter?: string;
  latestChapter?: string;
  rating?: string;
  status?: string;
  synopsis?: string;
  genres?: { title: string; slug: string }[];
  chapters?: Chapter[];
}

export interface Chapter {
  slug: string;
  title: string;
}

export interface ChapterDetail {
  title: string;
  images: string[];
  navigation: {
    prev: string | null;
    next: string | null;
  };
}

export interface HomeData {
  hotUpdates: Comic[];
  latestReleases: Comic[];
  projectUpdates: Comic[];
}

export interface Pagination {
  currentPage: number;
  hasNextPage: boolean;
  totalPages?: number;
}

export interface HistoryItem {
  slug: string;
  title: string;
  image: string;
  lastChapterSlug?: string;
  lastChapterTitle?: string;
  timestamp: number;
}

export type ViewState = 'HOME' | 'ONGOING' | 'COMPLETED' | 'HISTORY' | 'BOOKMARKS' | 'DETAIL' | 'READER' | 'GENRES_LIST' | 'GENRE_DETAIL' | 'SEARCH';

export interface FilterOptions {
  type: string;
  status: string;
  genre: string;
  query: string;
}
