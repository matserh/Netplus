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
import { ANIME_SERVERS, ANIME_LANGUAGE_GROUPS, getAnimeServersByGroup } from '@/types/servers/anime';
import type { AnimeVideoServer, AnimeLanguageGroup } from '@/types/servers/anime';
import { SmartVideoPlayer } from '@/components/ui/SmartVideoPlayer';
import { useChallenge } from '@/contexts/ChallengeContext';
import { useWatchHistory } from '@/contexts/WatchHistoryContext';
import { useDynamicTheme } from '@/contexts/ThemeContext';
import { useSession } from '@/contexts/AuthContext';

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

interface AnimeStreamResult {
  url: string;
  provider: string;
  audioType: string;
  fallbacks?: string[];
}

function AnimeWatchLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Chargement de l&apos;anime...</p>
      </div>
    </div>
  );
}

export default function AnimeWatchPage() {
  return (
    <Suspense fallback={<AnimeWatchLoading />}>
      <AnimeWatchContent />
    </Suspense>
  );
}

function AnimeWatchContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { isPremium, isLoaded, canWatch, incrementWatchCount, getUserLimit, watchCount, isAdminUser } = useChallenge();
  const { addToHistory, updateProgress, getHistoryEntry } = useWatchHistory();
  const { setContentTheme } = useDynamicTheme();
  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === 'authenticated';

  // Content limit check for non-premium/non-admin
  const [isBlocked, setIsBlocked] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const limitChecked = useRef(false);

  useEffect(() => {
    if (isLoaded && !limitChecked.current) {
      limitChecked.current = true;
      if (!canWatch()) {
        const limit = getUserLimit();
        setLimitMessage(isAuthenticated
          ? `Limite atteinte (${limit} contenus). Complétez les tâches pour débloquer l'accès illimité.`
          : `Limite invité atteinte (${limit} contenus). Connectez-vous pour plus d'accès.`);
        setIsBlocked(true);
      } else {
        incrementWatchCount();
      }
    }
  }, [isLoaded]);

  // Route params
  const mediaId = parseInt(params.id as string);
  const urlEpisode = searchParams.get('e') ? parseInt(searchParams.get('e')!) : undefined;
  const anilistIdParam = searchParams.get('anilistId');

  // Media state
  const [details, setDetails] = useState<MovieDetails | TVDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentEpisode, setCurrentEpisode] = useState(urlEpisode || 1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seasonsList, setSeasonsList] = useState<{ number: number; name: string; episodeCount: number }[]>([]);
  const [currentSeason, setCurrentSeason] = useState(1);

  // Anime-specific state
  const [selectedLangGroup, setSelectedLangGroup] = useState('VF');
  const [serverIndex, setServerIndex] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [anilistId, setAnilistId] = useState<number | null>(
    anilistIdParam ? parseInt(anilistIdParam) : null
  );
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [streamLoading, setStreamLoading] = useState(true);
  const [watchTimer, setWatchTimer] = useState(0);

  const progressSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchTimerRef = useRef(0);

  // Fetch media details from TMDB
  useEffect(() => {
    if (!mediaId) {
      router.push('/');
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Try TV first (most anime are TV type)
        let res = await fetch(
          `${API_CONFIG.tmdb.baseUrl}/tv/${mediaId}?api_key=${API_CONFIG.tmdb.apiKey}&language=${API_CONFIG.language}`
        );
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
          // Map TMDB ID to Anilist ID
          mapToAnilist(mediaId, data.name || data.title || '');
          setContentTheme(data.backdrop_path || null);
          setLoading(false);
          return;
        }

        // Try movie
        res = await fetch(
          `${API_CONFIG.tmdb.baseUrl}/movie/${mediaId}?api_key=${API_CONFIG.tmdb.apiKey}&language=${API_CONFIG.language}`
        );
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
          mapToAnilist(mediaId, data.title || data.name || '');
          setContentTheme(data.backdrop_path || null);
        }
      } catch (err) {
        console.error('Failed to fetch anime details:', err);
      }
      setLoading(false);
    };

    fetchDetails();
  }, [mediaId]);

  // Map TMDB ID to Anilist ID
  const mapToAnilist = async (tmdbId: number, title: string) => {
    if (anilistId) return;
    try {
      const res = await fetch('/api/anime/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId, title }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.anilistId) {
          setAnilistId(data.anilistId);
        }
      }
    } catch (err) {
      console.error('Failed to map to Anilist:', err);
    }
  };

  // Fetch episodes for current season
  useEffect(() => {
    if (!mediaId) return;
    const fetchEpisodes = async () => {
      try {
        const res = await fetch(
          `${API_CONFIG.tmdb.baseUrl}/tv/${mediaId}/season/${currentSeason}?api_key=${API_CONFIG.tmdb.apiKey}&language=${API_CONFIG.language}`
        );
        if (res.ok) {
          const data = await res.json();
          setEpisodes(data.episodes || []);
        }
      } catch (err) {
        console.error('Failed to fetch episodes:', err);
      }
    };
    fetchEpisodes();
  }, [mediaId, currentSeason]);

  // Update URL when episode changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('e', String(currentEpisode));
      window.history.replaceState({}, '', url);
    }
  }, [currentEpisode]);

  // Fetch streaming URL when source changes
  const fetchStreamUrl = useCallback(async () => {
    if (!anilistId) {
      // Fallback to debrid URL while waiting for Anilist mapping
      setStreamUrl(`https://vidsrc.pm/embed/tv/${mediaId}/${currentSeason}/${currentEpisode}?lang=fr`);
      setStreamLoading(false);
      return;
    }

    setStreamLoading(true);
    try {
      const group = ANIME_LANGUAGE_GROUPS.find(g => g.id === selectedLangGroup);
      const audioType = group?.audioType || 'sub';
      const servers = getAnimeServersByGroup(selectedLangGroup);
      const server = servers[serverIndex % Math.max(servers.length, 1)];
      
      if (!server) {
        setStreamUrl('');
        setStreamLoading(false);
        return;
      }

      // Build the API URL
      const apiUrl = server.buildUrl({
        anilistId,
        episode: currentEpisode,
        audioType,
        dubLang: selectedLangGroup === 'VF' ? 'fr' : selectedLangGroup === 'DUB_EN' ? 'en' : undefined,
      });

      if (apiUrl && apiUrl.startsWith('/api/')) {
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data: AnimeStreamResult = await res.json();
          if (data.url) {
            setStreamUrl(data.url);
          } else if (data.fallbacks?.length) {
            setStreamUrl(data.fallbacks[0]);
          } else {
            // Ultimate fallback to vidsrc
            setStreamUrl(`https://vidsrc.pm/embed/tv/${mediaId}/${currentSeason}/${currentEpisode}?lang=fr`);
          }
        } else {
          setStreamUrl(`https://vidsrc.pm/embed/tv/${mediaId}/${currentSeason}/${currentEpisode}?lang=fr`);
        }
      } else if (apiUrl) {
        setStreamUrl(apiUrl);
      } else {
        setStreamUrl(`https://vidsrc.pm/embed/tv/${mediaId}/${currentSeason}/${currentEpisode}?lang=fr`);
      }
    } catch (err) {
      console.error('Failed to fetch stream:', err);
      setStreamUrl(`https://vidsrc.pm/embed/tv/${mediaId}/${currentSeason}/${currentEpisode}?lang=fr`);
    }
    setStreamLoading(false);
  }, [anilistId, currentEpisode, selectedLangGroup, serverIndex, mediaId, currentSeason]);

  useEffect(() => {
    fetchStreamUrl();
  }, [fetchStreamUrl]);

  // Build seasons list
  useEffect(() => {
    if (details && 'number_of_seasons' in details) {
      const tvDetails = details as TVDetails;
      setSeasonsList(
        tvDetails.seasons
          ?.filter(s => s.season_number > 0)
          .map(s => ({
            number: s.season_number,
            name: s.name,
            episodeCount: s.episode_count,
          })) || []
      );
    }
  }, [details]);

  // Watch timer
  useEffect(() => {
    if (isBlocked || !isLoaded) return;
    const interval = setInterval(() => {
      setWatchTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isBlocked, isLoaded]);

  useEffect(() => {
    watchTimerRef.current = watchTimer;
  }, [watchTimer]);

  // Save progress
  useEffect(() => {
    if (!details || !mediaId || isBlocked) return;
    const title = getMediaTitle(details);
    addToHistory({
      id: mediaId,
      mediaType: 'tv',
      title,
      posterPath: details.poster_path || null,
      backdropPath: details.backdrop_path || null,
      overview: details.overview || '',
      progress: 0,
      timestamp: 0,
      duration: 1440,
      season: currentSeason,
      episode: currentEpisode,
      episodeTitle: episodes.find(e => e.episode_number === currentEpisode)?.name,
      genreIds: details.genre_ids || details.genres?.map((g: { id: number }) => g.id),
      voteAverage: details.vote_average,
      year: getMediaYear(details as Media),
    });

    progressSaveRef.current = setInterval(() => {
      const elapsed = watchTimerRef.current;
      const duration = 1440;
      const progress = duration > 0 ? Math.min(Math.round((elapsed / duration) * 100), 100) : 0;
      updateProgress(mediaId, 'tv', progress, elapsed, duration, currentSeason, currentEpisode,
        episodes.find(e => e.episode_number === currentEpisode)?.name
      );
    }, 15000);

    return () => {
      if (progressSaveRef.current) clearInterval(progressSaveRef.current);
      const elapsed = watchTimerRef.current;
      const duration = 1440;
      const progress = duration > 0 ? Math.min(Math.round((elapsed / duration) * 100), 100) : 0;
      updateProgress(mediaId, 'tv', progress, elapsed, duration, currentSeason, currentEpisode,
        episodes.find(e => e.episode_number === currentEpisode)?.name
      );
    };
  }, [details, mediaId, isBlocked, currentSeason, currentEpisode]);

  // Reset episode timer
  useEffect(() => {
    setWatchTimer(0);
  }, [currentSeason, currentEpisode]);

  // UI state
  const title = details ? getMediaTitle(details) : '';
  const year = details ? getMediaYear(details as Media) : '';
  const backdropUrl = getBackdropUrl(details?.backdrop_path || null, 'large');
  const rating = details?.vote_average?.toFixed(1) || 'N/A';
  const genres = (details as MovieDetails)?.genres || (details as TVDetails)?.genres || [];
  const overview = details?.overview || '';
  const numberOfSeasons = (details as TVDetails)?.number_of_seasons;

  // Server state
  const currentServers = getAnimeServersByGroup(selectedLangGroup);
  const activeServer = currentServers[serverIndex % Math.max(currentServers.length, 1)];

  const handleLangGroupChange = (groupId: string) => {
    setSelectedLangGroup(groupId);
    setServerIndex(0);
    setIframeKey(k => k + 1);
  };

  // Loading state
  if (loading || !isLoaded) {
    return <AnimeWatchLoading />;
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Anime introuvable</h1>
          <Link href="/" className="text-primary hover:underline text-sm">Retour &agrave; l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar — Anime themed */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-4 h-11 sm:h-12 bg-black/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 text-primary font-bold text-xs sm:text-sm flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-primary">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="hidden xs:inline">NETPLUS</span>
          </Link>
          <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] sm:text-[10px] font-bold flex-shrink-0">
            ANIME
          </span>
          <span className="text-white/20 flex-shrink-0">|</span>
          <span className="text-white/70 text-xs sm:text-sm font-medium truncate">{title}</span>
          <span className="text-primary/60 text-[10px] sm:text-xs flex-shrink-0">
            S{currentSeason}E{currentEpisode}
          </span>
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

      {/* Video Player */}
      {isBlocked ? (
        <div className="pt-11 sm:pt-12 relative">
          <div className="aspect-video bg-black/80 flex items-center justify-center">
            <div className="text-center p-6 max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Limite atteinte</h3>
              <p className="text-sm text-muted-foreground mb-4">{limitMessage}</p>
              <div className="flex gap-3 justify-center">
                {!isAuthenticated && (
                  <button onClick={() => router.push('/login')} className="px-4 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-all">Se connecter</button>
                )}
                <button onClick={() => router.push('/pricing')} className="px-4 py-2 rounded-lg bg-white/10 text-foreground font-medium text-sm hover:bg-white/15 transition-all">Voir les offres</button>
              </div>
            </div>
          </div>
        </div>
      ) : (<>
      <div className="pt-11 sm:pt-12 relative">
        {streamLoading ? (
          <div className="aspect-video bg-black/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-xs">Recherche de la source...</p>
            </div>
          </div>
        ) : streamUrl ? (
          <SmartVideoPlayer
            key={iframeKey}
            src={streamUrl}
            title={`${title} - Episode ${currentEpisode}`}
            serverIndex={serverIndex}
            totalServers={currentServers.length}
            onNextServer={() => {
              setServerIndex(i => (i + 1) % Math.max(currentServers.length, 1));
              setIframeKey(k => k + 1);
            }}
            onRetry={() => setIframeKey(k => k + 1)}
            aspectClass="aspect-video"
          />
        ) : (
          <div className="aspect-video bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">Aucune source disponible</p>
              <button
                onClick={() => {
                  setServerIndex(i => (i + 1) % Math.max(currentServers.length, 1));
                }}
                className="text-primary text-xs hover:underline"
              >
                Essayer un autre serveur
              </button>
            </div>
          </div>
        )}
      </div>
      </>)}

      {/* Content Below Player */}
      {!isBlocked && (
      <div className="px-3 sm:px-6 py-4 sm:py-8">
        {/* Title & Meta */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-foreground mb-2 leading-tight">{title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-primary fill-primary" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="font-semibold">{rating}</span>
            </span>
            {year && <span>{year}</span>}
            {numberOfSeasons && <span>{numberOfSeasons} saison{numberOfSeasons > 1 ? 's' : ''}</span>}
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] sm:text-xs font-bold">
              ANIME
            </span>
            {anilistId && (
              <a
                href={`https://anilist.co/anime/${anilistId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] sm:text-xs font-bold hover:bg-blue-500/30 transition-colors"
              >
                Anilist
              </a>
            )}
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
              {genres.map(g => (
                <span key={g.id} className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-primary/10 text-[10px] sm:text-xs text-primary/80 border border-primary/20">
                  {g.name}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">{overview}</p>
        </div>

        {/* Anime Language & Server Selector */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.02] border border-primary/10">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">Lecteur Anime</span>
          </div>

          {/* Audio Type Tabs: VF / VOSTFR / Dub EN — guests only see VOSTFR */}
          <div className="flex gap-1 sm:gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {(isAuthenticated ? ANIME_LANGUAGE_GROUPS : ANIME_LANGUAGE_GROUPS.filter(g => g.id === 'VOSTFR')).map(g => {
              const serverCount = getAnimeServersByGroup(g.id).length;
              return (
                <button
                  key={g.id}
                  onClick={() => handleLangGroupChange(g.id)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedLangGroup === g.id
                      ? 'bg-primary text-black shadow-lg shadow-primary/20'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  <span>{g.flag}</span>
                  <span>{g.label}</span>
                  <span className={`px-1 py-0.5 rounded text-[9px] font-black ${
                    selectedLangGroup === g.id
                      ? 'bg-black/20 text-black'
                      : 'bg-white/10 text-white/30'
                  }`}>
                    {serverCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Audio type description */}
          {(() => {
            const group = ANIME_LANGUAGE_GROUPS.find(g => g.id === selectedLangGroup);
            return group ? (
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 italic">
                {group.description}
                {group.audioType === 'dub' && ' — Audio doublé'}
                {group.audioType === 'sub' && ' — Version originale sous-titrée'}
              </p>
            ) : null;
          })()}

          {/* Server buttons */}
          <div className="flex flex-wrap gap-2">
            {currentServers.map((server, idx) => (
              <button
                key={`${server.provider}-${server.name}-${idx}`}
                onClick={() => {
                  setServerIndex(idx);
                  setIframeKey(k => k + 1);
                }}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  serverIndex % Math.max(currentServers.length, 1) === idx
                    ? 'bg-white/10 text-white border border-primary/40'
                    : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60 border border-transparent'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  serverIndex % Math.max(currentServers.length, 1) === idx ? 'bg-primary' : 'bg-white/20'
                }`} />
                <span>{server.name}</span>
                <span className="text-[9px] text-white/20">{server.provider}</span>
                {serverIndex % Math.max(currentServers.length, 1) === idx && (
                  <span className="text-[9px] text-primary font-bold">ACTIF</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Season & Episode Selector */}
        {seasonsList.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-3">
              Épisodes
              <span className="text-primary/60 text-xs ml-2">{episodes.length} épisodes</span>
            </h2>

            {/* Season Tabs */}
            {seasonsList.length > 1 && (
              <div className="flex gap-1.5 sm:gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                {seasonsList.map(s => (
                  <button
                    key={s.number}
                    onClick={() => { setCurrentSeason(s.number); setCurrentEpisode(1); }}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      currentSeason === s.number
                        ? 'bg-primary text-black'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    S{s.number}
                    <span className="text-[9px] ml-1 opacity-60">({s.episodeCount})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Episode Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2 max-h-[50vh] overflow-y-auto pr-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'oklch(0.75 0.14 55) transparent' }}
            >
              {episodes.map(ep => {
                const isPlaying = currentEpisode === ep.episode_number;
                return (
                  <button
                    key={ep.id}
                    onClick={() => setCurrentEpisode(ep.episode_number)}
                    className={`flex items-center justify-center py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      isPlaying
                        ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-105'
                        : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.08] hover:text-white/70'
                    }`}
                    title={ep.name}
                  >
                    {ep.episode_number}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Watch Timer */}
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
                  Visionnage : {Math.floor(watchTimer / 60)}min {watchTimer % 60}s
                </p>
                <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((watchTimer / 1440) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex items-center justify-between">
          <Link
            href="/history"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Historique
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
      )}

      {/* Backdrop */}
      {backdropUrl && (
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <Image src={backdropUrl} alt="" fill className="object-cover opacity-[0.02]" />
          <div className="absolute inset-0 bg-background" />
        </div>
      )}
    </div>
  );
}
