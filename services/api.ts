
// Import necessary types from types.ts to fix "Cannot find name" errors
import { HomeData, Comic, ChapterDetail } from '../types';

const API_PROXY = "https://api.nekolabs.web.id/px?url=";
const API_BASE = "https://www.sankavollerei.com/comic/komikcast";

async function fetchFromProxy<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_PROXY}${encodeURIComponent(url)}`);
    const data = await response.json();
    if (data.success) {
      return (data.result?.content || data.result || data) as T;
    }
    return null;
  } catch (error) {
    console.error("API Fetch Error:", error);
    return null;
  }
}

export const ComicAPI = {
  getHome: () => fetchFromProxy<{ data: HomeData }>(`${API_BASE}/home`),
  
  getDetail: (slug: string) => fetchFromProxy<{ data: Comic }>(`${API_BASE}/detail/${slug}`),
  
  getChapter: (slug: string) => fetchFromProxy<{ data: ChapterDetail }>(`${API_BASE}/chapter/${slug}`),
  
  getList: (status: string, page: number = 1) => 
    fetchFromProxy<{ data: Comic[], pagination: any }>(`${API_BASE}/list?status=${status}&orderby=popular&page=${page}`),
    
  getGenres: () => fetchFromProxy<{ data: { title: string; slug: string }[] }>(`${API_BASE}/genres`),
  
  getByGenre: (slug: string, page: number = 1) => 
    fetchFromProxy<{ data: Comic[], pagination: any }>(`${API_BASE}/genre/${slug}/${page}`),
    
  search: (query: string, page: number = 1) => 
    fetchFromProxy<{ data: Comic[], pagination: any }>(`${API_BASE}/search/${encodeURIComponent(query)}/${page}`)
};
