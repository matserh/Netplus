'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProfile } from '@/contexts/ProfileContext';
import { Media, TMDBResponse, API_CONFIG } from '@/types/media';
import {
  Heart, MessageCircle, Share2, Play, X, Pause,
  ArrowLeft, Zap, Minimize2, Maximize2, Search,
  AlertTriangle, SkipForward, Wifi, WifiOff, RefreshCw,
  Server, ChevronUp, ChevronDown, Monitor, Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGuest } from '@/contexts/GuestContext';

// ─── Fetch helper ───
const fetchTMDB = async <T,>(endpoint: string, timeoutMs: number = 10000): Promise<T | null> => {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(
      `${API_CONFIG.tmdb.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_CONFIG.tmdb.apiKey}&language=fr-FR`,
      { signal: controller.signal }
    );
    clearTimeout(tid);
    return res.ok ? await res.json() : null;
  } catch { return null; }
};

// Fetch TV show first-episode info in parallel
async function fetchTvEpisode(show: Media, seen: Set<string>): Promise<ShortItem | null> {
  const detail = await fetchTMDB<any>(`/tv/${show.id}`, 6000);
  if (detail?.seasons) {
    const firstSeason = detail.seasons.find((s: any) => s.season_number > 0);
    if (firstSeason) {
      const seasonData = await fetchTMDB<any>(`/tv/${show.id}/season/${firstSeason.season_number}`, 6000);
      if (seasonData?.episodes?.[0]) {
        const ep = seasonData.episodes[0];
        return {
          id: show.id, mediaType: 'tv',
          title: show.name || show.original_name || '',
          overview: ep.overview || show.overview || '',
          posterPath: show.poster_path,
          backdropPath: ep.still_path || show.backdrop_path,
          voteAverage: show.vote_average,
          season: firstSeason.season_number, episode: ep.episode_number, episodeName: ep.name,
        };
      }
    }
  }
  return {
    id: show.id, mediaType: 'tv',
    title: show.name || show.original_name || '',
    overview: show.overview || '',
    posterPath: show.poster_path,
    backdropPath: show.backdrop_path,
    voteAverage: show.vote_average,
  };
}

// ─── Types ───
interface ShortItem {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  genreLabel?: string;
  segmentIndex?: number;
  segmentTitle?: string;
  segmentStart?: number;
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

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ─── Build video URL ───
function getShortVideoUrl(item: ShortItem, serverIndex: number = 0): string {
  const servers = Object.values(API_CONFIG.videoServers);
  const server = servers[serverIndex % servers.length];
  const id = item.id;
  if (item.mediaType === 'tv' && item.season && item.episode) {
    return server.tvUrl(id, item.season, item.episode);
  }
  return server.movieUrl(id);
}

// ─── Server selector data ───
const VIDEO_SERVERS = Object.values(API_CONFIG.videoServers);
const SERVER_LIST = VIDEO_SERVERS.map((s, i) => ({ index: i, name: s.name, lang: s.lang }));

// ─── Smart Short Player ───
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

