'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/contexts/ProfileContext';
import { Media, TMDBResponse, API_CONFIG } from '@/types/media';
import {
  Heart, MessageCircle, Share2, Play, X, Pause,
  ArrowLeft, Zap, Minimize2, Maximize2, Search,
  AlertTriangle, SkipForward, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-url';

// ─── Fetch helper ───
const fetchTMDB = async <T,>(endpoint: string): Promise<T | null> => {
  try {
    const res = await fetch(
      `${API_CONFIG.tmdb.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_CONFIG.tmdb.apiKey}&language=fr-FR`
    );
    return res.ok ? await res.json() : null;
  } catch { return null; }
};

// ─── Types ───
interface ShortItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  genreLabel?: string; // "Anime", "Animation", "Action" etc.
  // Movie segments
  segmentIndex?: number;
  segmentTitle?: string;
  segmentStart?: number;
  // TV episodes
  season?: number;
  episode?: number;
  episodeName?: string;
}

interface LikeData {
  count: number;
  liked: boolean;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

// ─── Format helpers ───
function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Segment generator for movies ───
function generateMovieSegments(runtime: number): { index: number; title: string; start: number }[] {
  if (!runtime || runtime <= 0) return [{ index: 0, title: 'Début', start: 0 }];
  const segmentLength = 5;
  const segments = [];
  for (let i = 0; i < Math.ceil(runtime / segmentLength); i++) {
    const startMin = i * segmentLength;
    const endMin = Math.min((i + 1) * segmentLength, runtime);
    segments.push({
      index: i,
      title: `${formatTimeShort(startMin * 60)} - ${formatTimeShort(endMin * 60)}`,
      start: startMin * 60,
    });
  }
  return segments;
}

// ─── Build video URL for a short item using a specific server index ───
function getShortVideoUrl(item: ShortItem, serverIndex: number = 0): string {
  const servers = Object.values(API_CONFIG.videoServers);
  const server = servers[serverIndex % servers.length];
  const id = item.id;
  if (item.mediaType === 'tv' && item.season && item.episode) {
    return server.tvUrl(id, item.season, item.episode);
  }
  return server.movieUrl(id);
}

// ─── Smart Short Player — compact version for shorts with auto-fallback ───
function SmartShortPlayer({ src, title, onSwitchServer, serverIndex, totalServers }: {
  src: string; title: string; onSwitchServer: () => void; serverIndex: number; totalServers: number;
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'timeout'>('loading');
  const [failedServers, setFailedServers] = useState<Set<number>>(new Set());
  const [autoFallbackAttempted, setAutoFallbackAttempted] = useState(false);
  const [allFailed, setAllFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setState('loading');
    setAutoFallbackAttempted(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState(prev => prev === 'loading' ? 'timeout' : prev);
      setFailedServers(prev => new Set(prev).add(serverIndex));
    }, 15000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [src, serverIndex]);

  // Auto-fallback when server fails
  useEffect(() => {
    if ((state === 'error' || state === 'timeout') && !autoFallbackAttempted) {
      setAutoFallbackAttempted(true);
      const newFailed = new Set(failedServers);
      newFailed.add(serverIndex);
      if (newFailed.size >= totalServers) {
        setAllFailed(true);
        return;
      }
      const timer = setTimeout(() => onSwitchServer(), 1500);
      return () => clearTimeout(timer);
    }
  }, [state, autoFallbackAttempted, failedServers, serverIndex, totalServers, onSwitchServer]);

  const handleLoad = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('ready');
    setFailedServers(prev => { const n = new Set(prev); n.delete(serverIndex); return n; });
  }, [serverIndex]);

