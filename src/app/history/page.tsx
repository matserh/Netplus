'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useWatchHistory, WatchHistoryEntry } from '@/contexts/WatchHistoryContext';
import { useEffect, useState } from 'react';
import { Trash2, Play, Film, Tv, Clock } from 'lucide-react';

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

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { history, removeFromHistory, clearHistory } = useWatchHistory();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
          </div>

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/50 hover:text-red-400 hover:bg-red-400/5 border border-border/30 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tout effacer</span>
            </button>
          )}
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
          <div className="space-y-2 sm:space-y-3">
            {/* Stats */}
            <div className="flex items-center gap-4 mb-6">
              <div className="px-3 py-1.5 rounded-lg bg-muted/30 border border-border/20">
                <span className="text-xs text-muted-foreground/60">
                  {history.length} contenu{history.length > 1 ? 's' : ''} regardé{history.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-muted/30 border border-border/20">
                <span className="text-xs text-muted-foreground/60">
                  {history.filter(h => h.mediaType === 'movie').length} films · {history.filter(h => h.mediaType === 'tv').length} séries
                </span>
              </div>
            </div>

            {/* History list */}
            {history.map((entry) => (
              <HistoryCard
                key={`${entry.id}-${entry.mediaType}`}
                entry={entry}
                onPlay={() => router.push(`/watch?id=${entry.id}&type=${entry.mediaType}`)}
                onRemove={() => removeFromHistory(entry.id, entry.mediaType)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
