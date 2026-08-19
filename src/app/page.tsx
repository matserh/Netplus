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
import { Media, Genre, TMDBResponse } from '@/types/media';
import { API_CONFIG } from '@/types/media';
import { cn } from '@/lib/utils';
import { useWatchHistory, WatchHistoryEntry } from '@/contexts/WatchHistoryContext';
import { Search, UserCircle, Play, Clock, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';
import { SmallProfileAvatar, ProfileLogo } from '@/components/ui/ProfileAvatar';
import { NotificationBell } from '@/components/ui/NotificationBell';

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

// Genre color derivation for no-poster fallback
function genreHue(genreIds: number[]): number {
  if (genreIds.length === 0) return 220; // default blue
  return (genreIds[0] * 37) % 360;
}

// Netflix-style poster — compact, with smooth hover scale
// Rich fallback for items without poster: genre-colored gradient + title
function Poster({ media, onClick }: { media: Media; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const title = media.title || media.name || '';
  const hasPoster = !!media.poster_path;
  const hue = genreHue(media.genre_ids || []);
  
  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-card/50 ring-1 ring-white/[0.04]">
        {hasPoster ? (
          <>
            {!loaded && <div className="absolute inset-0 bg-muted/30 animate-pulse" />}
            <img
              src={`https://image.tmdb.org/t/p/w342${media.poster_path}`}
              alt={title}
              className={`w-full h-full object-cover transition-all duration-300 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-110`}
              onLoad={() => setLoaded(true)}
              loading="lazy"
            />
          </>
        ) : (
          /* Genre-colored cinematic gradient — NOT a blank card */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2" style={{
            background: `linear-gradient(160deg, hsl(${hue}, 55%, 18%), hsl(${(hue + 50) % 360}, 45%, 12%))`,
          }}>
            <span className="text-3xl sm:text-4xl font-black text-white/15 select-none leading-none mb-1">
              {title.charAt(0).toUpperCase()}
            </span>
            <p className="text-[8px] sm:text-[9px] font-semibold text-white/50 text-center leading-tight line-clamp-3 max-w-[90%]">
              {title}
            </p>
            {media.vote_average > 0 && (
              <div className="flex items-center gap-0.5 mt-1.5">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span className="text-[8px] font-bold text-amber-400/70">{media.vote_average.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-[10px] font-medium text-white/90 truncate">{title}</p>
          </div>
        </div>
        {/* Play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
          <div className="p-1.5 rounded-full bg-white/20 backdrop-blur-sm scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-3.5 h-3.5 text-white fill-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Netflix-style horizontal row with scroll arrows
function InfiniteRow({ title, endpoint, onItemClick }: { title: string; endpoint: string; onItemClick: (m: Media) => void }) {
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
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

  const checkArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 20);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 20);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      checkArrows();
      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollWidth - scrollLeft - clientWidth < 500 && !loadingRef.current) {
        loadMore();
      }
    };

    el.addEventListener('scroll', onScroll);
    checkArrows();
    return () => el.removeEventListener('scroll', onScroll);
  }, [loadMore, checkArrows]);

  const scrollByAmount = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  // Compact Netflix-style skeletons
  const skeletons = Array.from({ length: 7 }, (_, i) => (
    <div key={`skel-${i}`} className="flex-shrink-0 w-[100px] sm:w-[115px] md:w-[130px] lg:w-[140px]">
      <div className="aspect-[2/3] rounded-md bg-muted/30 animate-pulse" />
    </div>
  ));

  return (
    <section className="relative py-2 md:py-3 group/section">
      {/* Section title — Netflix style */}
      <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground/90 px-4 sm:px-8 lg:px-12 mb-1.5 md:mb-2">
        {title}
      </h2>

      <div className="relative">
        {/* Left scroll arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scrollByAmount(-1)}
            className="absolute left-0 top-0 bottom-0 z-10 w-10 sm:w-12 bg-gradient-to-r from-background/90 to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200"
          >
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </button>
        )}

        {/* Right scroll arrow */}
        {showRightArrow && (
          <button
            onClick={() => scrollByAmount(1)}
            className="absolute right-0 top-0 bottom-0 z-10 w-10 sm:w-12 bg-gradient-to-l from-background/90 to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200"
          >
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>
        )}

        <div ref={scrollRef} className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide px-4 sm:px-8 lg:px-12 pb-1 min-h-[160px]">
          {items.length === 0 && loading ? (
            skeletons
          ) : error ? (
            <div className="flex items-center gap-3 py-6 px-2">
              <p className="text-xs text-muted-foreground/60">Impossible de charger</p>
              <button 
                onClick={() => setRetryCount(c => c + 1)}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Réessayer
              </button>
            </div>
          ) : (
            <>
              {items.map((item, i) => (
                <div key={`${item.id}-${i}`} className="flex-shrink-0 w-[100px] sm:w-[115px] md:w-[130px] lg:w-[140px] xl:w-[150px]">
                  <Poster media={item} onClick={() => onItemClick(item)} />
                </div>
              ))}
              {loading && (
                <div className="flex-shrink-0 w-[100px] flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// Continue Watching section — Netflix-style landscape cards
function ContinueWatching() {
  const router = useRouter();
  const { getContinueWatching } = useWatchHistory();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const items = getContinueWatching(12);
  if (items.length === 0) return null;

  return (
    <section className="py-2 md:py-3">
      <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 mb-1.5 md:mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground/90">Continuer à regarder</h2>
        </div>
        <Link
          href="/history"
          className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-0.5"
        >
          Tout voir
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide px-4 sm:px-8 lg:px-12 pb-1">
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
      className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[185px] lg:w-[200px] group cursor-pointer text-left"
    >
      <div className="relative aspect-video rounded-md overflow-hidden bg-muted/30 ring-1 ring-white/[0.04]">
        {!loaded && <div className="absolute inset-0 bg-muted/20 animate-pulse" />}
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
            <Play className="w-4 h-4 text-muted-foreground/20" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
          <div className="p-1.5 rounded-full bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
            <Play className="w-3.5 h-3.5 text-white fill-white" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
          <div className="h-full bg-primary rounded-r-full" style={{ width: `${Math.min(entry.progress, 100)}%` }} />
        </div>

        {/* TV Badge */}
        {entry.mediaType === 'tv' && entry.season && entry.episode && (
          <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/60 text-[8px] text-white/70 font-medium">
            S{entry.season}E{entry.episode}
          </div>
        )}
      </div>

      {/* Title — compact */}
      <p className="mt-1 text-[10px] sm:text-xs font-medium text-foreground/70 truncate group-hover:text-foreground transition-colors">{entry.title}</p>
    </button>
  );
}

// Vertical discovery grid — more columns, less gap
function InfiniteGrid({ profileType, onItemClick }: { profileType?: string; onItemClick: (m: Media) => void }) {
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // Build profile-aware discover endpoints (consistent with ProfileContext)
  const getProfileParams = () => {
    switch (profileType) {
      case 'JEUNESSE':
        return '&certification_country=FR&certification.lte=12&with_genres=16|10751|14&without_genres=27|53|80';
      case 'FRENESIE':
        return '&with_genres=28|18|27|14|878';
      default:
        return '';
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const nextPage = page + 1;
    const params = getProfileParams();
    
    const endpoints = [
      `/discover/movie?sort_by=popularity.desc&page=${nextPage}${params}`,
      `/discover/tv?sort_by=popularity.desc&page=${nextPage}${params}`,
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
    
    newItems.sort(() => Math.random() - 0.5);
    
    setItems(prev => [...prev, ...newItems]);
    setPage(nextPage);
    setLoading(false);
    loadingRef.current = false;
  }, [page, profileType]);

  useEffect(() => {
    loadMore();
  }, []);

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
    <section className="py-3 md:py-4">
      <h2 className="text-sm sm:text-base md:text-lg font-bold text-foreground/90 px-4 sm:px-8 lg:px-12 mb-2">
        À découvrir
      </h2>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-9 gap-1.5 sm:gap-2 px-4 sm:px-8 lg:px-12">
        {items.map((item, i) => (
          <Poster key={`${item.id}-${i}`} media={item} onClick={() => onItemClick(item)} />
        ))}
      </div>
      <div ref={loaderRef} className="py-6 flex justify-center">
        {loading && <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
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

  // Profile-aware content filtering
  const { profile, getBannerEndpoint, getNowPlayingEndpoint, getUpcomingEndpoint, getDiscoverEndpoint, getTrendingEndpoint, getPopularEndpoint, getTopRatedEndpoint } = useProfile();
  const [profileKey, setProfileKey] = useState(0); // increment to force row re-fetch on profile change

  useEffect(() => {
    const init = async () => {
      const [now, movieGenres, tvGenres] = await Promise.all([
        fetchTMDB<TMDBResponse<Media>>(getBannerEndpoint()),
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
    // When profile changes, re-fetch banner and bump row key
    setProfileKey(k => k + 1);
  }, [profile?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchTitle(`"${query}"`);
    const data = await fetchTMDB<TMDBResponse<Media>>(`/search/multi?query=${encodeURIComponent(query)}`);
    setSearchResults(data?.results?.filter(i => i.media_type && i.poster_path) || []);
  };

  const handleGenreSelect = async (id: string, name: string) => {
    setSearchTitle(name);
    // Apply profile filters on top of genre selection
    const base = profile?.type === 'JEUNESSE' ? '&certification_country=FR&certification.lte=12&without_genres=27,53,80' : '';
    const [m, t] = await Promise.all([
      fetchTMDB<TMDBResponse<Media>>(`/discover/movie?with_genres=${id}${base}`),
      fetchTMDB<TMDBResponse<Media>>(`/discover/tv?with_genres=${id}${base}`),
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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar — desktop only */}
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
        {/* Mobile Nav — overlaid on banner like Netflix */}
        <div className="lg:hidden">
          <Navbar genres={genres} onSearch={handleSearch} onGenreSelect={handleGenreSelect} onAIClick={() => setIsAIOpen(true)} />
        </div>

        {/* Desktop Header — Netflix-style slim bar */}
        <header className="hidden lg:flex h-12 items-center justify-between px-4 lg:px-12 sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/[0.08]">
          <h1 className="text-sm font-semibold text-white tracking-wide">
            {searchResults.length > 0 ? searchTitle : 'Accueil'}
          </h1>
          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
              <input
                type="text"
                placeholder="Titres, genres, personnes..."
                className="w-56 xl:w-64 h-8 pl-8 pr-3 bg-muted/30 border border-white/[0.06] rounded-md text-xs placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:bg-muted/50 transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)}
              />
            </div>

            {/* Notifications */}
            <NotificationBell />

            {/* User Profile — shows custom/official logo or profile avatar */}
            <Link href="/profiles" className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-primary/30 hover:ring-primary/60 transition-all">
              <ProfileLogo
                profileType={profile?.type}
                className="w-full h-full"
                fallback={(
                  <div className="w-full h-full bg-gradient-to-br from-primary/70 to-amber-500/70 flex items-center justify-center">
                    <UserCircle className="w-4 h-4 text-black" />
                  </div>
                )}
              />
            </Link>
          </div>
        </header>

        {/* Content */}
        {searchResults.length > 0 ? (
          <div className="px-4 sm:px-8 lg:px-12 py-4">
            <button onClick={() => setSearchResults([])} className="text-xs text-muted-foreground/60 hover:text-primary mb-4 flex items-center gap-1 group">
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Retour
            </button>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5 sm:gap-2">
              {searchResults.map((item, i) => (
                <Poster key={`${item.id}-${i}`} media={item} onClick={() => { setSelectedMedia(item); setIsModalOpen(true); }} />
              ))}
            </div>
          </div>
        ) : (
          <Fragment>
            <Banner items={bannerItems} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />

            {/* Continue Watching */}
            <ContinueWatching />
            
            {/* Netflix-style horizontal rows */}
            <InfiniteRow key={`cinema-${profileKey}`} title="Au Cinéma" endpoint={getNowPlayingEndpoint()} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow key={`trending-${profileKey}`} title="Tendances" endpoint={getTrendingEndpoint()} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow key={`pop-movie-${profileKey}`} title="Films Populaires" endpoint={getPopularEndpoint('movie')} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow key={`pop-tv-${profileKey}`} title="Séries Populaires" endpoint={getPopularEndpoint('tv')} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow key={`top-movie-${profileKey}`} title="Films Mieux Notés" endpoint={getTopRatedEndpoint('movie')} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow key={`top-tv-${profileKey}`} title="Séries Mieux Notées" endpoint={getTopRatedEndpoint('tv')} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            <InfiniteRow key={`upcoming-${profileKey}`} title="Prochainement" endpoint={getUpcomingEndpoint()} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
            
            {/* Discovery grid */}
            <InfiniteGrid key={`grid-${profileKey}`} profileType={profile?.type} onItemClick={m => { setSelectedMedia(m); setIsModalOpen(true); }} />
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