  const handleError = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('error');
    setFailedServers(prev => new Set(prev).add(serverIndex));
  }, [serverIndex]);

  const showOverlay = state === 'error' || state === 'timeout';
  const serverName = Object.values(API_CONFIG.videoServers)[serverIndex]?.name || `Serveur ${serverIndex + 1}`;
  const available = totalServers - failedServers.size;
  const isAutoFallingBack = showOverlay && !allFailed && !autoFallbackAttempted;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <iframe
        src={src}
        className={cn('w-full h-full transition-opacity duration-500', showOverlay ? 'opacity-0' : 'opacity-100')}
        style={{ aspectRatio: '16/9', minHeight: '100%', maxWidth: '177.78%' }}
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
        referrerPolicy="origin"
        title={title}
        onLoad={handleLoad}
        onError={handleError}
      />
      {state === 'loading' && !showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-white/30">{serverName}</span>
          </div>
        </div>
      )}
      {/* Auto-fallback transition */}
      {isAutoFallingBack && (
        <div className="absolute inset-0 flex items-center justify-center z-15 bg-black/80">
          <div className="flex flex-col items-center gap-2 animate-pulse">
            <Wifi className="w-6 h-6 text-primary" />
            <p className="text-[11px] text-white/50">Serveur suivant...</p>
          </div>
        </div>
      )}
      {/* All servers failed */}
      {showOverlay && allFailed && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90">
          <div className="flex flex-col items-center gap-3 px-6 text-center max-w-[260px]">
            <WifiOff className="w-8 h-8 text-red-400" />
            <p className="text-xs font-bold text-white">Contenu indisponible</p>
            <p className="text-[10px] text-white/30">Aucun serveur ne peut charger ce contenu. Réessayez plus tard.</p>
            <button onClick={() => { setAllFailed(false); setFailedServers(new Set()); onSwitchServer(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-black text-xs font-bold active:scale-95 transition-transform">
              <RefreshCw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          </div>
        </div>
      )}
      {/* Some servers still available */}
      {showOverlay && !allFailed && !isAutoFallingBack && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90">
          <div className="flex flex-col items-center gap-3 px-6 text-center max-w-[260px]">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-xs font-bold text-white">Serveur indisponible</p>
            <p className="text-[10px] text-white/30">{serverName} ne répond pas</p>
            <p className="text-[10px] text-primary/50">{available} serveur{available > 1 ? 's' : ''} restant{available > 1 ? 's' : ''}</p>
            <button onClick={onSwitchServer}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-black text-xs font-bold active:scale-95 transition-transform">
              <SkipForward className="w-3.5 h-3.5" />
              Serveur suivant
            </button>
            <p className="text-[9px] text-white/15">{serverIndex + 1} / {totalServers} · {failedServers.size} échoué{failedServers.size > 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Content sources for all types ───
type ContentType = 'all' | 'series' | 'films' | 'anime';

const CONTENT_TABS: { key: ContentType; label: string }[] = [
  { key: 'all', label: 'Pour toi' },
  { key: 'series', label: 'Séries' },
  { key: 'films', label: 'Films' },
  { key: 'anime', label: 'Anime' },
];

// ─── Load shorts from a single endpoint, deduped ───
async function loadShortsFromEndpoint(
  endpoint: string,
  mediaType: 'movie' | 'tv',
  genreLabel?: string,
  maxItems: number = 8,
  seenIds: Set<string> = new Set()
): Promise<ShortItem[]> {
  const data = await fetchTMDB<TMDBResponse<Media>>(endpoint);
  if (!data?.results) return [];

  const items: ShortItem[] = [];

  for (const item of data.results) {
    if (items.length >= maxItems) break;

    // Dedup key: same id + same mediaType = skip
    const dedupKey = `${item.id}-${mediaType}`;
    if (seenIds.has(dedupKey)) continue;
    seenIds.add(dedupKey);

    if (mediaType === 'tv') {
      // For TV: fetch first episode
      const detail = await fetchTMDB<any>(`/tv/${item.id}`);
      if (detail?.seasons) {
        const firstRealSeason = detail.seasons.find((s: any) => s.season_number > 0);
        if (firstRealSeason) {
          const seasonData = await fetchTMDB<any>(`/tv/${item.id}/season/${firstRealSeason.season_number}`);
          if (seasonData?.episodes?.[0]) {
            const ep = seasonData.episodes[0];
            items.push({
              id: item.id,
              mediaType: 'tv',
              title: item.name || item.original_name || '',
              overview: ep.overview || item.overview || '',
              posterPath: item.poster_path,
              backdropPath: ep.still_path || item.backdrop_path,
              voteAverage: item.vote_average,
              genreLabel,
              season: firstRealSeason.season_number,
              episode: ep.episode_number,
              episodeName: ep.name,
            });
          }
        }
      }
    } else {
      // For movies: single card (no segment splitting for cleaner feed)
      items.push({
        id: item.id,
        mediaType: 'movie',
        title: item.title || item.original_title || '',
        overview: item.overview || '',
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        voteAverage: item.vote_average,
        genreLabel,
      });
    }
  }

  return items;
}

// ─── Like Button with TikTok-style animation ───
function LikeButton({ mediaId, mediaType, segment, season, likeTriggerRef }: { mediaId: number; mediaType: string; segment: number; season?: number | null; likeTriggerRef?: React.MutableRefObject<(() => void) | null> }) {
  const [data, setData] = useState<LikeData>({ count: 0, liked: false });
  const [animating, setAnimating] = useState(false);
  const [justLiked, setJustLiked] = useState(false); // track if we JUST liked for animation direction
  const [isToggling, setIsToggling] = useState(false); // prevent double-clicks
  const { data: session } = useSession();
  const normalizedSeason = season || 0;

  useEffect(() => {
    const params = new URLSearchParams({ mediaId: String(mediaId), mediaType, segment: String(segment), season: String(normalizedSeason) });
    apiFetch(`/api/shorts/like?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count !== undefined) setData(d); })
      .catch(() => {});
  }, [mediaId, mediaType, segment, normalizedSeason]);

  const toggleLike = async () => {
    if (!session || isToggling) return;
    setIsToggling(true);
    
    // Optimistic update — immediately show the animation
    const willLike = !data.liked;
    setJustLiked(willLike);
    setAnimating(true);
    setData(prev => ({ count: prev.count + (willLike ? 1 : -1), liked: willLike }));

    try {
      const res = await apiFetch('/api/shorts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, mediaType, segment, season: normalizedSeason }),
      });
      
      if (!res.ok) {
        // HTTP error (401, 500, etc.) — revert optimistic update
        console.warn('[like] HTTP error:', res.status);
        setData(prev => ({ count: prev.count + (willLike ? -1 : 1), liked: !willLike }));
      } else {
        const d = await res.json();
        if (d?.liked !== undefined) {
          // Server confirmed — use server state
          setData(prev => ({ count: d.count ?? prev.count, liked: d.liked }));
        } else if (d?.error) {
          // Server error — revert optimistic update
          console.warn('[like] API error:', d.error);
          setData(prev => ({ count: prev.count + (willLike ? -1 : 1), liked: !willLike }));
        }
      }
    } catch (err) {
      // Network error — revert optimistic update
      console.warn('[like] Network error:', err);
      setData(prev => ({ count: prev.count + (willLike ? -1 : 1), liked: !willLike }));
    }
    setTimeout(() => { setAnimating(false); setJustLiked(false); setIsToggling(false); }, 600);
  };

  // Expose toggleLike via ref so parent (double-tap) can trigger it
  useEffect(() => {
    if (likeTriggerRef) likeTriggerRef.current = toggleLike;
  }); // update every render to keep ref fresh

  return (
    <button onClick={toggleLike} className="flex flex-col items-center gap-0.5 group active:scale-90 transition-transform">
      <div className="relative">
        <Heart
          className={cn(
            'w-7 h-7 transition-all duration-300',
            animating && justLiked && 'scale-125',
            data.liked
              ? 'text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]'
              : 'text-white/80 group-hover:text-white'
          )}
          strokeWidth={data.liked ? 0 : 1.5}
        />
        {animating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              'w-12 h-12 rounded-full animate-ping-once',
              justLiked ? 'bg-red-500/25' : 'bg-white/10'
            )} />
          </div>
        )}
      </div>
      <span className={cn('text-[11px] font-medium transition-colors', data.liked ? 'text-red-400' : 'text-white/40')}>
        {data.count > 0 ? data.count : 'J\'aime'}
      </span>
    </button>
  );
}

// ─── Comment Bottom Sheet ───
function CommentSheet({ mediaId, mediaType, segment, season, onClose }: {
  mediaId: number; mediaType: string; segment: number; season?: number | null; onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);
  const { data: session } = useSession();
  const normalizedSeason = season || 0;

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  useEffect(() => {
    const params = new URLSearchParams({ mediaId: String(mediaId), mediaType, segment: String(segment), season: String(normalizedSeason) });
    apiFetch(`/api/shorts/comments?${params}`)
      .then(r => r?.json())
      .then(d => { if (d?.comments) setComments(d.comments); })
      .catch(() => {});
  }, [mediaId, mediaType, segment, normalizedSeason]);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 250); };
  const handleBackdropClick = (e: React.MouseEvent) => { if (e.target === e.currentTarget) handleClose(); };

  const submitComment = async () => {
    if (!session || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/shorts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, mediaType, segment, season: normalizedSeason, content: newComment.trim() }),
      });
      const d = await res.json();
      if (d?.comment) { setComments(prev => [d.comment, ...prev]); setNewComment(''); }
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={handleBackdropClick}>
      <div className={cn('absolute inset-0 bg-black/40 transition-opacity duration-250', visible ? 'opacity-100' : 'opacity-0')} />
      <div className={cn(
        'relative z-10 flex flex-col rounded-t-2xl transition-transform duration-250 ease-out',
        'bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-white/[0.06]',
        visible ? 'translate-y-0' : 'translate-y-full'
      )} style={{ height: '55vh', maxHeight: '55dvh' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-2.5 pb-1"><div className="w-8 h-1 rounded-full bg-white/15" /></div>
        <div className="flex items-center justify-between px-4 pb-2.5 border-b border-white/[0.06]">
          <h3 className="text-[13px] font-bold text-white/90">Commentaires<span className="ml-1.5 text-white/30 font-normal">{comments.length}</span></h3>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/5 transition-colors"><X className="w-4 h-4 text-white/40" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <MessageCircle className="w-7 h-7 text-white/[0.06] mb-2" />
              <p className="text-xs text-white/25">Aucun commentaire</p>
              <p className="text-[10px] text-white/15 mt-0.5">Soyez le premier !</p>
            </div>
          ) : comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-amber-500/20 flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary/80">{(c.user.name || c.user.email)[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white/70">{c.user.name || 'Anonyme'}</span>
                  <span className="text-[9px] text-white/15">{formatRelativeDate(c.createdAt)}</span>
                </div>
                <p className="text-[12px] text-white/50 mt-0.5 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        {session ? (
          <div className="px-3 py-2.5 border-t border-white/[0.06] flex gap-2">
            <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()} placeholder="Ajouter un commentaire..." maxLength={500}
              className="flex-1 h-9 px-3.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition-colors" />
            <button onClick={submitComment} disabled={!newComment.trim() || submitting}
              className="px-4 h-9 rounded-full bg-primary text-black text-xs font-bold disabled:opacity-20 hover:bg-primary/90 transition-all active:scale-95">Envoyer</button>
          </div>
        ) : (
          <div className="px-4 py-2.5 border-t border-white/[0.06] text-center"><p className="text-[11px] text-white/20">Connectez-vous pour commenter</p></div>
        )}
      </div>
    </div>
  );
}

// ─── Single Short Card — 9:16 portrait format ───
function ShortCard({ item, isActive }: { item: ShortItem; isActive: boolean }) {
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [shortServerIndex, setShortServerIndex] = useState(0);
  const lastTapRef = useRef(0);
  const likeTriggerRef = useRef<(() => void) | null>(null);
  const router = useRouter();

  useEffect(() => { setIsPlaying(false); setShowComments(false); setShortServerIndex(0); }, [item.id, item.segmentIndex, item.season, item.episode]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setDoubleTapLike(true);
      // Persist the like via the LikeButton's toggle function
      if (likeTriggerRef.current) likeTriggerRef.current();
      setTimeout(() => setDoubleTapLike(false), 800);
    } else if (isPlaying) {
      setIsPlaying(false);
    }
    lastTapRef.current = now;
  };

  const handleOpenFullWatch = () => {
    const params = new URLSearchParams({ id: String(item.id), type: item.mediaType });
    if (item.mediaType === 'tv' && item.season && item.episode) {
      params.set('s', String(item.season));
      params.set('e', String(item.episode));
    }
    router.push(`/watch?${params}`);
  };

  return (
    <div className="relative w-full h-full flex-shrink-0 snap-start snap-always">
      {/* ─── PREVIEW MODE ─── */}
      {!isPlaying && (
        <>
          {/* 9:16 portrait backdrop — center-cropped */}
          {item.backdropPath && (
            <img
              src={`https://image.tmdb.org/t/p/w780${item.backdropPath}`}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="lazy"
            />
          )}
          {/* Fallback: poster in 9:16 crop if no backdrop */}
          {!item.backdropPath && item.posterPath && (
            <img
              src={`https://image.tmdb.org/t/p/w780${item.posterPath}`}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover object-top"
              loading="lazy"
            />
          )}

          {/* Gradient overlays for 9:16 portrait */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10" />
          {/* Side vignettes for portrait immersion */}
          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/40 to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/40 to-transparent z-10" />

          {/* Double-tap heart */}
          {doubleTapLike && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <Heart className="w-20 h-20 text-red-500 fill-red-500 drop-shadow-[0_0_24px_rgba(239,68,68,0.5)] animate-bounce" />
            </div>
          )}

          {/* Content overlay */}
          <div className="absolute inset-0 z-20 flex" onClick={handleTap}>
            {/* Left: Info */}
            <div className="flex-1 flex flex-col justify-end p-4 sm:p-5 pb-20">
              {/* Badges */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-primary/90 text-[9px] text-black font-black tracking-wide">
                  {item.mediaType === 'movie' ? 'FILM' : 'SÉRIE'}
                </span>
                {item.genreLabel && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-white/70 font-medium">
                    {item.genreLabel}
                  </span>
                )}
                {item.mediaType === 'tv' && item.season && item.episode && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-white/60 font-medium">
                    S{item.season}E{item.episode}
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-black text-white mb-0.5 leading-tight line-clamp-2">{item.title}</h2>

              {item.mediaType === 'tv' && item.episodeName && (
                <p className="text-[11px] text-white/40 mb-1.5">{item.episodeName}</p>
              )}

              {item.overview && (
                <p className="text-[10px] text-white/30 line-clamp-2 max-w-xs leading-relaxed">{item.overview}</p>
              )}

              {/* Play + Normal mode buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-black/30"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Lecture
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenFullWatch(); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/15 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Normal
                </button>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col items-center justify-end gap-5 pr-3 pb-24">
              <LikeButton mediaId={item.id} mediaType={item.mediaType} segment={item.segmentIndex || item.episode || 0} season={item.season} likeTriggerRef={likeTriggerRef} />
              <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-0.5 group active:scale-90 transition-transform">
                <MessageCircle className="w-7 h-7 text-white/80 group-hover:text-white transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] text-white/40 font-medium">Commenter</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); if (navigator.share) navigator.share({ title: item.title, url: window.location.href }).catch(() => {}); }} className="flex flex-col items-center gap-0.5 group active:scale-90 transition-transform">
                <Share2 className="w-7 h-7 text-white/80 group-hover:text-white transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] text-white/40 font-medium">Partager</span>
              </button>
              {item.posterPath && (
                <div className="w-9 h-[52px] rounded-md overflow-hidden ring-1 ring-white/10">
                  <img src={`https://image.tmdb.org/t/p/w92${item.posterPath}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── PLAYER MODE — 9:16 vertical crop ─── */}
      {isPlaying && (
        <div className="absolute inset-0 z-40 bg-black flex flex-col">
          {/* Video — Smart player with server health detection */}
          <div className="relative flex-1 overflow-hidden">
            <SmartShortPlayer
              src={getShortVideoUrl(item, shortServerIndex)}
              title={`${item.title} - Short`}
              onSwitchServer={() => {
                const servers = Object.values(API_CONFIG.videoServers);
                setShortServerIndex((currentIdx) => (currentIdx + 1) % servers.length);
              }}
              serverIndex={shortServerIndex}
              totalServers={Object.values(API_CONFIG.videoServers).length}
            />
          </div>

          {/* Bottom controls */}
          <div className="flex-shrink-0 px-3 pb-4 pt-2 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 rounded bg-primary/90 text-[8px] text-black font-black">
                {item.mediaType === 'movie' ? 'FILM' : 'SÉRIE'}
              </span>
              {item.mediaType === 'tv' && item.season && item.episode && (
                <span className="text-[10px] text-white/40">S{item.season}E{item.episode}</span>
              )}
              <span className="text-[11px] text-white/80 font-semibold truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors text-white/70 text-[11px] font-medium">
                <Minimize2 className="w-3.5 h-3.5" /> Fermer
              </button>
              <button onClick={handleOpenFullWatch} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors text-white/70 text-[11px] font-medium">
                <Maximize2 className="w-3.5 h-3.5" /> Mode normal
              </button>
              <div className="flex-1" />
              <LikeButton mediaId={item.id} mediaType={item.mediaType} segment={item.segmentIndex || item.episode || 0} season={item.season} likeTriggerRef={likeTriggerRef} />
              <button onClick={() => setShowComments(true)} className="flex items-center gap-1 text-white/70 hover:text-white transition-colors active:scale-90">
                <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments bottom sheet */}
      {showComments && (
        <CommentSheet mediaId={item.id} mediaType={item.mediaType} segment={item.segmentIndex || item.episode || 0} season={item.season} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}

// ─── Search Overlay for Shorts ───
function ShortsSearch({ onClose, onResultClick }: { onClose: () => void; onResultClick: (item: ShortItem) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await fetchTMDB<TMDBResponse<Media>>(`/search/multi?query=${encodeURIComponent(query)}`);
      if (data?.results) {
        const items = data.results
          .filter((r: any) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
          .slice(0, 12)
          .map((r: any): ShortItem => ({
            id: r.id,
            mediaType: r.media_type,
            title: r.title || r.name || '',
            overview: r.overview || '',
            posterPath: r.poster_path,
            backdropPath: r.backdrop_path,
            voteAverage: r.vote_average,
          }));
        setResults(items);
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 250); };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={cn('absolute inset-0 bg-black/60 transition-opacity duration-250', visible ? 'opacity-100' : 'opacity-0')} />
      <div className={cn(
        'relative z-10 flex flex-col h-full bg-[#0a0a0a]/95 backdrop-blur-xl transition-transform duration-250 ease-out',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}>
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,12px)] pb-3 border-b border-white/[0.06]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un film, série, anime..."
              autoFocus
              className="w-full h-10 pl-10 pr-4 rounded-full bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <p className="text-center text-xs text-white/20 py-8">Aucun résultat</p>
          )}
          {!loading && results.length === 0 && !query.trim() && (
            <div className="flex flex-col items-center py-12">
              <Search className="w-10 h-10 text-white/[0.06] mb-3" />
              <p className="text-xs text-white/20">Tapez pour rechercher</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {results.map(item => (
              <button
                key={`${item.id}-${item.mediaType}`}
                onClick={() => { handleClose(); onResultClick(item); }}
                className="rounded-lg overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
              >
                <div className="aspect-[2/3] bg-muted">
                  {item.posterPath && (
                    <img src={`https://image.tmdb.org/t/p/w342${item.posterPath}`} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-semibold text-white/80 truncate">{item.title}</p>
                  <span className="text-[9px] text-white/30">{item.mediaType === 'movie' ? 'Film' : 'Série'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile-aware query builder for shorts ───
// Pipe | = OR logic (any genre), comma = AND logic (ALL genres required)
function getProfileGenreParams(profileType: string | undefined): string {
  switch (profileType) {
    case 'JEUNESSE':
      return 'with_genres=16|10751|14&without_genres=27|53|80';
    case 'FRENESIE':
      return 'with_genres=28|18|27|14|878';
    case 'NOCTURNE':
    default:
      return ''; // No filter — show everything
  }
}

// ─── Helper: add page param to endpoint ───
function withPage(endpoint: string, page: number): string {
  return endpoint.includes('?')
    ? `${endpoint}&page=${page}`
    : `${endpoint}?page=${page}`;
}

// ─── Main Shorts Page with Infinite Scroll ───
export default function ShortsPage() {
  const router = useRouter();
  const { status } = useSession();
  const { profile, getDiscoverEndpoint } = useProfile();
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<ContentType>('all');
  const [showSearch, setShowSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const loadingMoreRef = useRef(false);

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Load initial shorts — profile-aware, same content as main page but in short format
  const loadShorts = useCallback(async (tab: ContentType, page: number = 1, append: boolean = false) => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    if (!append) setLoading(true); else setLoadingMore(true);

    let items: ShortItem[] = [];
    const seen = append ? seenIdsRef.current : new Set<string>();
    if (!append) seenIdsRef.current = seen;

    const profileGenreParams = getProfileGenreParams(profile?.type);

    try {
      if (tab === 'all') {
        // Mixed content from same sources as main page — movies + TV + anime, profile-filtered
        const profileMoviesEndpoint = profileGenreParams
          ? `/discover/movie?sort_by=popularity.desc&${profileGenreParams}`
          : `/trending/movie/week`;
        const profileTvEndpoint = profileGenreParams
          ? `/discover/tv?sort_by=popularity.desc&${profileGenreParams}`
          : `/trending/tv/week`;

        const [movies, tvs, animeTv] = await Promise.all([
          fetchTMDB<TMDBResponse<Media>>(withPage(profileMoviesEndpoint, page)),
          fetchTMDB<TMDBResponse<Media>>(withPage(profileTvEndpoint, page)),
          fetchTMDB<TMDBResponse<Media>>(withPage(`/discover/tv?with_genres=16&with_keywords=210024&sort_by=popularity.desc`, page)),
        ]);

        // Add movies (1 per movie, no segments = no duplication)
        if (movies?.results) {
          for (const m of movies.results.slice(0, 8)) {
            const key = `${m.id}-movie`;
            if (seen.has(key)) continue;
            seen.add(key);
            items.push({
              id: m.id, mediaType: 'movie',
              title: m.title || m.original_title || '',
              overview: m.overview || '', posterPath: m.poster_path,
              backdropPath: m.backdrop_path, voteAverage: m.vote_average,
            });
          }
        }

        // Add TV shows (first episode only)
        if (tvs?.results) {
          for (const show of tvs.results.slice(0, 6)) {
            const key = `${show.id}-tv`;
            if (seen.has(key)) continue;
            seen.add(key);
            const detail = await fetchTMDB<any>(`/tv/${show.id}`);
            if (detail?.seasons) {
              const firstSeason = detail.seasons.find((s: any) => s.season_number > 0);
              if (firstSeason) {
                const seasonData = await fetchTMDB<any>(`/tv/${show.id}/season/${firstSeason.season_number}`);
                if (seasonData?.episodes?.[0]) {
                  const ep = seasonData.episodes[0];
                  items.push({
                    id: show.id, mediaType: 'tv',
                    title: show.name || show.original_name || '',
                    overview: ep.overview || show.overview || '',
                    posterPath: show.poster_path,
                    backdropPath: ep.still_path || show.backdrop_path,
                    voteAverage: show.vote_average,
                    season: firstSeason.season_number, episode: ep.episode_number, episodeName: ep.name,
                  });
                }
              }
            }
          }
        }

        // Add anime
        if (animeTv?.results) {
          for (const show of animeTv.results.slice(0, 5)) {
            const key = `${show.id}-tv`;
            if (seen.has(key)) continue;
            seen.add(key);
            const detail = await fetchTMDB<any>(`/tv/${show.id}`);
            if (detail?.seasons) {
              const firstSeason = detail.seasons.find((s: any) => s.season_number > 0);
              if (firstSeason) {
                const seasonData = await fetchTMDB<any>(`/tv/${show.id}/season/${firstSeason.season_number}`);
                if (seasonData?.episodes?.[0]) {
                  const ep = seasonData.episodes[0];
                  items.push({
                    id: show.id, mediaType: 'tv',
                    title: show.name || show.original_name || '',
                    overview: ep.overview || show.overview || '',
                    posterPath: show.poster_path,
                    backdropPath: ep.still_path || show.backdrop_path,
                    voteAverage: show.vote_average,
                    genreLabel: 'Anime',
                    season: firstSeason.season_number, episode: ep.episode_number, episodeName: ep.name,
                  });
                }
              }
            }
          }
        }

        // Shuffle for variety
        items.sort(() => Math.random() - 0.5);

      } else if (tab === 'series') {
        // Series tab — profile-filtered TV shows
        const seriesEndpoint = profileGenreParams
          ? `/discover/tv?sort_by=popularity.desc&${profileGenreParams}`
          : `/tv/popular`;
        const data = await fetchTMDB<TMDBResponse<Media>>(withPage(seriesEndpoint, page));
        if (data?.results) {
          for (const show of data.results) {
            const key = `${show.id}-tv`;
            if (seen.has(key)) continue;
            seen.add(key);
            const detail = await fetchTMDB<any>(`/tv/${show.id}`);
            if (detail?.seasons) {
              const firstSeason = detail.seasons.find((s: any) => s.season_number > 0);
              if (firstSeason) {
                const seasonData = await fetchTMDB<any>(`/tv/${show.id}/season/${firstSeason.season_number}`);
                if (seasonData?.episodes?.[0]) {
                  const ep = seasonData.episodes[0];
                  items.push({
                    id: show.id, mediaType: 'tv',
                    title: show.name || show.original_name || '',
                    overview: ep.overview || show.overview || '',
                    posterPath: show.poster_path,
                    backdropPath: ep.still_path || show.backdrop_path,
                    voteAverage: show.vote_average,
                    season: firstSeason.season_number, episode: ep.episode_number, episodeName: ep.name,
                  });
                }
              }
            }
          }
        }

      } else if (tab === 'films') {
        // Films tab — profile-filtered movies
        const filmsEndpoint = profileGenreParams
          ? `/discover/movie?sort_by=popularity.desc&${profileGenreParams}`
          : `/movie/popular`;
        const data = await fetchTMDB<TMDBResponse<Media>>(withPage(filmsEndpoint, page));
        if (data?.results) {
          for (const movie of data.results) {
            const key = `${movie.id}-movie`;
            if (seen.has(key)) continue;
            seen.add(key);
            items.push({
              id: movie.id, mediaType: 'movie',
              title: movie.title || movie.original_title || '',
              overview: movie.overview || '', posterPath: movie.poster_path,
              backdropPath: movie.backdrop_path, voteAverage: movie.vote_average,
            });
          }
        }

      } else if (tab === 'anime') {
        // Anime: both TV and movies with animation genre + anime keyword
        const [animeTv, animeMovies] = await Promise.all([
          fetchTMDB<TMDBResponse<Media>>(withPage(`/discover/tv?with_genres=16&with_keywords=210024&sort_by=popularity.desc`, page)),
          fetchTMDB<TMDBResponse<Media>>(withPage(`/discover/movie?with_genres=16&with_keywords=210024&sort_by=popularity.desc`, page)),
        ]);

        if (animeTv?.results) {
          for (const show of animeTv.results) {
            const key = `${show.id}-tv`;
            if (seen.has(key)) continue;
            seen.add(key);
            const detail = await fetchTMDB<any>(`/tv/${show.id}`);
            if (detail?.seasons) {
              const firstSeason = detail.seasons.find((s: any) => s.season_number > 0);
              if (firstSeason) {
                const seasonData = await fetchTMDB<any>(`/tv/${show.id}/season/${firstSeason.season_number}`);
                if (seasonData?.episodes?.[0]) {
                  const ep = seasonData.episodes[0];
                  items.push({
                    id: show.id, mediaType: 'tv',
                    title: show.name || show.original_name || '',
                    overview: ep.overview || show.overview || '',
                    posterPath: show.poster_path,
                    backdropPath: ep.still_path || show.backdrop_path,
                    voteAverage: show.vote_average,
                    genreLabel: 'Anime',
                    season: firstSeason.season_number, episode: ep.episode_number, episodeName: ep.name,
                  });
                }
              }
            }
          }
        }

        if (animeMovies?.results) {
          for (const movie of animeMovies.results) {
            const key = `${movie.id}-movie`;
            if (seen.has(key)) continue;
            seen.add(key);
            items.push({
              id: movie.id, mediaType: 'movie',
              title: movie.title || movie.original_title || '',
              overview: movie.overview || '', posterPath: movie.poster_path,
              backdropPath: movie.backdrop_path, voteAverage: movie.vote_average,
              genreLabel: 'Anime',
            });
          }
        }

        items.sort(() => Math.random() - 0.5);
      }
    } catch {}

    if (append) {
      setShorts(prev => [...prev, ...items]);
    } else {
      setShorts(items);
      setActiveIndex(0);
    }

    setLoading(false);
    setLoadingMore(false);
    loadingMoreRef.current = false;
  }, [profile?.type, getDiscoverEndpoint]);

  // Load on auth/tab change
  useEffect(() => {
    if (status === 'authenticated' && profile) {
      pageRef.current = 1;
      seenIdsRef.current = new Set();
      loadShorts(activeTab, 1, false);
    }
  }, [status, profile, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll — load more when near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 800 && !loadingMoreRef.current) {
        pageRef.current += 1;
        loadShorts(activeTab, pageRef.current, true);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [activeTab, loadShorts]);

  // Track active card on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: el, threshold: 0.6 }
    );
    el.querySelectorAll('[data-index]').forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [shorts]);

  // Handle search result click — insert at current position
  const handleSearchResult = (item: ShortItem) => {
    setShorts(prev => {
      const newShorts = [...prev];
      newShorts.splice(activeIndex + 1, 0, item);
      return newShorts;
    });
  };

  if (status === 'loading') {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
        <button onClick={() => router.push('/')} className="p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/80" />
        </button>

        {/* Tab selector */}
        <div className="flex items-center gap-0.5 bg-black/30 backdrop-blur-sm rounded-full p-0.5">
          {CONTENT_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-primary text-black'
                  : 'text-white/50 hover:text-white/70'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search toggle */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={cn(
            'p-2 rounded-full backdrop-blur-sm transition-colors',
            showSearch ? 'bg-primary/30 text-primary' : 'bg-black/30 text-white/70 hover:bg-black/50'
          )}
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Shorts Feed — Vertical Snap Scroll with Infinite Loading */}
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white/30">Chargement des shorts...</span>
          </div>
        </div>
      ) : shorts.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Zap className="w-10 h-10 text-white/10" />
            <p className="text-sm text-white/30">Aucun short disponible</p>
            <p className="text-[11px] text-white/20">Essayez un autre onglet</p>
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {shorts.map((item, i) => (
            <div key={`${item.id}-${item.mediaType}-${item.segmentIndex ?? ''}-${item.season ?? ''}-${item.episode ?? ''}-${i}`} data-index={i} className="h-full">
              <ShortCard item={item} isActive={i === activeIndex} />
            </div>
          ))}
          {/* Loading more indicator */}
          {loadingMore && (
            <div className="h-20 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Search overlay */}
      {showSearch && (
        <ShortsSearch onClose={() => setShowSearch(false)} onResultClick={handleSearchResult} />
      )}
    </div>
  );
}
