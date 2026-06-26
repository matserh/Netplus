'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Banner } from '@/components/media/Banner';
import { MediaModal } from '@/components/media/MediaModal';
import { AIAssistant } from '@/components/ui/AIAssistant';
import { Skeleton } from '@/components/ui/skeleton';
import { Media, Genre, TMDBResponse } from '@/types/media';
import { API_CONFIG } from '@/types/media';
import { cn } from '@/lib/utils';

// Fetch helper
const fetchTMDB = async <T,>(endpoint: string): Promise<T | null> => {
  try {
    const res = await fetch(
      `${API_CONFIG.tmdb.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_CONFIG.tmdb.apiKey}&language=fr-FR`
    );
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
};

// Poster component with lazy loading
function Poster({ media, onClick }: { media: Media; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const title = media.title || media.name || '';
  
  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-card">
        {!loaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
        {media.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w342${media.poster_path}`}
            alt={title}
            className={`w-full h-full object-cover transition-all duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
            onLoad={() => setLoaded(true)}
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
          <div className="p-3 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100">
            <svg className="w-5 h-5 text-black fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// Horizontal infinite scroll section
function InfiniteRow({ title, endpoint, onItemClick }: { title: string; endpoint: string; onItemClick: (m: Media) => void }) {
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadMore();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);

    const data = await fetchTMDB<TMDBResponse<Media>>(`${endpoint}&page=${page}`);
    
    if (data?.results?.length) {
      setItems(prev => [...prev, ...data.results]);
      setPage(p => p + 1);
      setHasMore(page < (data.total_pages || 500));
    } else {
      setHasMore(false);
    }
    
    setLoading(false);
    loadingRef.current = false;
  }, [endpoint, page, hasMore]);

  // Detect scroll near end
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollWidth - scrollLeft - clientWidth < 500 && !loadingRef.current) {
        loadMore();
      }
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  return (
    <section className="py-4 md:py-6">
      <h2 className="text-lg sm:text-xl font-bold text-foreground px-6 sm:px-10 lg:px-16 mb-3 section-title">{title}</h2>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-6 sm:px-10 lg:px-16 pb-2">
        {items.map((item, i) => (
          <div key={`${item.id}-${i}`} className="flex-shrink-0 w-[130px] sm:w-[145px] md:w-[160px] lg:w-[175px]">
            <Poster media={item} onClick={() => onItemClick(item)} />
          </div>
        ))}
        {loading && (
          <div className="flex-shrink-0 w-[130px] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </section>
  );
}

// Vertical infinite grid
function InfiniteGrid({ onItemClick }: { onItemClick: (m: Media) => void }) {
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const nextPage = page + 1;
    
    // Load from multiple endpoints for variety
    const endpoints = [
      `/discover/movie?sort_by=popularity.desc&page=${nextPage}`,
      `/discover/tv?sort_by=popularity.desc&page=${nextPage}`,
    ];
    
    const results = await Promise.all(
      endpoints.map(ep => fetchTMDB<TMDBResponse<Media>>(ep))
    );
    
    const newItems: Media[] = [];
    results.forEach(data => {
      if (data?.results) {
        data.results.forEach(item => {
          if (!item.media_type) {
            item.media_type = data === results[0] ? 'movie' : 'tv';
          }
        });
        newItems.push(...data.results);
      }
    });
    
    // Shuffle for variety
    newItems.sort(() => Math.random() - 0.5);
    
    setItems(prev => [...prev, ...newItems]);
    setPage(nextPage);
    setLoading(false);
    loadingRef.current = false;
  }, [page]);

  // Initial load
  useEffect(() => {
    loadMore();
  }, []);

  // Intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadMore();
        }
      },
      { rootMargin: '300px' }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <section className="py-6">
      <h2 className="text-lg sm:text-xl font-bold text-foreground px-6 sm:px-10 lg:px-16 mb-4 section-title">
        À découvrir
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 px-6 sm:px-10 lg:px-16">
        {items.map((item, i) => (
          <Poster key={`${item.id}-${i}`} media={item} onClick={() => onItemClick(item)} />
        ))}
      </div>
      <div ref={loaderRef} className="py-8 flex justify-center">
        {loading && <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [bannerItems, setBannerItems] = useState<Media[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [searchResults, setSearchResults] = useState<Media[]>([]);
  const [searchTitle, setSearchTitle] = useState('');

  useEffect(() => {
    const init = async () => {
      const [now, movieGenres, tvGenres] = await Promise.all([
        fetchTMDB<TMDBResponse<Media>>('/movie/now_playing?region=FR'),
        fetchTMDB<{ genres: Genre[] }>('/genre/movie/list'),
        fetchTMDB<{ genres: Genre[] }>('/genre/tv/list'),
      ]);

      if (now?.results) {
        setBannerItems(now.results.filter(m => m.backdrop_path).slice(0, 5));
      }

      const genreMap = new Map<number, Genre>();
      movieGenres?.genres?.forEach(g => genreMap.set(g.id, g));
      tvGenres?.genres?.forEach(g => genreMap.set(g.id, g));
      setGenres(Array.from(genreMap.values()).sort((a, b) => a.name.localeCompare(b.name)));

      setLoading(false);
    };
    init();
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchTitle(`"${query}"`);
    const data = await fetchTMDB<TMDBResponse<Media>>(`/search/multi?query=${encodeURIComponent(query)}`);
    setSearchResults(data?.results?.filter(i => i.media_type && i.poster_path) || []);
  };

  const handleGenreSelect = async (id: string, name: string) => {
    setSearchTitle(name);
    const [m, t] = await Promise.all([
      fetchTMDB<TMDBResponse<Media>>(`/discover/movie?with_genres=${id}`),
      fetchTMDB<TMDBResponse<Media>>(`/discover/tv?with_genres=${id}`),
    ]);
    const combined = [
      ...(m?.results?.map(x => ({ ...x, media_type: 'movie' as const })) || []),
      ...(t?.results?.map(x => ({ ...x, media_type: 'tv' as const })) || []),
    ];
    setSearchResults(combined);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar
          genres={genres}
          onGenreSelect={handleGenreSelect}
          onAIClick={() => setIsAIOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      <main className={cn(
        "flex-1 min-h-screen overflow-x-hidden transition-all duration-300",
        isSidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
      )}>
        {/* Mobile Nav */}
        <div className="lg:hidden">
          <Navbar genres={genres} onSearch={handleSearch} onGenreSelect={handleGenreSelect} onAIClick={() => setIsAIOpen(true)} />
        </div>

        {/* Desktop Header */}
        <header className="hidden lg:flex h-14 items-center justify-between px-6 border-b border-border/50 bg-background/90 backdrop-blur sticky top-0 z-30">
          <h1 className="text-lg font-bold">
            {searchResults.length > 0 ? searchTitle : 'Accueil'}
          </h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-64 h-10 px-4 bg-muted/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={e => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)}
            />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
              <span className="text-sm font-bold text-black">U</span>
            </div>
          </div>
        </header>

        {/* Content */}
        {searchResults.length > 0 ? (
          <div className="p-6 sm:p-10 lg:p-16">
            <button onClick={() => setSearchResults([])} className="text-sm text-muted-foreground hover:text-primary mb-4">← Retour</button>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {searchResults.map((item, i) => (
                <Poster key={`${item.id}-${i}`} media={item} onClick={() => { setSelectedMedia(item); setIsModalOpen(true); }} />
              ))}
            </div>
          </div>
        ) : (
          <Fragment>
            <Banner items={bannerItems} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            
            {/* Infinite horizontal rows */}
            <InfiniteRow title="Au Cinéma" endpoint="/movie/now_playing?region=FR" onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow title="Tendances" endpoint="/trending/all/week" onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow title="Films Populaires" endpoint="/movie/popular" onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow title="Séries Populaires" endpoint="/tv/popular" onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow title="Films Mieux Notés" endpoint="/movie/top_rated" onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow title="Séries Mieux Notées" endpoint="/tv/top_rated" onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow title="Prochainement" endpoint="/movie/upcoming?region=FR" onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            
            {/* Infinite vertical grid */}
            <InfiniteGrid onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
          </Fragment>
        )}
      </main>

      <MediaModal media={selectedMedia} open={isModalOpen} onOpenChange={setIsModalOpen} />
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} onMediaClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
    </div>
  );
}
