'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Star, Clock, Film, Tv, Users, Hash, Globe, TrendingUp } from 'lucide-react';
import { 
  Media, 
  MovieDetails, 
  TVDetails, 
  Season,
  getBackdropUrl,
  getPosterUrl,
  getMediaTitle,
  getMediaYear,
  API_CONFIG 
} from '@/types/media';

interface MediaModalProps {
  media: Media | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Genre color mapping for visual fallbacks
const GENRE_COLORS: Record<number, { bg: string; text: string }> = {
  28: { bg: 'bg-red-500/20', text: 'text-red-400' },    // Action
  12: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' }, // Adventure
  16: { bg: 'bg-lime-500/20', text: 'text-lime-400' },   // Animation
  35: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' }, // Comedy
  80: { bg: 'bg-gray-500/20', text: 'text-gray-400' },   // Crime
  99: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },   // Documentary
  18: { bg: 'bg-blue-500/20', text: 'text-blue-400' },   // Drama
  10751: { bg: 'bg-pink-500/20', text: 'text-pink-400' }, // Family
  14: { bg: 'bg-violet-500/20', text: 'text-violet-400' }, // Fantasy
  36: { bg: 'bg-amber-500/20', text: 'text-amber-400' }, // History
  27: { bg: 'bg-rose-500/20', text: 'text-rose-400' },   // Horror
  10402: { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400' }, // Music
  9648: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' }, // Mystery
  10749: { bg: 'bg-pink-500/20', text: 'text-pink-400' }, // Romance
  878: { bg: 'bg-teal-500/20', text: 'text-teal-400' },  // Sci-Fi
  10770: { bg: 'bg-orange-500/20', text: 'text-orange-400' }, // TV Movie
  53: { bg: 'bg-sky-500/20', text: 'text-sky-400' },     // Thriller
  10752: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' }, // War
  37: { bg: 'bg-stone-500/20', text: 'text-stone-400' }, // Western
};

// TMDB genre name map (French)
const GENRE_NAMES_FR: Record<number, string> = {
  28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime',
  99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 14: 'Fantastique',
  36: 'Histoire', 27: 'Horreur', 10402: 'Musique', 9648: 'Mystère',
  10749: 'Romance', 878: 'Science-Fiction', 10770: 'Téléfilm', 53: 'Thriller',
  10752: 'Guerre', 37: 'Western', 10759: 'Action & Adventure',
  10762: 'Kids', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

interface ExtraData {
  englishOverview: string | null;
  cast: { name: string; character: string; profile_path: string | null }[];
  keywords: string[];
  tagline: string | null;
}

export function MediaModal({ media, open, onOpenChange }: MediaModalProps) {
  const router = useRouter();
  const [details, setDetails] = useState<MovieDetails | TVDetails | null>(null);
  const [extraData, setExtraData] = useState<ExtraData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!media || !open) {
      setDetails(null);
      setExtraData(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      const isMovie = media.media_type === 'movie' || !!media.title;
      const endpoint = isMovie ? `/movie/${media.id}` : `/tv/${media.id}`;
      const apiKey = API_CONFIG.tmdb.apiKey;

      try {
        // Fetch French details + credits + keywords in parallel
        const [detailsRes, creditsRes, keywordsRes, enRes] = await Promise.all([
          fetch(`${API_CONFIG.tmdb.baseUrl}${endpoint}?api_key=${apiKey}&language=fr-FR`),
          fetch(`${API_CONFIG.tmdb.baseUrl}${endpoint}/credits?api_key=${apiKey}&language=fr-FR`),
          fetch(`${API_CONFIG.tmdb.baseUrl}${endpoint}/keywords?api_key=${apiKey}`),
          // Fetch English overview as fallback
          fetch(`${API_CONFIG.tmdb.baseUrl}${endpoint}?api_key=${apiKey}&language=en-US`),
        ]);

        if (detailsRes.ok) {
          const data = await detailsRes.json();
          setDetails(data);

          // Check if French overview is missing — if so, we need extra data
          const frenchOverview = data.overview || media.overview;
          if (!frenchOverview || frenchOverview.trim().length < 10) {
            const extra: ExtraData = { englishOverview: null, cast: [], keywords: [], tagline: null };

            // Get English overview
            if (enRes.ok) {
              const enData = await enRes.json();
              if (enData.overview && enData.overview.trim().length > 10) {
                extra.englishOverview = enData.overview;
              }
              if (enData.tagline) extra.tagline = enData.tagline;
            }

            // Get cast
            if (creditsRes.ok) {
              const creditsData = await creditsRes.json();
              if (creditsData.cast?.length) {
                extra.cast = creditsData.cast.slice(0, 6).map((c: any) => ({
                  name: c.name,
                  character: c.character,
                  profile_path: c.profile_path,
                }));
              }
            }

            // Get keywords
            if (keywordsRes.ok) {
              const kwData = await keywordsRes.json();
              const kwList = kwData.keywords || kwData.results || [];
              extra.keywords = kwList.slice(0, 8).map((k: any) => k.name);
            }

            setExtraData(extra);
          }
        }
      } catch {
        // Silently fail — modal still shows basic info
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [media, open]);

  if (!media) return null;

  const isMovie = media.media_type === 'movie' || !!media.title;
  const title = details ? getMediaTitle(details) : getMediaTitle(media);
  const year = details ? getMediaYear(details as Media) : getMediaYear(media);
  const backdropUrl = getBackdropUrl(details?.backdrop_path || media.backdrop_path, 'large');
  const posterUrl = getPosterUrl(details?.poster_path || media.poster_path, 'medium');
  const voteAvg = details?.vote_average ?? media.vote_average;
  const rating = voteAvg > 0 ? voteAvg.toFixed(1) : null;
  const voteCount = details?.vote_count ?? media.vote_count;
  const genres = details?.genres || [];
  const genreIds = genres.length > 0 ? genres.map((g: any) => g.id) : (media.genre_ids || []);
  const rawOverview = details?.overview || media.overview || '';
  const hasOverview = rawOverview.trim().length > 10;
  const overview = hasOverview ? rawOverview : '';

  const runtime = (details as MovieDetails)?.runtime;
  const formattedRuntime = runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}min` : null;
  const numberOfSeasons = (details as TVDetails)?.number_of_seasons;
  const tagline = (details as any)?.tagline || extraData?.tagline;
  const popularity = details?.popularity ?? media.popularity;

  // Derive genre labels from IDs for visual fallback
  const genreLabels = genreIds
    .map(id => GENRE_NAMES_FR[id])
    .filter(Boolean) as string[];

  // Get primary genre color for the no-backdrop fallback
  const primaryGenreColor = genreIds.length > 0 ? GENRE_COLORS[genreIds[0]] : null;

  const handleWatch = () => {
    const mediaType = isMovie ? 'movie' : 'tv';
    router.push(`/watch/${mediaType}/${media.id}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0 overflow-hidden bg-card border-border/50">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Backdrop Header — with poster fallback & genre gradient */}
        <div className="relative h-48 sm:h-56">
          {backdropUrl ? (
            <Image src={backdropUrl} alt={title} fill className="object-cover" />
          ) : posterUrl ? (
            <Image src={posterUrl} alt={title} fill className="object-cover object-center" />
          ) : (
            /* Cinematic genre gradient when no image at all */
            <div className="absolute inset-0" style={{
              background: genreIds.length > 0
                ? `linear-gradient(135deg, hsl(${(genreIds[0] * 37) % 360}, 60%, 15%), hsl(${(genreIds[0] * 37 + 60) % 360}, 50%, 10%))`
                : 'linear-gradient(135deg, #1a1a2e, #16213e)',
            }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          
          {/* Title overlay on backdrop for items without overview — gives visual richness */}
          {!hasOverview && !backdropUrl && (
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <span className="text-[120px] sm:text-[180px] font-black text-white/50 select-none leading-none">
                {title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[calc(90vh-14rem)]">
          <div className="p-5 space-y-4">
            {/* Title & Meta */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="h-6 px-2.5 text-[10px] font-bold bg-primary text-black">
                  {isMovie ? 'FILM' : 'SÉRIE'}
                </Badge>
                {rating && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span className="font-semibold">{rating}</span>
                    {voteCount > 0 && (
                      <span className="text-[10px] text-muted-foreground/50">({voteCount.toLocaleString('fr-FR')})</span>
                    )}
                  </div>
                )}
                {year && <span className="text-sm text-muted-foreground">{year}</span>}
                {popularity > 50 && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400/70">
                    <TrendingUp className="w-3 h-3" />
                    Populaire
                  </div>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h2>
              {tagline && (
                <p className="text-sm text-primary/70 italic mt-1">&ldquo;{tagline}&rdquo;</p>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {formattedRuntime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  {formattedRuntime}
                </span>
              )}
              {numberOfSeasons && (
                <span className="flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-primary" />
                  {numberOfSeasons} saison{numberOfSeasons > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Genres — always show, derived from IDs if details not loaded yet */}
            {(genres.length > 0 || genreLabels.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {(genres.length > 0 ? genres : genreIds.map(id => ({ id, name: GENRE_NAMES_FR[id] || `Genre ${id}` }))).map((g: any) => {
                  const colors = GENRE_COLORS[g.id];
                  return (
                    <Badge 
                      key={g.id} 
                      variant="secondary" 
                      className={`text-xs font-medium ${colors ? `${colors.bg} ${colors.text} border-0` : ''}`}
                    >
                      {g.name}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Overview — or smart fallback when missing */}
            {overview ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{overview}</p>
            ) : (
              /* Rich fallback: English overview, cast, keywords, metadata — NO "Aucune description" */
              <div className="space-y-3">
                {/* English overview if available */}
                {extraData?.englishOverview && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground/50 font-medium">Synopsis (EN)</span>
                    </div>
                    <p className="text-sm text-muted-foreground/70 leading-relaxed">{extraData.englishOverview}</p>
                  </div>
                )}

                {/* Cast — real people, real data */}
                {extraData && extraData.cast.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground/50 font-medium">Casting</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {extraData.cast.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-muted/30 rounded-full px-2.5 py-1">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-muted flex-shrink-0">
                            {c.profile_path ? (
                              <img
                                src={`${API_CONFIG.tmdb.imageUrl}/w45${c.profile_path}`}
                                alt={c.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-muted-foreground/40">
                                {c.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-medium text-foreground/70 block truncate max-w-[100px]">{c.name}</span>
                            {c.character && (
                              <span className="text-[9px] text-muted-foreground/40 block truncate max-w-[100px]">{c.character}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords — real tags from TMDB */}
                {extraData && extraData.keywords.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground/50 font-medium">Mots-clés</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {extraData.keywords.map((kw, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground/60 font-medium">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* When we have nothing at all — show a contextual info block, not "Aucune description" */}
                {!extraData?.englishOverview && (!extraData || extraData.cast.length === 0) && (!extraData || extraData.keywords.length === 0) && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                    <Film className="w-5 h-5 text-primary/50 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-foreground/60">
                        {isMovie ? 'Film' : 'Série'}&nbsp;
                        {genreLabels.length > 0 ? `de ${genreLabels.slice(0, 2).join(' et ')}` : ''}
                        {year ? ` · ${year}` : ''}
                      </p>
                      {rating && (
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                          Note : {rating}/10{voteCount > 0 ? ` · ${voteCount.toLocaleString('fr-FR')} votes` : ''}
                        </p>
                      )}
                      {formattedRuntime && (
                        <p className="text-[10px] text-muted-foreground/40">Durée : {formattedRuntime}</p>
                      )}
                      {numberOfSeasons && (
                        <p className="text-[10px] text-muted-foreground/40">{numberOfSeasons} saison{numberOfSeasons > 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Watch Button */}
            <Button 
              onClick={handleWatch} 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-bold text-base gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              Regarder maintenant
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
