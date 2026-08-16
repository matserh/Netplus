'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { Banner } from '@/components/media/Banner';
import { MediaModal } from '@/components/media/MediaModal';
import { AIAssistant } from '@/components/ui/AIAssistant';
import { Skeleton } from '@/components/ui/skeleton';
import { Media, Genre, TMDBResponse } from '@/types/media';
import { API_CONFIG } from '@/types/media';
import { cn } from '@/lib/utils';
import { useWatchHistory, WatchHistoryEntry } from '@/contexts/WatchHistoryContext';
import { Search, UserCircle, Bell, Play, Clock } from 'lucide-react';

// Fetch helper
const fetchTMDB = async <T,>(endpoint: string): Promise<T | null> => {
  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const res = await fetch(
      `${API_CONFIG.tmdb.baseUrl}${endpoint}${separator}api_key=${API_CONFIG.tmdb.apiKey}&language=fr-FR`
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
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);

    const pageSeparator = endpoint.includes('?') ? '&' : '?';
    const data = await fetchTMDB<TMDBResponse<Media>>(`${endpoint}${pageSeparator}page=${page}`);
    
    if (data?.results?.length) {
      setItems(prev => [...prev, ...data.results]);
      setPage(p => p + 1);
      setHasMore(page < (data.total_pages || 500));
    } else {
      if (items.length === 0) {
        setError(true);
      }
      setHasMore(false);
    }
    
    setLoading(false);
    loadingRef.current = false;
  }, [endpoint, page, hasMore, items.length]);

  useEffect(() => {
    loadMore();
  }, [retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Skeleton placeholders for initial load
  const skeletons = Array.from({ length: 8 }, (_, i) => (
    <div key={`skel-${i}`} className="flex-shrink-0 w-[130px] sm:w-[145px] md:w-[160px] lg:w-[175px]">
      <div className="aspect-[2/3] rounded-lg bg-muted/40 animate-pulse" />
    </div>
  ));

  return (
    <section className="py-4 md:py-6">
      <h2 className="text-lg sm:text-xl font-bold text-foreground px-6 sm:px-10 lg:px-16 mb-3 section-title">{title}</h2>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-6 sm:px-10 lg:px-16 pb-2 min-h-[180px]">
        {items.length === 0 && loading ? (
          // Show skeletons while loading
          skeletons
        ) : error ? (
          // Show retry button on error
          <div className="flex items-center gap-3 py-8">
            <p className="text-sm text-muted-foreground/60">Impossible de charger</p>
            <button 
              onClick={() => setRetryCount(c => c + 1)}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Réessayer
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </section>
  );
}

// Continue Watching section — shows in-progress items from history
function ContinueWatching() {
  const router = useRouter();
  const { getContinueWatching } = useWatchHistory();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const items = getContinueWatching(12);
  if (items.length === 0) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="flex items-center justify-between px-6 sm:px-10 lg:px-16 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-lg sm:text-xl font-bold text-foreground section-title">Continuer à regarder</h2>
        </div>
        <Link
          href="/history"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          Tout voir
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-6 sm:px-10 lg:px-16 pb-2">
        {items.map((entry) => (
          <ContinueWatchingCard key={`${entry.id}-${entry.mediaType}`} entry={entry} onPlay={() => {
            router.push(`/watch/${entry.mediaType}/${entry.id}`);
          }} />
        ))}
      </div>
    </section>
  );
}

function ContinueWatchingCard({ entry, onPlay }: { entry: WatchHistoryEntry; onPlay: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const imgUrl = entry.backdropPath
    ? `https://image.tmdb.org/t/p/w500${entry.backdropPath}`
    : entry.posterPath
    ? `https://image.tmdb.org/t/p/w342${entry.posterPath}`
    : null;

  return (
    <button
      onClick={onPlay}
      className="flex-shrink-0 w-[180px] sm:w-[200px] md:w-[220px] lg:w-[240px] group cursor-pointer text-left"
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        {!loaded && <div className="absolute inset-0 bg-muted/40 animate-pulse" />}
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={entry.title}
            className={`w-full h-full object-cover transition-all duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
            onLoad={() => setLoaded(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-6 h-6 text-muted-foreground/20" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
          <div className="p-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100">
            <Play className="w-4 h-4 text-black fill-current" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
          <div className="h-full bg-primary rounded-r-full" style={{ width: `${Math.min(entry.progress, 100)}%` }} />
        </div>

        {/* TV Badge */}
        {entry.mediaType === 'tv' && entry.season && entry.episode && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white/80 font-medium">
            S{entry.season}E{entry.episode}
          </div>
        )}

        {/* Progress % badge */}
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-primary font-bold">
          {entry.progress}%
        </div>
      </div>

      {/* Title */}
      <div className="mt-1.5">
        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{entry.title}</p>
        {entry.mediaType === 'tv' && entry.episodeTitle && (
          <p className="text-[10px] text-muted-foreground/50 truncate">{entry.episodeTitle}</p>
        )}
      </div>
    </button>
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
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar — fixed, no page scroll */}
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
        "flex-1 h-screen overflow-y-auto overflow-x-hidden transition-all duration-300",
        isSidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
      )}>
        {/* Mobile Nav */}
        <div className="lg:hidden">
          <Navbar genres={genres} onSearch={handleSearch} onGenreSelect={handleGenreSelect} onAIClick={() => setIsAIOpen(true)} />
        </div>

        {/* Desktop Header */}
        <header className="hidden lg:flex h-14 items-center justify-between px-6 border-b border-border/30 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
          <h1 className="text-lg font-bold tracking-tight">
            {searchResults.length > 0 ? searchTitle : 'Accueil'}
          </h1>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Rechercher un film, une série..."
                className="w-72 h-9 pl-9 pr-4 bg-muted/40 border border-border/30 rounded-full text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-muted/60 transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)}
              />
            </div>

            {/* Notifications */}
            <button className="h-9 w-9 rounded-full bg-muted/40 border border-border/30 flex items-center justify-center hover:bg-muted/60 transition-colors relative">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
            </button>

            {/* User Profile */}
            <Link href="/profiles" className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-amber-500/80 border border-primary/30 flex items-center justify-center hover:from-primary hover:to-amber-500 hover:scale-105 transition-all shadow-sm shadow-primary/10">
              <UserCircle className="w-5 h-5 text-black" />
            </Link>
          </div>
        </header>

        {/* Content */}
        {searchResults.length > 0 ? (
          <div className="p-6 sm:p-8 lg:p-10">
            <button onClick={() => setSearchResults([])} className="text-sm text-muted-foreground hover:text-primary mb-6 flex items-center gap-1 group">
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Retour
            </button>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {searchResults.map((item, i) => (
                <Poster key={`${item.id}-${i}`} media={item} onClick={() => { setSelectedMedia(item); setIsModalOpen(true); }} />
              ))}
            </div>
          </div>
        ) : (
          <Fragment>
            <Banner items={bannerItems} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />

            {/* Continue Watching — from watch history */}
            <ContinueWatching />
            
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

        {/* Spacer for bottom nav on mobile/tablet */}
        <div className="h-20 lg:hidden" />
      </main>

      {/* Mobile/Tablet Bottom Navigation */}
      <div className="lg:hidden">
        <BottomNavBar />
      </div>

      <MediaModal media={selectedMedia} open={isModalOpen} onOpenChange={setIsModalOpen} />
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} onMediaClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
    </div>
  );
}
