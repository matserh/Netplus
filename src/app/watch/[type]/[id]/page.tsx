'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Play, Star, Calendar, Clock, Film, Tv, ChevronDown, ChevronUp } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

interface MediaDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  seasons?: { id: number; season_number: number; episode_count: number; name: string }[];
  genres: { id: number; name: string }[];
}

// Working video servers
const VIDEO_SERVERS = {
  vidsrc: {
    name: 'VidSrc',
    movie: (id: number) => `https://vidsrc.pro/embed/movie/${id}`,
    tv: (id: number, season: number, episode: number) => `https://vidsrc.pro/embed/tv/${id}/${season}/${episode}`,
  },
  embedsu: {
    name: 'EmbedSu', 
    movie: (id: number) => `https://embed.su/embed/movie/${id}`,
    tv: (id: number, season: number, episode: number) => `https://embed.su/embed/tv/${id}/${season}/${episode}`,
  },
  vidsrccc: {
    name: 'VidSrc CC',
    movie: (id: number) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    tv: (id: number, season: number, episode: number) => `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`,
  },
  smashystream: {
    name: 'Smashy',
    movie: (id: number) => `https://player.smashy.stream/movie/${id}`,
    tv: (id: number, season: number, episode: number) => `https://player.smashy.stream/tv/${id}?s=${season}&e=${episode}`,
  },
  autoembed: {
    name: 'AutoEmbed',
    movie: (id: number) => `https://autoembed.co/movie/tmdb/${id}`,
    tv: (id: number, season: number, episode: number) => `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`,
  }
};

function WatchContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const type = params.type as 'movie' | 'tv';
  const id = parseInt(params.id as string);
  const urlSeason = searchParams.get('s') ? parseInt(searchParams.get('s')!) : 1;
  const urlEpisode = searchParams.get('e') ? parseInt(searchParams.get('e')!) : 1;
  
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentServer, setCurrentServer] = useState<keyof typeof VIDEO_SERVERS>('vidsrc');
  const [season, setSeason] = useState(urlSeason);
  const [episode, setEpisode] = useState(urlEpisode);
  const [showServers, setShowServers] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=fr-FR`
        );
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [type, id]);

  useEffect(() => {
    // Update URL when season/episode changes
    if (type === 'tv') {
      const url = new URL(window.location.href);
      url.searchParams.set('s', String(season));
      url.searchParams.set('e', String(episode));
      window.history.replaceState({}, '', url);
    }
  }, [season, episode, type]);

  const getVideoUrl = () => {
    const server = VIDEO_SERVERS[currentServer];
    if (type === 'movie') {
      return server.movie(id);
    }
    return server.tv(id, season, episode);
  };

  const title = details?.title || details?.name || '';
  const year = details?.release_date?.slice(0, 4) || details?.first_air_date?.slice(0, 4) || '';
  const rating = details?.vote_average?.toFixed(1) || 'N/A';
  const runtime = details?.runtime;
  const seasons = details?.seasons?.filter(s => s.season_number > 0) || [];
  const currentSeasonData = seasons.find(s => s.season_number === season);
  const episodeCount = currentSeasonData?.episode_count || 20;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo size="sm" />
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-black font-bold">
              {type === 'movie' ? 'FILM' : 'SÉRIE'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Video Player */}
      <div className="pt-14">
        <div className="relative w-full aspect-video bg-black">
          <iframe
            key={`${currentServer}-${type}-${id}-${season}-${episode}`}
            src={getVideoUrl()}
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>

        {/* Info Bar */}
        <div className="bg-card border-b border-border/50">
          <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-foreground line-clamp-1">{title}</h1>
              <div className="flex items-center gap-1.5 text-sm">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="font-medium">{rating}</span>
              </div>
              {year && <span className="text-sm text-muted-foreground">{year}</span>}
            </div>

            {/* TV Show Controls */}
            {type === 'tv' && seasons.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={String(season)} onValueChange={(v) => { setSeason(parseInt(v)); setEpisode(1); }}>
                  <SelectTrigger className="w-28 h-9 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map(s => (
                      <SelectItem key={s.id} value={String(s.season_number)}>
                        S{s.season_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={String(episode)} onValueChange={(v) => setEpisode(parseInt(v))}>
                  <SelectTrigger className="w-24 h-9 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: episodeCount }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Ep {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3">
          {/* Server Selection */}
          <button
            onClick={() => setShowServers(!showServers)}
            className="w-full flex items-center justify-between p-3 bg-card rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
          >
            <span className="font-medium">Serveur: {VIDEO_SERVERS[currentServer].name}</span>
            {showServers ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showServers && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {Object.entries(VIDEO_SERVERS).map(([key, server]) => (
                <Button
                  key={key}
                  variant={currentServer === key ? 'default' : 'outline'}
                  onClick={() => { setCurrentServer(key as keyof typeof VIDEO_SERVERS); setShowServers(false); }}
                  className={currentServer === key ? 'bg-primary text-black font-semibold' : ''}
                >
                  {server.name}
                </Button>
              ))}
            </div>
          )}

          {/* Episodes List for TV */}
          {type === 'tv' && seasons.length > 0 && (
            <>
              <button
                onClick={() => setShowEpisodes(!showEpisodes)}
                className="w-full flex items-center justify-between p-3 bg-card rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
              >
                <span className="font-medium">Épisodes - Saison {season}</span>
                {showEpisodes ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              {showEpisodes && (
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-2 bg-card rounded-lg border border-border/50">
                  {Array.from({ length: episodeCount }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={episode === i + 1 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEpisode(i + 1)}
                      className={episode === i + 1 ? 'bg-primary text-black font-bold' : ''}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Media Details */}
        {details && (
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-4">
              {details.poster_path && (
                <div className="hidden sm:block w-24 flex-shrink-0">
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${details.poster_path}`}
                    alt={title}
                    width={96}
                    height={144}
                    className="rounded-lg object-cover aspect-[2/3]"
                  />
                </div>
              )}
              
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {details.genres?.map(g => (
                    <Badge key={g.id} variant="secondary" className="text-xs">{g.name}</Badge>
                  ))}
                </div>
                
                {runtime && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {Math.floor(runtime / 60)}h {runtime % 60}min
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                  {details.overview || 'Aucune description disponible.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WatchContent />
    </Suspense>
  );
}
