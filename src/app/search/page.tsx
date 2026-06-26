'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Search, X, TrendingUp, Film, Clock, ArrowRight } from 'lucide-react';
import { Media, Genre, TMDBResponse, API_CONFIG } from '@/types/media';
import { useWatchHistory } from '@/contexts/WatchHistoryContext';

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

function Poster({ media, onClick }: { media: Media; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const title = media.title || media.name || '';

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-[2/3] rounded-md sm:rounded-lg overflow-hidden bg-card ring-1 ring-white/5">
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
          <div className="p-2.5 sm:p-3 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-black fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        {media.media_type && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-primary/90 text-[9px] text-black font-bold">
            {media.media_type === 'movie' ? 'FILM' : 'SÉRIE'}
          </div>
        )}
      </div>
      <p className="mt-1 text-xs font-medium text-foreground/70 truncate group-hover:text-foreground transition-colors">
        {title}
      </p>
    </div>
  );
}

function TrendingPill({ media, onClick }: { media: Media; onClick: () => void }) {
  const title = media.title || media.name || '';
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card/60 border border-border/30 hover:border-primary/30 hover:bg-card/80 transition-all group w-full text-left"
    >
      <div className="flex-shrink-0 w-10 h-14 rounded-md overflow-hidden bg-muted">
        {media.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w92${media.poster_path}`}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {media.vote_average > 0 && (
            <span className="text-[10px] text-primary/70">★ {media.vote_average.toFixed(1)}</span>
          )}
          <span className="text-[10px] text-muted-foreground/40">
            {media.media_type === 'movie' ? 'Film' : 'Série'}
          </span>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary/50 transition-colors flex-shrink-0" />
    </button>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const { status } = useSession();
  const { history } = useWatchHistory();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Media[]>([]);
  const [trending, setTrending] = useState<Media[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const load = async () => {
      const [trendData, movieGenres, tvGenres] = await Promise.all([
        fetchTMDB<TMDBResponse<Media>>('/trending/all/week'),
        fetchTMDB<{ genres: Genre[] }>('/genre/movie/list'),
        fetchTMDB<{ genres: Genre[] }>('/genre/tv/list'),
      ]);

      if (trendData?.results) {
        setTrending(trendData.results.filter(m => m.poster_path).slice(0, 10));
      }

      const genreMap = new Map<number, Genre>();
      movieGenres?.genres?.forEach(g => genreMap.set(g.id, g));
      tvGenres?.genres?.forEach(g => genreMap.set(g.id, g));
      setGenres(Array.from(genreMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    };
    load();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    const data = await fetchTMDB<TMDBResponse<Media>>(
      `/search/multi?query=${encodeURIComponent(searchQuery.trim())}`
    );
    setResults(data?.results?.filter(i => i.media_type && (i.poster_path || i.backdrop_path)) || []);
    setLoading(false);
  }, []);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(value), 400);
  };

  const handleGenreSearch = async (genreId: string, genreName: string) => {
    setQuery(genreName);
    setLoading(true);
    setSearched(true);
    const [m, t] = await Promise.all([
      fetchTMDB<TMDBResponse<Media>>(`/discover/movie?with_genres=${genreId}`),
      fetchTMDB<TMDBResponse<Media>>(`/discover/tv?with_genres=${genreId}`),
    ]);
    const combined = [
      ...(m?.results?.map(x => ({ ...x, media_type: 'movie' as const })) || []),
      ...(t?.results?.map(x => ({ ...x, media_type: 'tv' as const })) || []),
    ].filter(i => i.poster_path);
    setResults(combined);
    setLoading(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const recentHistory = history.slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Search Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="px-4 sm:px-6 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Rechercher un film, une série..."
              className="w-full h-12 pl-12 pr-12 bg-muted/40 border border-border/40 rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-4">
        {searched ? (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-foreground">
                    {results.length} résultat{results.length > 1 ? 's' : ''}
                  </h2>
                  <span className="text-xs text-muted-foreground/40">pour &quot;{query}&quot;</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                  {results.map((item, i) => (
                    <Poster
                      key={`${item.id}-${i}`}
                      media={item}
                      onClick={() => router.push(`/watch?id=${item.id}&type=${item.media_type}`)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <h3 className="text-lg font-bold text-foreground/60 mb-2">Aucun résultat</h3>
                <p className="text-sm text-muted-foreground/40 text-center max-w-md">
                  Essayez avec d&apos;autres mots-clés ou explorez les tendances ci-dessous.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recent History */}
            {recentHistory.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary/60" />
                  <h2 className="text-sm font-bold text-foreground/80">Récemment regardés</h2>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
                  {recentHistory.map((entry) => (
                    <button
                      key={`${entry.id}-${entry.mediaType}`}
                      onClick={() => router.push(`/watch?id=${entry.id}&type=${entry.mediaType}`)}
                      className="flex-shrink-0 w-28 group"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-card ring-1 ring-white/5">
                        {entry.posterPath && (
                          <img
                            src={`https://image.tmdb.org/t/p/w342${entry.posterPath}`}
                            alt={entry.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        )}
                        {entry.mediaType === 'tv' && entry.season && entry.episode && (
                          <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/70 text-[8px] text-white/80 font-medium">
                            S{entry.season}E{entry.episode}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] font-medium text-foreground/50 truncate group-hover:text-foreground/80 transition-colors">
                        {entry.title}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Trending */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary/60" />
                <h2 className="text-sm font-bold text-foreground/80">Tendances de la semaine</h2>
              </div>
              <div className="space-y-1.5">
                {trending.slice(0, 8).map((item) => (
                  <TrendingPill
                    key={item.id}
                    media={item}
                    onClick={() => router.push(`/watch?id=${item.id}&type=${item.media_type || 'movie'}`)}
                  />
                ))}
              </div>
            </section>

            {/* Genre Quick Access */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Film className="w-4 h-4 text-primary/60" />
                <h2 className="text-sm font-bold text-foreground/80">Explorer par genre</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {genres.slice(0, 16).map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => handleGenreSearch(String(genre.id), genre.name)}
                    className="px-3.5 py-1.5 rounded-full bg-card/60 border border-border/30 text-xs font-medium text-foreground/50 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
