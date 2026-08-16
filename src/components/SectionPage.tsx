'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { MediaModal } from '@/components/media/MediaModal';
import { AIAssistant } from '@/components/ui/AIAssistant';
import { Media, Genre, TMDBResponse } from '@/types/media';
import { API_CONFIG } from '@/types/media';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

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

// Poster component
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

interface SectionPageProps {
  title: string;
  endpoint: string;
  icon: React.ReactNode;
}

export function SectionPage({ title, endpoint, icon }: SectionPageProps) {
  const [items, setItems] = useState<Media[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchResults, setSearchResults] = useState<Media[]>([]);
  const [searchTitle, setSearchTitle] = useState('');
  const loaderRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // Load genres
  useEffect(() => {
    const init = async () => {
      const [movieGenres, tvGenres] = await Promise.all([
        fetchTMDB<{ genres: Genre[] }>('/genre/movie/list'),
        fetchTMDB<{ genres: Genre[] }>('/genre/tv/list'),
      ]);
      const genreMap = new Map<number, Genre>();
      movieGenres?.genres?.forEach(g => genreMap.set(g.id, g));
      tvGenres?.genres?.forEach(g => genreMap.set(g.id, g));
      setGenres(Array.from(genreMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    };
    init();
  }, []);

  // Load items
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);

    const pageSep = endpoint.includes('?') ? '&' : '?';
    const data = await fetchTMDB<TMDBResponse<Media>>(`${endpoint}${pageSep}page=${page}`);
    
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

  useEffect(() => {
    loadMore();
  }, []);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

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
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Accueil
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <div className="flex items-center gap-2">
              {icon}
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-64 h-10 px-4 bg-muted/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={e => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)}
            />
          </div>
        </header>

        {/* Content */}
        <div className="p-6 sm:p-10 lg:p-16">
          {/* Mobile title */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Accueil
            </Link>
            <span className="text-muted-foreground/30">/</span>
            <div className="flex items-center gap-2">
              {icon}
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
            </div>
          </div>

          {searchResults.length > 0 ? (
            <>
              <button onClick={() => setSearchResults([])} className="text-sm text-muted-foreground hover:text-primary mb-4">← Retour</button>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
                {searchResults.map((item, i) => (
                  <Poster key={`${item.id}-${i}`} media={item} onClick={() => { setSelectedMedia(item); setIsModalOpen(true); }} />
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
              {items.map((item, i) => (
                <Poster key={`${item.id}-${i}`} media={item} onClick={() => { setSelectedMedia(item); setIsModalOpen(true); }} />
              ))}
            </div>
          )}
          <div ref={loaderRef} className="py-8 flex justify-center">
            {loading && <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
          </div>
          {!hasMore && items.length > 0 && (
            <p className="text-center text-sm text-muted-foreground/40 pt-4">— Fin des résultats —</p>
          )}
        </div>

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