  useEffect(() => {
    if ((state === 'error' || state === 'timeout') && !autoFallbackAttempted) {
      setAutoFallbackAttempted(true);
      const newFailed = new Set(failedServers);
      newFailed.add(serverIndex);
      if (newFailed.size >= totalServers) { setAllFailed(true); return; }
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
  const serverName = VIDEO_SERVERS[serverIndex]?.name || `Serveur ${serverIndex + 1}`;
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
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] text-white/40">{serverName}</span>
          </div>
        </div>
      )}
      {isAutoFallingBack && (
        <div className="absolute inset-0 flex items-center justify-center z-15 bg-black/80">
          <div className="flex flex-col items-center gap-2 animate-pulse">
            <Wifi className="w-8 h-8 text-primary" />
            <p className="text-xs text-white/50">Serveur suivant...</p>
          </div>
        </div>
      )}
      {showOverlay && allFailed && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90">
          <div className="flex flex-col items-center gap-3 px-6 text-center max-w-[280px]">
            <WifiOff className="w-10 h-10 text-red-400" />
            <p className="text-sm font-bold text-white">Contenu indisponible</p>
            <p className="text-xs text-white/40">Aucun serveur ne peut charger ce contenu.</p>
            <button onClick={() => { setAllFailed(false); setFailedServers(new Set()); onSwitchServer(); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-black text-sm font-bold active:scale-95 transition-transform">
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          </div>
        </div>
      )}
      {showOverlay && !allFailed && !isAutoFallingBack && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90">
          <div className="flex flex-col items-center gap-3 px-6 text-center max-w-[280px]">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <p className="text-sm font-bold text-white">Serveur indisponible</p>
            <p className="text-xs text-white/40">{serverName} ne répond pas</p>
            <p className="text-xs text-primary/60">{available} serveur{available > 1 ? 's' : ''} restant{available > 1 ? 's' : ''}</p>
            <button onClick={onSwitchServer}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-black text-sm font-bold active:scale-95 transition-transform">
              <SkipForward className="w-4 h-4" /> Serveur suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Content tabs ───
type ContentType = 'all' | 'series' | 'films' | 'anime';
const CONTENT_TABS: { key: ContentType; label: string }[] = [
  { key: 'all', label: 'Pour toi' },
  { key: 'series', label: 'Séries' },
  { key: 'films', label: 'Films' },
  { key: 'anime', label: 'Anime' },
];

// ─── Load shorts ───
async function loadShortsFromEndpoint(
  endpoint: string, mediaType: 'movie' | 'tv', genreLabel?: string, maxItems: number = 8, seenIds: Set<string> = new Set()
): Promise<ShortItem[]> {
  const data = await fetchTMDB<TMDBResponse<Media>>(endpoint);
  if (!data?.results) return [];
  const items: ShortItem[] = [];
  for (const item of data.results) {
    if (items.length >= maxItems) break;
    const dedupKey = `${item.id}-${mediaType}`;
    if (seenIds.has(dedupKey)) continue;
    seenIds.add(dedupKey);
    if (mediaType === 'tv') {
      const detail = await fetchTMDB<any>(`/tv/${item.id}`);
      if (detail?.seasons) {
        const firstRealSeason = detail.seasons.find((s: any) => s.season_number > 0);
        if (firstRealSeason) {
          const seasonData = await fetchTMDB<any>(`/tv/${item.id}/season/${firstRealSeason.season_number}`);
          if (seasonData?.episodes?.[0]) {
            const ep = seasonData.episodes[0];
            items.push({ id: item.id, mediaType: 'tv', title: item.name || item.original_name || '', overview: ep.overview || item.overview || '', posterPath: item.poster_path, backdropPath: ep.still_path || item.backdrop_path, voteAverage: item.vote_average, genreLabel, season: firstRealSeason.season_number, episode: ep.episode_number, episodeName: ep.name });
          }
        }
      }
    } else {
      items.push({ id: item.id, mediaType: 'movie', title: item.title || item.original_title || '', overview: item.overview || '', posterPath: item.poster_path, backdropPath: item.backdrop_path, voteAverage: item.vote_average, genreLabel });
    }
  }
  return items;
}

// ─── Like Button ───
function LikeButton({ mediaId, mediaType, segment, season, likeTriggerRef }: { mediaId: number; mediaType: string; segment: number; season?: number | null; likeTriggerRef?: React.MutableRefObject<(() => void) | null> }) {
  const [data, setData] = useState<LikeData>({ count: 0, liked: false });
  const [animating, setAnimating] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { data: session } = useSession();
  const normalizedSeason = season || 0;

  useEffect(() => {
    const params = new URLSearchParams({ mediaId: String(mediaId), mediaType, segment: String(segment), season: String(normalizedSeason) });
    fetch(`/api/shorts/like?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.count !== undefined) setData(d); })
      .catch(() => {});
  }, [mediaId, mediaType, segment, normalizedSeason]);

  const toggleLike = async () => {
    if (!session || isToggling) return;
    setIsToggling(true);
    const willLike = !data.liked;
    setJustLiked(willLike);
    setAnimating(true);
    setData(prev => ({ count: prev.count + (willLike ? 1 : -1), liked: willLike }));
    try {
      const res = await fetch('/api/shorts/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaId, mediaType, segment, season: normalizedSeason }) });
      if (!res.ok) { setData(prev => ({ count: prev.count + (willLike ? -1 : 1), liked: !willLike })); }
      else { const d = await res.json(); if (d?.liked !== undefined) setData(prev => ({ count: d.count ?? prev.count, liked: d.liked })); else if (d?.error) setData(prev => ({ count: prev.count + (willLike ? -1 : 1), liked: !willLike })); }
    } catch { setData(prev => ({ count: prev.count + (willLike ? -1 : 1), liked: !willLike })); }
    setTimeout(() => { setAnimating(false); setJustLiked(false); setIsToggling(false); }, 600);
  };

  useEffect(() => { if (likeTriggerRef) likeTriggerRef.current = toggleLike; });

  return (
    <button onClick={toggleLike} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
      <div className="relative">
        <Heart className={cn('w-8 h-8 transition-all duration-300', animating && justLiked && 'scale-125', data.liked ? 'text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'text-white group-hover:text-white/90')} strokeWidth={data.liked ? 0 : 1.5} />
        {animating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn('w-14 h-14 rounded-full animate-ping-once', justLiked ? 'bg-red-500/25' : 'bg-white/10')} />
          </div>
        )}
      </div>
      <span className={cn('text-[11px] font-semibold transition-colors', data.liked ? 'text-red-400' : 'text-white/60')}>
        {data.count > 0 ? formatCount(data.count) : 'J\'aime'}
      </span>
    </button>
  );
}

// ─── Server Picker ───
function ServerPicker({ currentIndex, onSelect, onClose }: { currentIndex: number; onSelect: (i: number) => void; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={cn('absolute inset-0 bg-black/60 transition-opacity duration-200', visible ? 'opacity-100' : 'opacity-0')} />
      <div className={cn('relative z-10 w-[280px] max-w-[90vw] rounded-2xl overflow-hidden transition-all duration-200', visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0')}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-white">Serveur vidéo</h3>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/5"><X className="w-4 h-4 text-white/40" /></button>
        </div>
        <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
          {SERVER_LIST.map(server => (
            <button key={server.index} onClick={() => { onSelect(server.index); handleClose(); }}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left',
                server.index === currentIndex ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-white/[0.04]'
              )}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                server.index === currentIndex ? 'bg-primary text-black' : 'bg-white/[0.06] text-white/50'
              )}>
                {server.index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-semibold truncate', server.index === currentIndex ? 'text-primary' : 'text-white/80')}>{server.name}</p>
                <span className={cn('text-[10px]', server.index === currentIndex ? 'text-primary/60' : 'text-white/30')}>{server.lang}</span>
              </div>
              {server.index === currentIndex && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Comment Side Panel (TikTok-style) ───
function CommentPanel({ mediaId, mediaType, segment, season, onClose }: {
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
    fetch(`/api/shorts/comments?${params}`)
      .then(r => r?.json())
      .then(d => { if (d?.comments) setComments(d.comments); })
      .catch(() => {});
  }, [mediaId, mediaType, segment, normalizedSeason]);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 250); };

  const submitComment = async () => {
    if (!session || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/shorts/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mediaId, mediaType, segment, season: normalizedSeason, content: newComment.trim() }) });
      const d = await res.json();
      if (d?.comment) { setComments(prev => [d.comment, ...prev]); setNewComment(''); }
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="absolute inset-0 z-50">
      <div className={cn('absolute inset-0 bg-black/50 transition-opacity duration-250', visible ? 'opacity-100' : 'opacity-0')} onClick={handleClose} />
      <div className={cn('absolute right-0 top-0 bottom-0 z-10 flex flex-col w-full sm:w-[360px] transition-transform duration-300 ease-out',
        'bg-[#0f0f1a]/98 backdrop-blur-xl border-l border-white/[0.06]',
        visible ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-white/90">Commentaires <span className="ml-1 text-white/30 font-normal">{comments.length}</span></h3>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/5"><X className="w-4 h-4 text-white/40" /></button>
        </div>
        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="w-10 h-10 text-white/[0.06] mb-3" />
              <p className="text-sm text-white/30">Aucun commentaire</p>
              <p className="text-xs text-white/15 mt-1">Soyez le premier !</p>
            </div>
          ) : comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-amber-500/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary/80">{(c.user.name || c.user.email)[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/70">{c.user.name || 'Anonyme'}</span>
                  <span className="text-[10px] text-white/20">{formatRelativeDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-white/50 mt-0.5 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Input */}
        {session ? (
          <div className="px-3 py-3 border-t border-white/[0.06] flex gap-2">
            <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()} placeholder="Ajouter un commentaire..." maxLength={500}
              className="flex-1 h-10 px-4 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition-colors" />
            <button onClick={submitComment} disabled={!newComment.trim() || submitting}
              className="px-5 h-10 rounded-full bg-primary text-black text-sm font-bold disabled:opacity-20 hover:bg-primary/90 transition-all active:scale-95">Envoyer</button>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-white/[0.06] text-center"><p className="text-xs text-white/20">Connectez-vous pour commenter</p></div>
        )}
      </div>
    </div>
  );
}

// ─── Single Short Card — TikTok-style ───
function ShortCard({ item, isActive }: { item: ShortItem; isActive: boolean }) {
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [shortServerIndex, setShortServerIndex] = useState(0);
  const [showServerPicker, setShowServerPicker] = useState(false);
  const lastTapRef = useRef(0);
  const likeTriggerRef = useRef<(() => void) | null>(null);
  const router = useRouter();

  useEffect(() => { setIsPlaying(false); setShowComments(false); setShortServerIndex(0); setShowServerPicker(false); }, [item.id, item.segmentIndex, item.season, item.episode]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setDoubleTapLike(true);
      if (likeTriggerRef.current) likeTriggerRef.current();
      setTimeout(() => setDoubleTapLike(false), 800);
    } else if (isPlaying) {
      setIsPlaying(false);
    }
    lastTapRef.current = now;
  };

  const handleOpenFullWatch = () => {
    let url = `/watch/${item.mediaType}/${item.id}`;
    if (item.mediaType === 'tv' && item.season && item.episode) url += `?s=${item.season}&e=${item.episode}`;
    router.push(url);
  };

  const currentServer = VIDEO_SERVERS[shortServerIndex];
  const tmdbImgBase = 'https://image.tmdb.org/t/p';

  return (
    <div className="relative w-full h-full flex-shrink-0 snap-start snap-always">
      {/* ─── PREVIEW MODE ─── */}
      {!isPlaying && (
        <>
          {/* Background image — 9:16 crop */}
          {item.backdropPath && (
            <img src={`${tmdbImgBase}/w780${item.backdropPath}`} alt={item.title} className="absolute inset-0 w-full h-full object-cover object-center" loading="lazy" />
          )}
          {!item.backdropPath && item.posterPath && (
            <img src={`${tmdbImgBase}/w780${item.posterPath}`} alt={item.title} className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
          )}

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 z-10" />
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/30 to-transparent z-10" />

          {/* Double-tap heart animation */}
          {doubleTapLike && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-[0_0_32px_rgba(239,68,68,0.6)] animate-bounce" />
            </div>
          )}

          {/* Content + Actions layout */}
          <div className="absolute inset-0 z-20 flex" onClick={handleTap}>
            {/* Left: Info area (70%) */}
            <div className="flex-[7] flex flex-col justify-end p-4 sm:p-5 pb-6 sm:pb-8">
              {/* Badges */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-primary text-[10px] text-black font-black tracking-wider">
                  {item.mediaType === 'movie' ? 'FILM' : 'SÉRIE'}
                </span>
                {item.genreLabel && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/70 font-medium">{item.genreLabel}</span>
                )}
                {item.mediaType === 'tv' && item.season && item.episode && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/60 font-medium">S{item.season}E{item.episode}</span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white mb-1 leading-tight line-clamp-2">{item.title}</h2>

              {item.mediaType === 'tv' && item.episodeName && (
                <p className="text-xs text-white/40 mb-1.5">{item.episodeName}</p>
              )}

              {item.overview && (
                <p className="text-[11px] sm:text-xs text-white/35 line-clamp-2 max-w-[300px] sm:max-w-[400px] leading-relaxed mb-3">{item.overview}</p>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 mt-2">
                <button onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}
                  className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-black/30">
                  <Play className="w-4 h-4 fill-current" /> Lecture
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleOpenFullWatch(); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/15 transition-colors">
                  <Maximize2 className="w-3.5 h-3.5" /> Normal
                </button>
              </div>
            </div>

            {/* Right: Action bar (30%) — TikTok style vertical actions */}
            <div className="flex-[3] sm:flex-[2] flex flex-col items-center justify-end gap-4 sm:gap-5 pr-2 sm:pr-3 pb-8 sm:pb-12">
              {/* Profile avatar / poster thumbnail */}
              {item.posterPath && (
                <div className="w-10 h-14 sm:w-11 sm:h-16 rounded-lg overflow-hidden ring-2 ring-white/20 shadow-lg">
                  <img src={`${tmdbImgBase}/w185${item.posterPath}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}

              <LikeButton mediaId={item.id} mediaType={item.mediaType} segment={item.segmentIndex || item.episode || 0} season={item.season} likeTriggerRef={likeTriggerRef} />

              <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
                <MessageCircle className="w-8 h-8 text-white group-hover:text-white/90 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] text-white/60 font-semibold">Commenter</span>
              </button>

              <button onClick={(e) => { e.stopPropagation(); if (navigator.share) navigator.share({ title: item.title, url: window.location.href }).catch(() => {}); }} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
                <Share2 className="w-8 h-8 text-white group-hover:text-white/90 transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] text-white/60 font-semibold">Partager</span>
              </button>

              {/* Server selector button — always visible */}
              <button onClick={(e) => { e.stopPropagation(); setShowServerPicker(true); }} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
                <div className="relative">
                  <Server className="w-8 h-8 text-white group-hover:text-white/90 transition-colors" strokeWidth={1.5} />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[7px] text-black font-black flex items-center justify-center">{shortServerIndex + 1}</span>
                </div>
                <span className="text-[11px] text-white/60 font-semibold">{currentServer?.lang || 'VF'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── PLAYER MODE ─── */}
      {isPlaying && (
        <div className="absolute inset-0 z-40 bg-black flex flex-col">
          <div className="relative flex-1 overflow-hidden">
            <SmartShortPlayer
              src={getShortVideoUrl(item, shortServerIndex)}
              title={`${item.title} - Short`}
              onSwitchServer={() => { setShortServerIndex((currentIdx) => (currentIdx + 1) % VIDEO_SERVERS.length); }}
              serverIndex={shortServerIndex}
              totalServers={VIDEO_SERVERS.length}
            />
          </div>

          {/* Player controls bar */}
          <div className="flex-shrink-0 px-3 sm:px-4 pb-4 sm:pb-5 pt-2 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-primary text-[9px] text-black font-black">
                {item.mediaType === 'movie' ? 'FILM' : 'SÉRIE'}
              </span>
              {item.mediaType === 'tv' && item.season && item.episode && (
                <span className="text-[11px] text-white/40 font-medium">S{item.season}E{item.episode}</span>
              )}
              <span className="text-sm text-white/80 font-semibold truncate">{item.title}</span>
              <div className="flex-1" />
              <span className="text-[10px] text-white/30">{currentServer?.name}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button onClick={() => setIsPlaying(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors text-white/70 text-xs font-medium">
                <Minimize2 className="w-3.5 h-3.5" /> Fermer
              </button>
              <button onClick={handleOpenFullWatch} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors text-white/70 text-xs font-medium">
                <Maximize2 className="w-3.5 h-3.5" /> Normal
              </button>
              <button onClick={() => setShowServerPicker(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors text-primary text-xs font-medium">
                <Server className="w-3.5 h-3.5" /> {currentServer?.lang}
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

      {/* Server picker overlay */}
      {showServerPicker && (
        <ServerPicker currentIndex={shortServerIndex} onSelect={setShortServerIndex} onClose={() => setShowServerPicker(false)} />
      )}

      {/* Comment side panel */}
      {showComments && (
        <CommentPanel mediaId={item.id} mediaType={item.mediaType} segment={item.segmentIndex || item.episode || 0} season={item.season} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}

// ─── Search Overlay ───
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
          .map((r: any): ShortItem => ({ id: r.id, mediaType: r.media_type, title: r.title || r.name || '', overview: r.overview || '', posterPath: r.poster_path, backdropPath: r.backdrop_path, voteAverage: r.vote_average }));
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
      <div className={cn('relative z-10 flex flex-col h-full bg-[#0a0a0a]/95 backdrop-blur-xl transition-transform duration-250 ease-out', visible ? 'translate-y-0' : 'translate-y-full')}>
        <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,12px)] pb-3 border-b border-white/[0.06]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un film, série, anime..." autoFocus
              className="w-full h-10 pl-10 pr-4 rounded-full bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/5"><X className="w-5 h-5 text-white/50" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
          {!loading && results.length === 0 && query.trim() && <p className="text-center text-sm text-white/20 py-8">Aucun résultat</p>}
          {!loading && results.length === 0 && !query.trim() && (
            <div className="flex flex-col items-center py-12"><Search className="w-10 h-10 text-white/[0.06] mb-3" /><p className="text-sm text-white/20">Tapez pour rechercher</p></div>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {results.map(item => (
              <button key={`${item.id}-${item.mediaType}`} onClick={() => { handleClose(); onResultClick(item); }}
                className="rounded-xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left">
                <div className="aspect-[2/3] bg-muted">
                  {item.posterPath && <img src={`https://image.tmdb.org/t/p/w342${item.posterPath}`} alt={item.title} className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="p-2"><p className="text-[11px] font-semibold text-white/80 truncate">{item.title}</p><span className="text-[9px] text-white/30">{item.mediaType === 'movie' ? 'Film' : 'Série'}</span></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Profile genre params ───
function getProfileGenreParams(profileType: string | undefined): string {
  switch (profileType) {
    case 'JEUNESSE': return 'with_genres=16|10751|14&without_genres=27|53|80';
    case 'FRENESIE': return 'with_genres=28|18|27|14|878';
    case 'NOCTURNE': default: return '';
  }
}

function withPage(endpoint: string, page: number): string {
  return endpoint.includes('?') ? `${endpoint}&page=${page}` : `${endpoint}?page=${page}`;
}

// ─── Main Shorts Page ───
export default function ShortsPage() {
  const router = useRouter();
  const { status } = useSession();
  const { profile, getDiscoverEndpoint } = useProfile();
  const { isGuest, enterGuestMode } = useGuest();
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
    if (status === 'unauthenticated' && !isGuest) { enterGuestMode(); }
  }, [status, isGuest, enterGuestMode]);

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
        const profileMoviesEndpoint = profileGenreParams ? `/discover/movie?sort_by=popularity.desc&${profileGenreParams}` : `/trending/movie/week`;
        const profileTvEndpoint = profileGenreParams ? `/discover/tv?sort_by=popularity.desc&${profileGenreParams}` : `/trending/tv/week`;
        const [movies, tvs, animeTv] = await Promise.all([
          fetchTMDB<TMDBResponse<Media>>(withPage(profileMoviesEndpoint, page)),
          fetchTMDB<TMDBResponse<Media>>(withPage(profileTvEndpoint, page)),
          fetchTMDB<TMDBResponse<Media>>(withPage(`/discover/tv?with_genres=16&with_keywords=210024&sort_by=popularity.desc`, page)),
        ]);
        if (movies?.results) {
          for (const m of movies.results.slice(0, 8)) {
            const key = `${m.id}-movie`; if (seen.has(key)) continue; seen.add(key);
            items.push({ id: m.id, mediaType: 'movie', title: m.title || m.original_title || '', overview: m.overview || '', posterPath: m.poster_path, backdropPath: m.backdrop_path, voteAverage: m.vote_average });
          }
        }
        if (tvs?.results) {
          const tvShows = tvs.results.slice(0, 6).filter((show: Media) => { const key = `${show.id}-tv`; if (seen.has(key)) return false; seen.add(key); return true; });
          const tvResults = await Promise.allSettled(tvShows.map((show: Media) => fetchTvEpisode(show, seen)));
          for (const r of tvResults) { if (r.status === 'fulfilled' && r.value) items.push(r.value); }
        }
        if (animeTv?.results) {
          const animeShows = animeTv.results.slice(0, 5).filter((show: Media) => { const key = `${show.id}-tv`; if (seen.has(key)) return false; seen.add(key); return true; });
          const animeResults = await Promise.allSettled(animeShows.map((show: Media) => fetchTvEpisode(show, seen)));
          for (const r of animeResults) { if (r.status === 'fulfilled' && r.value) { r.value.genreLabel = 'Anime'; items.push(r.value); } }
        }
        items.sort(() => Math.random() - 0.5);
      } else if (tab === 'series') {
        const seriesEndpoint = profileGenreParams ? `/discover/tv?sort_by=popularity.desc&${profileGenreParams}` : `/tv/popular`;
        const data = await fetchTMDB<TMDBResponse<Media>>(withPage(seriesEndpoint, page));
        if (data?.results) {
          const shows = data.results.filter((show: Media) => { const key = `${show.id}-tv`; if (seen.has(key)) return false; seen.add(key); return true; });
          const results = await Promise.allSettled(shows.map((show: Media) => fetchTvEpisode(show, seen)));
          for (const r of results) { if (r.status === 'fulfilled' && r.value) items.push(r.value); }
        }
      } else if (tab === 'films') {
        const filmsEndpoint = profileGenreParams ? `/discover/movie?sort_by=popularity.desc&${profileGenreParams}` : `/movie/popular`;
        const data = await fetchTMDB<TMDBResponse<Media>>(withPage(filmsEndpoint, page));
        if (data?.results) {
          for (const movie of data.results) {
            const key = `${movie.id}-movie`; if (seen.has(key)) continue; seen.add(key);
            items.push({ id: movie.id, mediaType: 'movie', title: movie.title || movie.original_title || '', overview: movie.overview || '', posterPath: movie.poster_path, backdropPath: movie.backdrop_path, voteAverage: movie.vote_average });
          }
        }
      } else if (tab === 'anime') {
        const [animeTv, animeMovies] = await Promise.all([
          fetchTMDB<TMDBResponse<Media>>(withPage(`/discover/tv?with_genres=16&with_keywords=210024&sort_by=popularity.desc`, page)),
          fetchTMDB<TMDBResponse<Media>>(withPage(`/discover/movie?with_genres=16&with_keywords=210024&sort_by=popularity.desc`, page)),
        ]);
        if (animeTv?.results) {
          const shows = animeTv.results.filter((show: Media) => { const key = `${show.id}-tv`; if (seen.has(key)) return false; seen.add(key); return true; });
          const results = await Promise.allSettled(shows.map((show: Media) => fetchTvEpisode(show, seen)));
          for (const r of results) { if (r.status === 'fulfilled' && r.value) { r.value.genreLabel = 'Anime'; items.push(r.value); } }
        }
        if (animeMovies?.results) {
          for (const movie of animeMovies.results) {
            const key = `${movie.id}-movie`; if (seen.has(key)) continue; seen.add(key);
            items.push({ id: movie.id, mediaType: 'movie', title: movie.title || movie.original_title || '', overview: movie.overview || '', posterPath: movie.poster_path, backdropPath: movie.backdrop_path, voteAverage: movie.vote_average, genreLabel: 'Anime' });
          }
        }
        items.sort(() => Math.random() - 0.5);
      }
    } catch (error) { console.error('[shorts] Load error:', error); }

    if (append) { setShorts(prev => [...prev, ...items]); } else { setShorts(items); setActiveIndex(0); }
    setLoading(false); setLoadingMore(false); loadingMoreRef.current = false;
  }, [profile?.type, getDiscoverEndpoint]);

  useEffect(() => {
    const isReady = status === 'authenticated' || (status === 'unauthenticated' && isGuest);
    if (isReady) { pageRef.current = 1; seenIdsRef.current = new Set(); loadShorts(activeTab, 1, false); }
  }, [status, isGuest, profile, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 800 && !loadingMoreRef.current) {
        pageRef.current += 1; loadShorts(activeTab, pageRef.current, true);
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [activeTab, loadShorts]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(entry => { if (entry.isIntersecting) { const idx = Number(entry.target.getAttribute('data-index')); if (!isNaN(idx)) setActiveIndex(idx); } }); },
      { root: el, threshold: 0.6 }
    );
    el.querySelectorAll('[data-index]').forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [shorts]);

  const handleSearchResult = (item: ShortItem) => {
    setShorts(prev => { const newShorts = [...prev]; newShorts.splice(activeIndex + 1, 0, item); return newShorts; });
  };

  if (status === 'loading') {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-black relative overflow-hidden">
      {/* Top Bar — floating, translucent */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-4 pt-[env(safe-area-inset-top,12px)] pb-2">
        <button onClick={() => router.push('/')} className="p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/80" />
        </button>

        {/* Tab selector — pill style */}
        <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur-md rounded-full p-0.5">
          {CONTENT_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn('px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all whitespace-nowrap',
                activeTab === tab.key ? 'bg-primary text-black shadow-sm shadow-primary/20' : 'text-white/50 hover:text-white/70'
              )}>
              {tab.label}
            </button>
          ))}
        </div>

        <button onClick={() => setShowSearch(!showSearch)}
          className={cn('p-2 rounded-full backdrop-blur-md transition-colors',
            showSearch ? 'bg-primary/30 text-primary' : 'bg-black/40 text-white/70 hover:bg-black/60'
          )}>
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Shorts Feed — Vertical Snap Scroll */}
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-white/40">Chargement des shorts...</span>
          </div>
        </div>
      ) : shorts.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Zap className="w-12 h-12 text-white/10" />
            <p className="text-base text-white/30">Aucun short disponible</p>
            <p className="text-xs text-white/20">Essayez un autre onglet</p>
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {shorts.map((item, i) => (
            <div key={`${item.id}-${item.mediaType}-${item.segmentIndex ?? ''}-${item.season ?? ''}-${item.episode ?? ''}-${i}`} data-index={i} className="h-full">
              <ShortCard item={item} isActive={i === activeIndex} />
            </div>
          ))}
          {loadingMore && (
            <div className="h-24 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Search overlay */}
      {showSearch && <ShortsSearch onClose={() => setShowSearch(false)} onResultClick={handleSearchResult} />}
    </div>
  );
}
