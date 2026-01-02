
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ComicAPI } from './services/api';
import { Comic, Chapter, HistoryItem, ViewState, HomeData, Pagination, ChapterDetail, FilterOptions } from './types';
import { 
  HomeIcon, FireIcon, CheckIcon, HistoryIcon, BookmarkIcon, 
  SearchIcon, ChevronLeftIcon, ChevronRightIcon, SquaresIcon, AdjustmentsIcon 
} from './components/Icons';

const App: React.FC = () => {
  // Navigation & View State
  const [view, setView] = useState<ViewState>('HOME');
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [currentChapterSlug, setCurrentChapterSlug] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<{title: string, slug: string} | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [allGenres, setAllGenres] = useState<{title: string, slug: string}[]>([]);
  const [filter, setFilter] = useState<FilterOptions>({
    type: '',
    status: '',
    genre: '',
    query: ''
  });

  // Data State
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [listData, setListData] = useState<Comic[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ currentPage: 1, hasNextPage: false });
  const [comicDetail, setComicDetail] = useState<Comic | null>(null);
  const [chapterDetail, setChapterDetail] = useState<ChapterDetail | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [readerUIVisible, setReaderUIVisible] = useState(true);
  const [readProgress, setReadProgress] = useState(0);
  
  // Local Storage
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<HistoryItem[]>([]);

  // Refs for Reader
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    const savedBookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
    setHistory(savedHistory);
    setBookmarks(savedBookmarks);
    
    // Pre-fetch genres for filters
    const loadGenres = async () => {
      const res = await ComicAPI.getGenres();
      if (res?.data) setAllGenres(res.data);
    };
    loadGenres();
    fetchHome();

    // Scroll progress & UI hide/show logic
    const handleScroll = () => {
      if (view !== 'READER') return;
      
      const st = window.pageYOffset || document.documentElement.scrollTop;
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const totalDocScrollLength = docHeight - winHeight;
      const scrollPostion = Math.floor((st / totalDocScrollLength) * 100);
      
      setReadProgress(scrollPostion);

      if (st > lastScrollTop.current && st > 100) {
        setReaderUIVisible(false);
      } else {
        setReaderUIVisible(true);
      }
      lastScrollTop.current = st <= 0 ? 0 : st;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [view]);

  const saveToHistory = (comic: Comic, chapter?: { slug: string; title: string }) => {
    setHistory(prev => {
      const newItem: HistoryItem = {
        slug: comic.slug,
        title: comic.title,
        image: comic.image,
        lastChapterSlug: chapter?.slug,
        lastChapterTitle: chapter?.title,
        timestamp: Date.now()
      };
      const filtered = prev.filter(h => h.slug !== comic.slug);
      const updated = [newItem, ...filtered].slice(0, 50);
      localStorage.setItem('fmc_history', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleBookmark = (comic: Comic) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.slug === comic.slug);
      let updated;
      if (exists) {
        updated = prev.filter(b => b.slug !== comic.slug);
      } else {
        updated = [{
          slug: comic.slug,
          title: comic.title,
          image: comic.image,
          timestamp: Date.now()
        }, ...prev];
      }
      localStorage.setItem('fmc_bookmarks', JSON.stringify(updated));
      return updated;
    });
  };

  const isBookmarked = (slug: string) => bookmarks.some(b => b.slug === slug);

  // Fetching Logic
  const fetchHome = async () => {
    setLoading(true);
    const res = await ComicAPI.getHome();
    if (res?.data) setHomeData(res.data);
    setLoading(false);
  };

  const fetchList = async (status: string, page: number = 1) => {
    setLoading(true);
    const res = await ComicAPI.getList(status, page);
    if (res?.data) {
      setListData(res.data);
      setPagination({ currentPage: page, hasNextPage: res.pagination?.hasNextPage || false });
    }
    setLoading(false);
    window.scrollTo(0, 0);
  };

  const fetchGenreList = async (genre: {title: string, slug: string}, page: number = 1) => {
    setLoading(true);
    setActiveGenre(genre);
    setView('GENRE_DETAIL');
    const res = await ComicAPI.getByGenre(genre.slug, page);
    if (res?.data) {
      setListData(res.data);
      setPagination({ currentPage: page, hasNextPage: res.pagination?.hasNextPage || false });
    }
    setLoading(false);
    window.scrollTo(0, 0);
  };

  const fetchSearch = async (query: string, page: number = 1) => {
    setLoading(true);
    const res = await ComicAPI.search(query, page);
    if (res?.data) {
      setListData(res.data);
      setPagination({ currentPage: page, hasNextPage: res.pagination?.hasNextPage || false });
    }
    setLoading(false);
    window.scrollTo(0, 0);
  };

  const executeAdvancedSearch = () => {
    setShowAdvancedSearch(false);
    if (filter.genre) {
      const g = allGenres.find(x => x.slug === filter.genre);
      if (g) {
        fetchGenreList(g, 1);
        return;
      }
    }
    if (filter.status && !filter.query) {
      setView(filter.status === 'Ongoing' ? 'ONGOING' : 'COMPLETED');
      fetchList(filter.status, 1);
      return;
    }
    const finalQuery = filter.query || searchQuery;
    if (finalQuery) {
      setView('SEARCH');
      fetchSearch(finalQuery, 1);
    }
  };

  const fetchDetail = async (slug: string) => {
    setLoading(true);
    const res = await ComicAPI.getDetail(slug);
    if (res?.data) {
      setComicDetail(res.data);
      saveToHistory(res.data);
    }
    setLoading(false);
    window.scrollTo(0, 0);
  };

  const fetchChapter = async (slug: string) => {
    setLoading(true);
    const res = await ComicAPI.getChapter(slug);
    if (res?.data) {
      setChapterDetail(res.data);
      if (comicDetail) saveToHistory(comicDetail, { slug, title: res.data.title });
    }
    setLoading(false);
    window.scrollTo(0, 0);
  };

  // Handlers
  const navigateToHome = () => { setView('HOME'); setShowAdvancedSearch(false); fetchHome(); };
  const navigateToOngoing = (p = 1) => { setView('ONGOING'); fetchList('Ongoing', p); };
  const navigateToCompleted = (p = 1) => { setView('COMPLETED'); fetchList('Completed', p); };
  const navigateToGenres = () => { setView('GENRES_LIST'); };
  const navigateToHistory = () => { setView('HISTORY'); setListData(history as any); };
  const navigateToBookmarks = () => { setView('BOOKMARKS'); setListData(bookmarks as any); };
  
  const navigateToDetail = (slug: string) => { 
    setCurrentSlug(slug); 
    setView('DETAIL'); 
    fetchDetail(slug); 
  };
  
  const navigateToChapter = (chSlug: string) => {
    setCurrentChapterSlug(chSlug);
    setView('READER');
    fetchChapter(chSlug);
  };

  const getTypeColor = (type?: string) => {
    if (!type) return 'bg-gray-600';
    const t = type.toLowerCase();
    if (t.includes('manga')) return 'bg-blue-600';
    if (t.includes('manhwa')) return 'bg-emerald-600';
    if (t.includes('manhua')) return 'bg-red-600';
    return 'bg-amber-600';
  };

  const renderComicCard = (comic: Comic, isGrid = false) => (
    <div 
      key={comic.slug} 
      onClick={() => navigateToDetail(comic.slug)}
      className={`relative group cursor-pointer transition-all duration-300 hover:-translate-y-2 animate-fade-in ${isGrid ? '' : 'min-w-[160px] md:min-w-[200px]'}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
        <img 
          src={comic.image} 
          alt={comic.title} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
           <span className="text-white text-[10px] font-bold line-clamp-2">{comic.title}</span>
        </div>
        <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider ${getTypeColor(comic.type)} shadow-lg`}>
          {comic.type || 'Comic'}
        </span>
        {comic.rating && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-amber-500 backdrop-blur-md">
            ⭐ {comic.rating}
          </span>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-semibold truncate group-hover:text-amber-500 transition-colors">{comic.title}</h3>
        <p className="text-[11px] text-gray-500 font-medium mt-0.5">{comic.chapter || comic.latestChapter || 'Read Now'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-0 selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-300 glass border-b border-white/5 ${view === 'READER' && !readerUIVisible ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={navigateToHome}>
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-black text-black group-hover:rotate-12 transition-transform shadow-lg shadow-amber-500/20">F</div>
              <h1 className="text-xl font-bold tracking-tight hidden sm:block">
                Fmc<span className="text-amber-500">Comic</span>
              </h1>
            </div>
            {view !== 'READER' && (
              <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-gray-400">
                <button onClick={navigateToHome} className={`hover:text-white transition ${view === 'HOME' ? 'text-amber-500' : ''}`}>Beranda</button>
                <button onClick={() => navigateToOngoing(1)} className={`hover:text-white transition ${view === 'ONGOING' ? 'text-amber-500' : ''}`}>Ongoing</button>
                <button onClick={() => navigateToCompleted(1)} className={`hover:text-white transition ${view === 'COMPLETED' ? 'text-amber-500' : ''}`}>Selesai</button>
                <button onClick={navigateToGenres} className={`hover:text-white transition ${view === 'GENRES_LIST' || view === 'GENRE_DETAIL' ? 'text-amber-500' : ''}`}>Genre</button>
              </div>
            )}
            {view === 'READER' && chapterDetail && (
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-px h-8 bg-white/10 hidden md:block"></div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white truncate max-w-[120px] md:max-w-sm">{comicDetail?.title}</span>
                  <span className="text-[10px] text-amber-500 font-bold">{chapterDetail.title}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {view === 'READER' ? (
              <div className="flex items-center gap-2">
                <select 
                  className="bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold px-3 py-1.5 focus:outline-none focus:border-amber-500 transition-colors"
                  value={currentChapterSlug || ''}
                  onChange={(e) => navigateToChapter(e.target.value)}
                >
                  {comicDetail?.chapters?.map(ch => (
                    <option key={ch.slug} value={ch.slug} className="bg-[#121212]">{ch.title}</option>
                  ))}
                </select>
                <button 
                  onClick={() => navigateToDetail(currentSlug!)}
                  className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"
                  title="Kembali ke Detail"
                >
                  <SquaresIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative hidden md:block">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Cari komik..." 
                    className="bg-white/5 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all w-48 focus:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeAdvancedSearch()}
                  />
                </div>
                <button 
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  className={`p-2.5 rounded-xl transition-all ${showAdvancedSearch ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'hover:bg-white/10 text-gray-400'}`}
                  title="Advanced Filter"
                >
                  <AdjustmentsIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Progress Bar (Reader Only) */}
        {view === 'READER' && (
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
             <div 
              className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] transition-all duration-300" 
              style={{ width: `${readProgress}%` }}
             ></div>
          </div>
        )}

        {/* Advanced Filter Panel */}
        {showAdvancedSearch && (
          <div className="absolute top-full left-0 w-full glass p-6 border-b border-white/5 animate-fade-in shadow-2xl z-[110]">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-3 block tracking-widest">Tipe Komik</label>
                  <div className="flex flex-wrap gap-2">
                    {['Manga', 'Manhwa', 'Manhua'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setFilter({...filter, type: filter.type === t ? '' : t})}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filter.type === t ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-3 block tracking-widest">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {['Ongoing', 'Completed'].map(s => (
                      <button 
                        key={s}
                        onClick={() => setFilter({...filter, status: filter.status === s ? '' : s})}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filter.status === s ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-3 block tracking-widest">Pilih Genre</label>
                  <select 
                    value={filter.genre}
                    onChange={(e) => setFilter({...filter, genre: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-amber-500 text-gray-300"
                  >
                    <option value="" className="bg-[#121212]">Semua Genre</option>
                    {allGenres.map(g => (
                      <option key={g.slug} value={g.slug} className="bg-[#121212]">{g.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex items-center gap-4">
                <input 
                  type="text"
                  placeholder="Masukkan kata kunci judul..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-amber-500 transition-all"
                  value={filter.query || searchQuery}
                  onChange={(e) => setFilter({...filter, query: e.target.value})}
                />
                <button 
                  onClick={executeAdvancedSearch}
                  className="bg-amber-500 text-black font-black px-8 py-3 rounded-xl hover:scale-105 transition-all shadow-lg shadow-amber-500/30"
                >
                  TERAPKAN FILTER
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className={`max-w-7xl mx-auto px-4 transition-all duration-300 ${view === 'READER' ? 'pt-0' : 'pt-24'}`}>
        
        {loading && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-amber-500 font-bold tracking-widest text-sm animate-pulse">MEMUAT...</p>
            </div>
          </div>
        )}

        {/* HOME VIEW */}
        {view === 'HOME' && homeData && (
          <div className="space-y-12 animate-fade-in">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FireIcon className="w-7 h-7 text-amber-500" />
                  Populer Hari Ini
                </h2>
              </div>
              <div className="flex overflow-x-auto gap-5 pb-6 hide-scrollbar">
                {homeData.hotUpdates.map(comic => renderComicCard(comic))}
              </div>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">Update Terbaru</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {homeData.latestReleases.slice(0, 15).map(comic => renderComicCard(comic, true))}
                </div>
              </div>
              <div className="space-y-8">
                <h2 className="text-2xl font-bold border-l-4 border-amber-500 pl-4">Proyek Unggulan</h2>
                <div className="grid grid-cols-1 gap-4">
                  {homeData.projectUpdates.map(comic => (
                    <div 
                      key={comic.slug}
                      onClick={() => navigateToDetail(comic.slug)}
                      className="flex gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors group"
                    >
                      <img src={comic.image} className="w-20 h-28 object-cover rounded-xl shadow-lg" alt="" />
                      <div className="flex flex-col justify-center overflow-hidden">
                        <h4 className="font-bold text-sm truncate group-hover:text-amber-500 transition-colors">{comic.title}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${getTypeColor(comic.type)}`}>
                            {comic.type || 'Proyek'}
                          </span>
                          <span className="text-amber-500 text-[10px] font-semibold">{comic.chapter || comic.latestChapter}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GENRES LIST VIEW */}
        {view === 'GENRES_LIST' && (
          <div className="animate-fade-in space-y-10">
            <div className="text-center space-y-4">
               <h2 className="text-4xl font-extrabold tracking-tight">Eksplorasi <span className="text-amber-500">Genre</span></h2>
               <p className="text-gray-500 max-w-lg mx-auto">Temukan petualangan barumu berdasarkan kategori yang kamu sukai.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allGenres.map((genre) => (
                <div 
                  key={genre.slug}
                  onClick={() => fetchGenreList(genre)}
                  className="group relative overflow-hidden aspect-[16/9] rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center cursor-pointer hover:bg-amber-500/10 hover:border-amber-500/30 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/5 group-hover:from-amber-500/10 transition-all"></div>
                  <span className="relative z-10 text-sm font-bold group-hover:text-amber-500 transition-colors group-hover:scale-110 duration-300">{genre.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {(['ONGOING', 'COMPLETED', 'SEARCH', 'HISTORY', 'BOOKMARKS', 'GENRE_DETAIL'].includes(view)) && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-bold border-l-4 border-amber-500 pl-4">
                {view === 'ONGOING' ? 'Komik Sedang Berjalan' : 
                 view === 'COMPLETED' ? 'Komik Sudah Tamat' : 
                 view === 'SEARCH' ? `Hasil Pencarian: ${searchQuery}` :
                 view === 'HISTORY' ? 'Riwayat Bacaan' : 
                 view === 'GENRE_DETAIL' ? `Genre: ${activeGenre?.title}` :
                 'Koleksi Tersimpan'}
              </h2>
            </div>
            {listData.length === 0 ? (
              <div className="py-32 text-center text-gray-500">
                <p className="text-lg">Tidak ada komik yang ditemukan.</p>
                <button onClick={navigateToHome} className="mt-4 px-6 py-2 bg-white/5 rounded-xl border border-white/10 text-sm hover:text-white transition">Kembali ke Beranda</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {listData.map(comic => renderComicCard(comic, true))}
                </div>
                {view !== 'HISTORY' && view !== 'BOOKMARKS' && (
                   <div className="flex justify-center items-center gap-8 mt-16 py-10">
                     <button 
                       disabled={pagination.currentPage === 1}
                       onClick={() => {
                         const p = pagination.currentPage - 1;
                         if (view === 'GENRE_DETAIL' && activeGenre) fetchGenreList(activeGenre, p);
                         else if (view === 'ONGOING') navigateToOngoing(p);
                         else if (view === 'COMPLETED') navigateToCompleted(p);
                         else fetchSearch(searchQuery, p);
                       }}
                       className="p-3 glass rounded-xl hover:bg-amber-500 hover:text-black transition-all disabled:opacity-20"
                     >
                       <ChevronLeftIcon />
                     </button>
                     <span className="bg-amber-500 text-black px-6 py-2 rounded-xl font-black text-lg shadow-lg">{pagination.currentPage}</span>
                     <button 
                       disabled={!pagination.hasNextPage}
                       onClick={() => {
                         const p = pagination.currentPage + 1;
                         if (view === 'GENRE_DETAIL' && activeGenre) fetchGenreList(activeGenre, p);
                         else if (view === 'ONGOING') navigateToOngoing(p);
                         else if (view === 'COMPLETED') navigateToCompleted(p);
                         else fetchSearch(searchQuery, p);
                       }}
                       className="p-3 glass rounded-xl hover:bg-amber-500 hover:text-black transition-all disabled:opacity-20"
                     >
                       <ChevronRightIcon />
                     </button>
                   </div>
                )}
              </>
            )}
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === 'DETAIL' && comicDetail && (
          <div className="animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row gap-12">
              <div className="md:w-1/3">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                  <img src={comicDetail.image} className="relative w-full rounded-3xl shadow-2xl border border-white/10" alt={comicDetail.title} />
                </div>
                <div className="grid grid-cols-1 gap-4 mt-8">
                   <button 
                     onClick={() => {
                       const last = history.find(h => h.slug === comicDetail.slug);
                       const startSlug = last?.lastChapterSlug || comicDetail.chapters?.[comicDetail.chapters.length - 1]?.slug;
                       if (startSlug) navigateToChapter(startSlug);
                     }}
                     className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl font-extrabold text-black text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                   >
                     <FireIcon className="w-6 h-6" />
                     {history.find(h => h.slug === comicDetail.slug)?.lastChapterTitle ? 'Lanjutkan Baca' : 'Baca Sekarang'}
                   </button>
                   <button 
                     onClick={() => toggleBookmark(comicDetail)}
                     className={`w-full py-4 rounded-2xl font-bold glass border-white/10 transition-all flex items-center justify-center gap-3 ${isBookmarked(comicDetail.slug) ? 'text-amber-500 border-amber-500/50' : 'text-white hover:bg-white/5'}`}
                   >
                     {isBookmarked(comicDetail.slug) ? <CheckIcon className="w-6 h-6" /> : <BookmarkIcon className="w-6 h-6" />}
                     {isBookmarked(comicDetail.slug) ? 'Tersimpan di Koleksi' : 'Tambahkan ke Koleksi'}
                   </button>
                </div>
              </div>
              <div className="md:w-2/3 space-y-8">
                <div>
                  <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight">{comicDetail.title}</h1>
                  <div className="flex flex-wrap gap-2">
                    {comicDetail.genres?.map(g => (
                      <span key={g.slug} onClick={() => fetchGenreList(g)} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:bg-amber-500 hover:text-black cursor-pointer transition-all">
                        {g.title}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 md:gap-8 bg-white/5 p-6 rounded-3xl border border-white/5">
                  <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Status</span><span className={`font-bold ${comicDetail.status === 'Ongoing' ? 'text-emerald-400' : 'text-blue-400'}`}>{comicDetail.status}</span></div>
                  <div className="w-px h-8 bg-white/10 my-auto"></div>
                  <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Rating</span><span className="font-bold text-amber-500">⭐ {comicDetail.rating}</span></div>
                  <div className="w-px h-8 bg-white/10 my-auto"></div>
                  <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Type</span><span className="font-bold">{comicDetail.type}</span></div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>Sinopsis</h3>
                  <p className="text-gray-400 leading-relaxed text-lg text-justify font-medium">{comicDetail.synopsis || "Tidak ada deskripsi untuk komik ini."}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                   <h3 className="text-xl font-bold mb-6 flex items-center justify-between">Daftar Chapter<span className="text-sm font-normal text-gray-500">{comicDetail.chapters?.length} Chapter</span></h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                     {comicDetail.chapters?.map(ch => (
                       <div key={ch.slug} onClick={() => navigateToChapter(ch.slug)} className="flex justify-between items-center p-4 rounded-xl bg-white/5 hover:bg-amber-500 hover:text-black cursor-pointer transition-all border border-white/5 group">
                         <span className="font-bold text-sm truncate">{ch.title}</span>
                         <ChevronRightIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* READER VIEW */}
        {view === 'READER' && chapterDetail && (
          <div className="relative -mx-4 animate-fade-in bg-black pb-32">
            {/* Main Content (Images) */}
            <div className="flex flex-col items-center pt-2 min-h-screen bg-[#0a0a0a]" onClick={() => setReaderUIVisible(!readerUIVisible)}>
              {chapterDetail.images.map((img, idx) => (
                <img key={idx} src={img} alt={`page ${idx}`} className="max-w-full md:max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border-b border-white/5" loading="lazy" />
              ))}
            </div>

            {/* End of Chapter Card */}
            <div className="max-w-2xl mx-auto px-4 mt-20 mb-20">
               <div className="glass p-10 rounded-3xl border border-white/10 text-center space-y-6">
                  <div className="text-gray-500 uppercase font-black text-xs tracking-widest">Kamu telah menyelesaikan</div>
                  <h3 className="text-xl font-bold text-amber-500">{chapterDetail.title}</h3>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    {chapterDetail.navigation.next ? (
                      <button 
                        onClick={() => navigateToChapter(chapterDetail.navigation.next!)}
                        className="flex-1 py-4 bg-amber-500 text-black rounded-2xl font-black hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20"
                      >
                        Chapter Selanjutnya
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    ) : (
                      <div className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-gray-500 italic">Sudah mencapai chapter terbaru</div>
                    )}
                    <button 
                      onClick={() => navigateToDetail(currentSlug!)}
                      className="flex-1 py-4 glass border-white/10 rounded-2xl font-bold hover:bg-white/5 transition-all"
                    >
                      Halaman Detail
                    </button>
                  </div>
               </div>
            </div>

            {/* Fixed Navigation Overlay */}
            <div className={`fixed bottom-10 left-0 w-full z-[150] px-4 flex justify-center pointer-events-none transition-transform duration-300 ${!readerUIVisible ? 'translate-y-32' : 'translate-y-0'}`}>
              <div className="glass p-3 rounded-2xl flex gap-3 items-center shadow-2xl border border-white/10 pointer-events-auto">
                <button 
                  disabled={!chapterDetail.navigation.prev}
                  onClick={(e) => { e.stopPropagation(); navigateToChapter(chapterDetail.navigation.prev!); }}
                  className="p-4 bg-white/5 rounded-xl hover:bg-amber-500 hover:text-black transition-all disabled:opacity-5 disabled:cursor-not-allowed group"
                  title="Chapter Sebelumnya"
                >
                  <ChevronLeftIcon className="w-5 h-5 group-active:-translate-x-1 transition-transform" />
                </button>
                
                <div className="px-6 flex flex-col items-center min-w-[140px]">
                   <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Navigasi Chapter</span>
                   <span className="text-xs font-bold text-amber-500 whitespace-nowrap">{readProgress}% Selesai</span>
                </div>

                <button 
                  disabled={!chapterDetail.navigation.next}
                  onClick={(e) => { e.stopPropagation(); navigateToChapter(chapterDetail.navigation.next!); }}
                  className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 text-black rounded-xl hover:scale-105 transition-all disabled:opacity-5 disabled:cursor-not-allowed group shadow-lg shadow-amber-500/20"
                  title="Chapter Selanjutnya"
                >
                  <ChevronRightIcon className="w-5 h-5 group-active:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className={`fixed bottom-0 w-full glass border-t border-white/5 flex justify-around items-center p-3 md:hidden z-[100] transition-transform duration-300 ${view === 'READER' && !readerUIVisible ? 'translate-y-full' : 'translate-y-0'}`}>
        <button onClick={navigateToHome} className={`flex flex-col items-center gap-1 transition-colors ${view === 'HOME' ? 'text-amber-500' : 'text-gray-500'}`}>
          <HomeIcon className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Beranda</span>
        </button>
        <button onClick={navigateToGenres} className={`flex flex-col items-center gap-1 transition-colors ${view === 'GENRES_LIST' || view === 'GENRE_DETAIL' ? 'text-amber-500' : 'text-gray-500'}`}>
          <SquaresIcon className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Genre</span>
        </button>
        <button onClick={() => navigateToOngoing(1)} className={`flex flex-col items-center gap-1 transition-colors ${view === 'ONGOING' ? 'text-amber-500' : 'text-gray-500'}`}>
          <FireIcon className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Hot</span>
        </button>
        <button onClick={navigateToHistory} className={`flex flex-col items-center gap-1 transition-colors ${view === 'HISTORY' ? 'text-amber-500' : 'text-gray-500'}`}>
          <HistoryIcon className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Riwayat</span>
        </button>
        <button onClick={navigateToBookmarks} className={`flex flex-col items-center gap-1 transition-colors ${view === 'BOOKMARKS' ? 'text-amber-500' : 'text-gray-500'}`}>
          <BookmarkIcon className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Koleksi</span>
        </button>
      </div>
    </div>
  );
};

export default App;
