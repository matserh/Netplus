'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useWatchHistory, WatchHistoryEntry } from '@/contexts/WatchHistoryContext';
import { useEffect, useState } from 'react';
import { Trash2, Play, Film, Tv, Clock, Filter, LayoutGrid, List, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { useGuest } from '@/contexts/GuestContext';

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}min ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
}

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

type FilterType = 'all' | 'movie' | 'tv';
type SortType = 'recent' | 'progress' | 'rating';
type ViewMode = 'grid' | 'list';

function HistoryCard({ entry, onPlay, onRemove }: {
  entry: WatchHistoryEntry;
  onPlay: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-card/50 border border-border/30 hover:border-border/60 transition-all group">
      {/* Thumbnail */}
      <button onClick={onPlay} className="flex-shrink-0 w-28 sm:w-36 md:w-44 aspect-video rounded-lg overflow-hidden relative bg-muted cursor-pointer">
        {entry.backdropPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w500${entry.backdropPath}`}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : entry.posterPath ? (
          <img
            src={`https://image.tmdb.org/t/p/w342${entry.posterPath}`}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {entry.mediaType === 'movie' ? <Film className="w-6 h-6 text-muted-foreground/20" /> : <Tv className="w-6 h-6 text-muted-foreground/20" />}
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
          <div className="p-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100">
            <Play className="w-4 h-4 text-black fill-current" />
          </div>
        </div>

        {/* Progress bar on thumbnail */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div className="h-full bg-primary" style={{ width: `${Math.min(entry.progress, 100)}%` }} />
        </div>

        {/* Badge */}
        {entry.mediaType === 'tv' && entry.season && entry.episode && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white/80 font-medium">
            S{entry.season}E{entry.episode}
          </div>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
              entry.mediaType === 'movie' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {entry.mediaType === 'movie' ? 'FILM' : 'SÉRIE'}
            </span>
            {entry.voteAverage && (
              <span className="text-[10px] text-muted-foreground/40">★ {entry.voteAverage.toFixed(1)}</span>
            )}
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">{entry.title}</h3>
          {entry.mediaType === 'tv' && entry.episodeTitle && (
            <p className="text-xs text-muted-foreground/50 truncate">
              S{entry.season}E{entry.episode} — {entry.episodeTitle}
            </p>
          )}
          {entry.overview && (
            <p className="text-[11px] text-muted-foreground/30 line-clamp-1 mt-1 hidden sm:block">{entry.overview}</p>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeDate(entry.lastWatched)}</span>
          </div>
          {entry.progress > 0 && (
            <span className="text-[10px] text-primary/50">{entry.progress}% vu</span>
          )}
          {entry.timestamp > 0 && (
            <span className="text-[10px] text-muted-foreground/30">
              Arrêté à {formatTime(entry.timestamp)}
            </span>
          )}
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="flex-shrink-0 self-center p-2 rounded-lg text-muted-foreground/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function HistoryGridCard({ entry, onPlay, onRemove }: {
  entry: WatchHistoryEntry;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const imgUrl = entry.backdropPath
    ? `https://image.tmdb.org/t/p/w500${entry.backdropPath}`
    : entry.posterPath
    ? `https://image.tmdb.org/t/p/w342${entry.posterPath}`
    : null;

  return (
    <div className="group relative cursor-pointer" onClick={onPlay}>
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={entry.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {entry.mediaType === 'movie' ? <Film className="w-6 h-6 text-muted-foreground/20" /> : <Tv className="w-6 h-6 text-muted-foreground/20" />}
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
          <div className="p-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100">
            <Play className="w-4 h-4 text-black fill-current" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div className="h-full bg-primary" style={{ width: `${Math.min(entry.progress, 100)}%` }} />
        </div>

        {/* TV Badge */}
        {entry.mediaType === 'tv' && entry.season && entry.episode && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white/80 font-medium">
            S{entry.season}E{entry.episode}
          </div>
        )}

        {/* Progress badge */}
        {entry.progress > 0 && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-primary font-bold">
            {entry.progress}%
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white/40 hover:text-red-400 hover:bg-red-400/20 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Title */}
      <div className="mt-1.5">
        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{entry.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[9px] font-bold ${
            entry.mediaType === 'movie' ? 'text-primary/60' : 'text-blue-400/60'
          }`}>
            {entry.mediaType === 'movie' ? 'FILM' : 'SÉRIE'}
          </span>
          {entry.voteAverage && (
            <span className="text-[9px] text-muted-foreground/30">★ {entry.voteAverage.toFixed(1)}</span>
          )}
          <span className="text-[9px] text-muted-foreground/20">{formatRelativeDate(entry.lastWatched)}</span>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <HistoryContent />;
}

function HistoryContent() {
  const router = useRouter();
  const sessionData = useSession() || {};
  const { data: session, status } = sessionData;
  const { history, removeFromHistory, clearHistory } = useWatchHistory();
  const { isGuest, enterGuestMode } = useGuest();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated' && !isGuest) { enterGuestMode(); }
  }, [status, isGuest, enterGuestMode]);

  // Filter and sort
  const filteredHistory = history
    .filter(entry => {
      if (filter === 'all') return true;
      return entry.mediaType === filter;
    })
    .sort((a, b) => {
      if (sort === 'recent') return b.lastWatched - a.lastWatched;
      if (sort === 'progress') return b.progress - a.progress;
      if (sort === 'rating') return (b.voteAverage || 0) - (a.voteAverage || 0);
      return 0;
    });

  // Stats
  const movieCount = history.filter(h => h.mediaType === 'movie').length;
  const tvCount = history.filter(h => h.mediaType === 'tv').length;
  const avgProgress = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + h.progress, 0) / history.length)
    : 0;
  const totalWatchTime = history.reduce((sum, h) => sum + h.timestamp, 0);

  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-16 h-14">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Historique</h1>
            <span className="text-xs text-muted-foreground/40">({history.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center bg-muted/30 rounded-lg border border-border/20 p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground')}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-primary/15 text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground')}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/50 hover:text-red-400 hover:bg-red-400/5 border border-border/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tout effacer</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-10 lg:px-16 py-6">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-muted-foreground/20" />
            </div>
            <h2 className="text-xl font-bold text-foreground/60 mb-2">Aucun historique</h2>
            <p className="text-sm text-muted-foreground/40 text-center max-w-md">
              Les contenus que vous regardez apparaîtront ici. Vous pourrez reprendre là où vous vous êtes arrêté.
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              Découvrir des contenus
            </button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-card/50 border border-border/20">
                <div className="flex items-center gap-2 mb-1">
                  <Film className="w-3.5 h-3.5 text-primary/60" />
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Films</span>
                </div>
                <p className="text-lg font-bold text-foreground">{movieCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-card/50 border border-border/20">
                <div className="flex items-center gap-2 mb-1">
                  <Tv className="w-3.5 h-3.5 text-blue-400/60" />
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Séries</span>
                </div>
                <p className="text-lg font-bold text-foreground">{tvCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-card/50 border border-border/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-primary/60" />
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Progrès moyen</span>
                </div>
                <p className="text-lg font-bold text-primary">{avgProgress}%</p>
              </div>
              <div className="p-3 rounded-xl bg-card/50 border border-border/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-primary/60" />
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Temps total</span>
                </div>
                <p className="text-lg font-bold text-foreground">{formatTime(totalWatchTime)}</p>
              </div>
            </div>

            {/* Filters & Sort */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Type filter */}
              <div className="flex items-center gap-1">
                {(['all', 'movie', 'tv'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      filter === f
                        ? 'bg-primary text-black'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                    )}
                  >
                    {f === 'all' ? 'Tout' : f === 'movie' ? 'Films' : 'Séries'}
                  </button>
                ))}
              </div>

              <span className="text-white/10 mx-1">|</span>

              {/* Sort */}
              <div className="flex items-center gap-1">
                {([
                  { key: 'recent' as SortType, label: 'Récent' },
                  { key: 'progress' as SortType, label: 'Progrès' },
                  { key: 'rating' as SortType, label: 'Note' },
                ]).map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      sort === s.key
                        ? 'bg-primary/15 text-primary border border-primary/20'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 border border-transparent'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content list/grid */}
            {filteredHistory.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground/40">Aucun résultat pour ce filtre</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-2 sm:space-y-3">
                {filteredHistory.map((entry) => (
                  <HistoryCard
                    key={`${entry.id}-${entry.mediaType}`}
                    entry={entry}
                    onPlay={() => router.push(`/watch/${entry.mediaType}/${entry.id}`)}
                    onRemove={() => removeFromHistory(entry.id, entry.mediaType)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredHistory.map((entry) => (
                  <HistoryGridCard
                    key={`${entry.id}-${entry.mediaType}`}
                    entry={entry}
                    onPlay={() => router.push(`/watch/${entry.mediaType}/${entry.id}`)}
                    onRemove={() => removeFromHistory(entry.id, entry.mediaType)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile/Tablet Bottom Navigation */}
      <div className="lg:hidden">
        <BottomNavBar />
      </div>
    </div>
  );
}
