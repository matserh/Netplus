'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Media,
  MovieDetails,
  TVDetails,
  getBackdropUrl,
  getMediaTitle,
  getMediaYear,
  API_CONFIG,
} from '@/types/media';
import { useChallenge } from '@/contexts/ChallengeContext';
import { useWatchHistory } from '@/contexts/WatchHistoryContext';
import { useDynamicTheme } from '@/contexts/ThemeContext';
import { SmartVideoPlayer } from '@/components/ui/SmartVideoPlayer';
import { SubtitleOverlay } from '@/components/ui/SubtitleOverlay';

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  runtime?: number;
}

interface SeasonDetail {
  id: number;
  name: string;
  season_number: number;
  episodes: Episode[];
}

function WatchLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Chargement...</p>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<WatchLoading />}>
      <WatchContent />
    </Suspense>
  );
}

function WatchContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const {
    isPremium,
    watchCount,
    canWatch,
    incrementWatchCount,
    recordWatchSeconds,
    hasWatchedContent,
    BASIC_LIMIT,
    isLoaded,
  } = useChallenge();
  const { addToHistory, updateProgress, getHistoryEntry } = useWatchHistory();
  const { setContentTheme } = useDynamicTheme();
  const progressSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mediaType = params.type as 'movie' | 'tv';
  const mediaId = parseInt(params.id as string);
  const urlSeason = searchParams.get('s') ? parseInt(searchParams.get('s')!) : undefined;
  const urlEpisode = searchParams.get('e') ? parseInt(searchParams.get('e')!) : undefined;

  const isMovie = mediaType === 'movie';

  const [details, setDetails] = useState<MovieDetails | TVDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(urlSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState(urlEpisode || 1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seasonsList, setSeasonsList] = useState<{ number: number; name: string; episodeCount: number }[]>([]);
  const [serverIndex, setServerIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState('FR');
  const [iframeKey, setIframeKey] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [watchTimer, setWatchTimer] = useState(0);
  const [subtitlesActive, setSubtitlesActive] = useState(false);

  // Check access control
  const hasCheckedAccess = useRef(false);
  useEffect(() => {
    if (!isLoaded || hasCheckedAccess.current) return;
    hasCheckedAccess.current = true;

    if (!canWatch()) {
      setIsBlocked(true);
    } else {
      setIsBlocked(false);
      const allowed = incrementWatchCount();
      if (!allowed) {
        setIsBlocked(true);
      }
    }
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track watch time for challenge (Task 2)
  const watchTimerRef = useRef(0);
  useEffect(() => {
    if (isBlocked || !isLoaded) return;
    const interval = setInterval(() => {
      setWatchTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isBlocked, isLoaded]);

  useEffect(() => {
    watchTimerRef.current = watchTimer;
    if (watchTimer > 0) {
      recordWatchSeconds(watchTimer);
    }
  }, [watchTimer, recordWatchSeconds]);

  // Restore last watched position from history
  useEffect(() => {
    if (!mediaId || !mediaType) return;
    const saved = getHistoryEntry(mediaId, mediaType);
    if (saved) {
      if (!isMovie && saved.season) setCurrentSeason(saved.season);
      if (!isMovie && saved.episode) setCurrentEpisode(saved.episode);
    }
  }, [mediaId, mediaType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch media details
  useEffect(() => {
    if (!mediaId || !mediaType) {
      router.push('/');
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const endpoint = isMovie ? `/movie/${mediaId}` : `/tv/${mediaId}`;
        const res = await fetch(
          `${API_CONFIG.tmdb.baseUrl}${endpoint}?api_key=${API_CONFIG.tmdb.apiKey}&language=${API_CONFIG.language}`
        );
        if (res.ok) {
          const data = await res.json();
          setDetails(data);

          // Dynamic theme: adapt to this content's backdrop
          const bd = data.backdrop_path || data.poster_path;
          if (bd) setContentTheme(`https://image.tmdb.org/t/p/w500${bd}`);

          if (!isMovie && data.seasons) {
            const filtered = data.seasons
              .filter((s: { season_number: number }) => s.season_number > 0)
              .map((s: { season_number: number; name: string; episode_count: number }) => ({
                number: s.season_number,
                name: s.name,
                episodeCount: s.episode_count,
              }));
            setSeasonsList(filtered);
          }
        }
      } catch (err) {
        console.error('Failed to fetch details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [mediaId, mediaType, isMovie, router, setContentTheme]);

  // Fetch episodes for TV when season changes
  useEffect(() => {
    if (isMovie || !mediaId) return;

    const fetchEpisodes = async () => {
      try {
        const res = await fetch(
          `${API_CONFIG.tmdb.baseUrl}/tv/${mediaId}/season/${currentSeason}?api_key=${API_CONFIG.tmdb.apiKey}&language=${API_CONFIG.language}`
        );
        if (res.ok) {
          const data: SeasonDetail = await res.json();
          setEpisodes(data.episodes || []);
          if (currentEpisode > (data.episodes?.length || 1)) {
            setCurrentEpisode(1);
          }
        }
      } catch (err) {
        console.error('Failed to fetch episodes:', err);
      }
    };

    fetchEpisodes();
  }, [mediaId, currentSeason, isMovie, currentEpisode]);

  // Update URL when season/episode changes (for TV)
  useEffect(() => {
    if (!isMovie && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('s', String(currentSeason));
      url.searchParams.set('e', String(currentEpisode));
      window.history.replaceState({}, '', url);
    }
  }, [currentSeason, currentEpisode, isMovie]);

  // Get servers filtered by selected language
  const allServers = Object.values(API_CONFIG.videoServers);
  const filteredServers = allServers.filter(s => s.lang === selectedLang);
  const activeServerIndex = serverIndex % Math.max(filteredServers.length, 1);

  // Build video URL using language-filtered servers
  const getVideoUrl = useCallback(() => {
    const servers = Object.values(API_CONFIG.videoServers).filter(s => s.lang === selectedLang);
    if (servers.length === 0) {
      // Fallback: if no server for this language, use VF
      const fallback = Object.values(API_CONFIG.videoServers).filter(s => s.lang === 'FR');
      const server = fallback[0];
      return isMovie ? server.movieUrl(mediaId) : server.tvUrl(mediaId, currentSeason, currentEpisode);
    }
    const server = servers[activeServerIndex % servers.length];
    return isMovie
      ? server.movieUrl(mediaId)
      : server.tvUrl(mediaId, currentSeason, currentEpisode);
  }, [mediaId, isMovie, currentSeason, currentEpisode, activeServerIndex, selectedLang]);

  // Reload iframe when switching server/episode
  const reloadPlayer = () => {
    setIframeKey(k => k + 1);
  };

  useEffect(() => {
    reloadPlayer();
  }, [serverIndex, currentSeason, currentEpisode, selectedLang]);

  // Save progress to history periodically and on unmount
  useEffect(() => {
    if (!details || !mediaId || !mediaType || isBlocked) return;

    const title = getMediaTitle(details);
    addToHistory({
      id: mediaId,
      mediaType,
      title,
      posterPath: details.poster_path || null,
      backdropPath: details.backdrop_path || null,
      overview: details.overview || '',
      progress: 0,
      timestamp: 0,
      duration: isMovie ? ((details as MovieDetails).runtime || 0) * 60 : 0,
      season: !isMovie ? currentSeason : undefined,
      episode: !isMovie ? currentEpisode : undefined,
      episodeTitle: !isMovie ? episodes.find(e => e.episode_number === currentEpisode)?.name : undefined,
      genreIds: details.genre_ids || details.genres?.map((g: { id: number }) => g.id),
      voteAverage: details.vote_average,
      year: getMediaYear(details as Media),
    });

    // Save progress every 15 seconds
    progressSaveRef.current = setInterval(() => {
      const elapsed = watchTimerRef.current;
      const duration = isMovie ? ((details as MovieDetails).runtime || 0) * 60 : 2400;
      const progress = duration > 0 ? Math.min(Math.round((elapsed / duration) * 100), 100) : 0;
      updateProgress(
        mediaId,
        mediaType,
        progress,
        elapsed,
        duration,
        !isMovie ? currentSeason : undefined,
        !isMovie ? currentEpisode : undefined,
        !isMovie ? episodes.find(e => e.episode_number === currentEpisode)?.name : undefined
      );
    }, 15000);

    return () => {
      if (progressSaveRef.current) clearInterval(progressSaveRef.current);
      // Final save on unmount
      const elapsed = watchTimerRef.current;
      const duration = isMovie ? ((details as MovieDetails).runtime || 0) * 60 : 2400;
      const progress = duration > 0 ? Math.min(Math.round((elapsed / duration) * 100), 100) : 0;
      updateProgress(
        mediaId,
        mediaType,
        progress,
        elapsed,
        duration,
        !isMovie ? currentSeason : undefined,
        !isMovie ? currentEpisode : undefined,
        !isMovie ? episodes.find(e => e.episode_number === currentEpisode)?.name : undefined
      );
    };
  }, [details, mediaId, mediaType, isBlocked, currentSeason, currentEpisode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset watch timer when switching episodes (TV series)
  useEffect(() => {
    if (!isMovie) {
      setWatchTimer(0);
    }
  }, [currentSeason, currentEpisode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also save when episode/season changes
  useEffect(() => {
    if (!details || !mediaId || !mediaType) return;
    const title = getMediaTitle(details);
    const epTitle = !isMovie ? episodes.find(e => e.episode_number === currentEpisode)?.name : undefined;
    updateProgress(
      mediaId,
      mediaType,
      0,
      0,
      isMovie ? ((details as MovieDetails).runtime || 0) * 60 : 2400,
      !isMovie ? currentSeason : undefined,
      !isMovie ? currentEpisode : undefined,
      epTitle
    );
  }, [currentSeason, currentEpisode]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = details ? getMediaTitle(details) : '';
  const year = details ? getMediaYear(details as Media) : '';
  const backdropUrl = getBackdropUrl(details?.backdrop_path || null, 'large');
  const rating = details?.vote_average?.toFixed(1) || 'N/A';
  const genres = (details as MovieDetails)?.genres || (details as TVDetails)?.genres || [];
  const overview = details?.overview || '';
  const runtime = (details as MovieDetails)?.runtime;
  const formattedRuntime = runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}min` : null;
  const numberOfSeasons = (details as TVDetails)?.number_of_seasons;
  const tagline = (details as MovieDetails)?.tagline || (details as TVDetails)?.tagline;

  // Show loading until both TMDB data and challenge state are ready
  if (loading || !isLoaded) {
    return <WatchLoading />;
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Contenu introuvable</h1>
          <p className="text-muted-foreground mb-4 text-sm">Le contenu demand&eacute; n&apos;existe pas.</p>
          <Link href="/" className="text-primary hover:underline text-sm">Retour &agrave; l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  // Access blocked overlay
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-3">Limite atteinte</h1>
          <p className="text-sm text-muted-foreground mb-2">
            Vous avez utilis&eacute; vos {BASIC_LIMIT} contenus gratuits.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Cr&eacute;ez un compte ou accomplissez les 3 d&eacute;fis pour d&eacute;bloquer l&apos;acc&egrave;s illimit&eacute; &mdash; c&apos;est 100% gratuit !
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-amber-500 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-105"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
            </svg>
            Cr&eacute;er un compte
          </Link>
          <div className="mt-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border/40 text-foreground/80 font-medium text-sm hover:border-primary/40 hover:text-primary transition-all"
            >
              Voir les d&eacute;fis
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ← Retour &agrave; l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset server index when switching language
  const handleLangChange = (lang: string) => {
    setSelectedLang(lang);
    setServerIndex(0);
  };

  const serverEntries = filteredServers.length > 0 ? filteredServers : allServers.filter(s => s.lang === 'FR');

  // Get history entry for progress display
  const historyEntry = getHistoryEntry(mediaId, mediaType);
  const hasProgress = historyEntry && historyEntry.progress > 0 && historyEntry.progress < 95;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-4 h-11 sm:h-12 bg-black/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 text-primary font-bold text-xs sm:text-sm flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-primary">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="hidden xs:inline">NETPLUS</span>
          </Link>
          {isPremium && (
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] sm:text-[10px] font-bold flex-shrink-0 animate-premium-glow">
              VIP
            </span>
          )}
          <span className="text-white/20 flex-shrink-0">|</span>
          <span className="text-white/70 text-xs sm:text-sm font-medium truncate">{title}</span>
          {!isMovie && (
            <span className="text-primary/60 text-[10px] sm:text-xs flex-shrink-0">
              S{currentSeason}E{currentEpisode}
            </span>
          )}
        </div>
        <button
          onClick={() => router.back()}
          className="text-white/50 hover:text-white text-xs sm:text-sm flex items-center gap-1 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="hidden sm:inline">Fermer</span>
        </button>
      </div>

      {/* Video Player with smart server detection + AI Subtitles */}
      <div className="pt-11 sm:pt-12 relative">
        <SmartVideoPlayer
          key={iframeKey}
          src={getVideoUrl()}
          title={title}
          serverIndex={serverIndex}
          totalServers={serverEntries.length}
          onNextServer={() => setServerIndex(i => (i + 1) % Math.max(serverEntries.length, 1))}
          onRetry={() => setIframeKey(k => k + 1)}
          aspectClass="aspect-video"
        />
        {/* AI Subtitle text overlay on top of video */}
        <SubtitleOverlay
          tmdbId={mediaId}
          mediaType={isMovie ? 'movie' : 'tv'}
          season={!isMovie ? currentSeason : undefined}
          episode={!isMovie ? currentEpisode : undefined}
          currentTime={watchTimer}
          isActive={subtitlesActive}
          onToggle={() => setSubtitlesActive(prev => !prev)}
          overlayOnly
        />
      </div>

      {/* Resume indicator */}
      {hasProgress && (
        <div className="px-3 sm:px-6 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
            <svg className="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-primary/70">
              Reprise &agrave; {historyEntry.progress}% &mdash; {historyEntry.timestamp > 60 ? `${Math.floor(historyEntry.timestamp / 60)}min` : `${historyEntry.timestamp}s`}
            </span>
            <div className="flex-1 h-1 bg-primary/10 rounded-full overflow-hidden ml-1">
              <div className="h-full bg-primary rounded-full" style={{ width: `${historyEntry.progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Content Below Player */}
      <div className="px-3 sm:px-6 py-4 sm:py-8">
        {/* Title & Meta */}
        <div className="mb-4 sm:mb-6">
          {tagline && (
            <p className="text-primary/70 text-[11px] sm:text-sm italic mb-0.5">{tagline}</p>
          )}
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-foreground mb-2 leading-tight">{title}</h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-primary fill-primary" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="font-semibold">{rating}</span>
            </span>
            {year && <span>{year}</span>}
            {formattedRuntime && <span>{formattedRuntime}</span>}
            {numberOfSeasons && <span>{numberOfSeasons} saison{numberOfSeasons > 1 ? 's' : ''}</span>}
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] sm:text-xs font-bold">
              {isMovie ? 'FILM' : 'SÉRIE'}
            </span>
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
              {genres.map(g => (
                <span key={g.id} className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/5 text-[10px] sm:text-xs text-white/60 border border-white/10">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">{overview}</p>
        </div>

        {/* Language Selector + Server Switch + AI Subtitles */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v4a2 2 0 00-2-2" />
              </svg>
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">Lecteur vidéo</span>
            </div>
            {/* AI Subtitles toggle */}
            <button
              onClick={() => setSubtitlesActive(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                subtitlesActive
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-white/5 text-white/60 hover:bg-primary/20 hover:text-primary border-white/10 hover:border-primary/30'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {subtitlesActive ? 'Sous-titres ON' : 'Sous-titres IA'}
            </button>
          </div>

          {/* Language Tabs */}
          <div className="flex gap-1 sm:gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {API_CONFIG.languageGroups.map(g => {
              const serverCount = allServers.filter(s => s.lang === g.id).length;
              if (serverCount === 0) return null;
              return (
                <button
                  key={g.id}
                  onClick={() => handleLangChange(g.id)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedLang === g.id
                      ? 'bg-primary text-black shadow-lg shadow-primary/20'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  <span>{g.flag}</span>
                  <span>{g.label}</span>
                  <span className={`px-1 py-0.5 rounded text-[9px] font-black ${
                    selectedLang === g.id
                      ? 'bg-black/20 text-black'
                      : 'bg-white/10 text-white/30'
                  }`}>
                    {serverCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Server buttons for selected language */}
          <div className="flex flex-wrap gap-2">
            {serverEntries.map((server, idx) => (
              <button
                key={`${server.lang}-${server.name}-${idx}`}
                onClick={() => setServerIndex(idx)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeServerIndex === idx
                    ? 'bg-white/10 text-white border border-primary/40'
                    : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60 border border-transparent'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  activeServerIndex === idx ? 'bg-primary' : 'bg-white/20'
                }`} />
                <span>{server.name}</span>
                {activeServerIndex === idx && (
                  <span className="text-[9px] text-primary font-bold">ACTIF</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* TV Series: Season & Episode Selector */}
        {!isMovie && seasonsList.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-3">Épisodes</h2>

            {/* Season Tabs */}
            <div className="flex gap-1.5 sm:gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
              {seasonsList.map(s => (
                <button
                  key={s.number}
                  onClick={() => setCurrentSeason(s.number)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    currentSeason === s.number
                      ? 'bg-primary text-black'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  S{s.number}
                </button>
              ))}
            </div>

            {/* Episode List */}
            <div className="space-y-1.5 sm:space-y-2 max-h-[50vh] overflow-y-auto pr-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'oklch(0.75 0.14 55) transparent' }}
            >
              {episodes.map(ep => {
                const epHistory = getHistoryEntry(mediaId, mediaType);
                const isCurrentlyPlaying = currentEpisode === ep.episode_number;
                
                return (
                  <button
                    key={ep.id}
                    onClick={() => setCurrentEpisode(ep.episode_number)}
                    className={`w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg transition-all text-left ${
                      isCurrentlyPlaying
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-white/[0.02] hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {/* Episode Number */}
                    <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                      isCurrentlyPlaying
                        ? 'bg-primary text-black'
                        : 'bg-white/5 text-white/40'
                    }`}>
                      {ep.episode_number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{ep.name}</p>
                        {ep.runtime && (
                          <span className="text-[10px] text-white/30 flex-shrink-0">{ep.runtime}min</span>
                        )}
                      </div>
                      {ep.overview && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">{ep.overview}</p>
                      )}
                    </div>

                    {/* Now Playing Indicator */}
                    {isCurrentlyPlaying && (
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] text-primary font-medium hidden sm:inline">En cours</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Watch Progress Info */}
        {watchTimer > 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  Temps de visionnage : {Math.floor(watchTimer / 60)}min {watchTimer % 60}s
                </p>
                <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((watchTimer / (isMovie ? ((details as MovieDetails)?.runtime || 120) * 60 : 2400)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Link to History */}
        <div className="flex items-center justify-between">
          <Link
            href="/history"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Voir l&apos;historique
          </Link>
          <Link
            href="/shorts"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Shorts
          </Link>
        </div>
      </div>

      {/* Subtle backdrop decoration */}
      {backdropUrl && (
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <Image src={backdropUrl} alt="" fill className="object-cover opacity-[0.02]" />
          <div className="absolute inset-0 bg-background" />
        </div>
      )}
    </div>
  );
}
