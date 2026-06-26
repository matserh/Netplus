'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const progressSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mediaId = searchParams.get('id');
  const mediaType = searchParams.get('type');

  const [details, setDetails] = useState<MovieDetails | TVDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seasonsList, setSeasonsList] = useState<{ number: number; name: string; episodeCount: number }[]>([]);
  const [serverIndex, setServerIndex] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [watchTimer, setWatchTimer] = useState(0);
  const [subtitlesActive, setSubtitlesActive] = useState(false);

  const isMovie = mediaType === 'movie';

  // Check access control — wait for challenge state to load from localStorage
  const hasCheckedAccess = useRef(false);
  useEffect(() => {
    if (!isLoaded || hasCheckedAccess.current) return;
    hasCheckedAccess.current = true;

    if (!canWatch()) {
      setIsBlocked(true);
    } else {
      setIsBlocked(false);
      // Increment watch count when entering watch page
      const allowed = incrementWatchCount();
      if (!allowed) {
        setIsBlocked(true);
      }
    }
  }, [isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track watch time for challenge (Task 2)
  // Use a ref to avoid side effects inside setState updater
  const watchTimerRef = useRef(0);
  useEffect(() => {
    if (isBlocked || !isLoaded) return;

    const interval = setInterval(() => {
      setWatchTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isBlocked, isLoaded]);

  // Record watch seconds separately to avoid side effects in setState
  useEffect(() => {
    watchTimerRef.current = watchTimer;
    if (watchTimer > 0) {
      recordWatchSeconds(watchTimer);
    }
  }, [watchTimer, recordWatchSeconds]);

  // Restore last watched position from history
  useEffect(() => {
    if (!mediaId || !mediaType) return;
    const saved = getHistoryEntry(Number(mediaId), mediaType as 'movie' | 'tv');
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
  }, [mediaId, mediaType, isMovie, router]);

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

  // Build video URL
  const getVideoUrl = useCallback(() => {
    const id = Number(mediaId);
    const servers = Object.values(API_CONFIG.videoServers);
    const server = servers[serverIndex % servers.length];

    if (isMovie) {
      return server.movieUrl(id);
    } else {
      return server.tvUrl(id, currentSeason, currentEpisode);
    }
  }, [mediaId, isMovie, currentSeason, currentEpisode, serverIndex]);

  // Reload iframe when switching server/episode
  const reloadPlayer = () => {
    setIframeKey(k => k + 1);
  };

  useEffect(() => {
    reloadPlayer();
  }, [serverIndex, currentSeason, currentEpisode]);

  // Save progress to history periodically and on unmount
  // NOTE: watchTimer is NOT in deps to avoid re-creating the interval every second.
  // Instead, we use watchTimerRef inside the interval callback.
  useEffect(() => {
    if (!details || !mediaId || !mediaType || isBlocked) return;

    // Add to history immediately when watching
    const title = getMediaTitle(details);
    addToHistory({
      id: Number(mediaId),
      mediaType: mediaType as 'movie' | 'tv',
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

    // Save progress every 15 seconds using ref to get latest timer value
    progressSaveRef.current = setInterval(() => {
      const elapsed = watchTimerRef.current;
      const duration = isMovie ? ((details as MovieDetails).runtime || 0) * 60 : 2400;
      const progress = duration > 0 ? Math.min(Math.round((elapsed / duration) * 100), 100) : 0;
      updateProgress(
        Number(mediaId),
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
        Number(mediaId),
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
      Number(mediaId),
      mediaType,
      0, // Reset progress for new episode
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
            Vous avez utilis&eacute; vos {BASIC_LIMIT} contenus gratuits de la version basique.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Accomplissez les 3 d&eacute;fis simples pour d&eacute;bloquer l&apos;acc&egrave;s illimit&eacute; &mdash; c&apos;est 100% gratuit !
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-amber-500 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-105"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
            </svg>
            D&eacute;bloquer l&apos;acc&egrave;s illimit&eacute;
          </Link>
          <div className="mt-4">
            <Link href="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ← Retour &agrave; l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const serverEntries = Object.values(API_CONFIG.videoServers);

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
          onNextServer={() => setServerIndex(i => (i + 1) % serverEntries.length)}
          onRetry={() => setIframeKey(k => k + 1)}
          aspectClass="aspect-video"
        />
        {/* AI Subtitle text overlay on top of video — controls only in server section */}
        <SubtitleOverlay
          tmdbId={Number(mediaId)}
          mediaType={isMovie ? 'movie' : 'tv'}
          season={!isMovie ? currentSeason : undefined}
          episode={!isMovie ? currentEpisode : undefined}
          currentTime={watchTimer}
          isActive={subtitlesActive}
          onToggle={() => setSubtitlesActive(prev => !prev)}
          overlayOnly
        />
      </div>

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

        {/* Server Switch + AI Subtitles */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">Serveur de lecture</span>
            </div>
            {/* AI Subtitles toggle — single button only */}
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
          <div className="flex flex-wrap gap-2">
            {serverEntries.map((server, idx) => {
              const lang = (server as { lang?: string }).lang || 'VO';
              const isVF = lang === 'VF';
              const isVOSTFR = lang === 'VOSTFR';
              return (
                <button
                  key={server.name}
                  onClick={() => setServerIndex(idx)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    serverIndex === idx
                      ? 'bg-primary text-black shadow-lg shadow-primary/20'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                  }`}
                >
                  <span className={`px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-black leading-none ${
                    serverIndex === idx
                      ? 'bg-black/20 text-black'
                      : isVF
                      ? 'bg-blue-500/20 text-blue-400'
                      : isVOSTFR
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/10 text-white/40'
                  }`}>
                    {lang}
                  </span>
                  <span>{server.name.replace(' VF', '').replace(' VOSTFR', '')}</span>
                </button>
              );
            })}
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
              {episodes.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => setCurrentEpisode(ep.episode_number)}
                  className={`w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg transition-all text-left ${
                    currentEpisode === ep.episode_number
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-white/[0.02] hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Episode Number */}
                  <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                    currentEpisode === ep.episode_number
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
                  {currentEpisode === ep.episode_number && (
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] text-primary font-medium hidden sm:inline">En cours</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
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
