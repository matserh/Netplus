'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Info, Star, Volume2, VolumeX, TrendingUp, Film, Tv } from 'lucide-react';
import { Media, getBackdropUrl, getPosterUrl, getMediaTitle, getMediaYear, API_CONFIG } from '@/types/media';
import { useDynamicTheme } from '@/contexts/ThemeContext';

// Genre name map (French)
const GENRE_NAMES_FR: Record<number, string> = {
  28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Crime',
  99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 14: 'Fantastique',
  36: 'Histoire', 27: 'Horreur', 10402: 'Musique', 9648: 'Mystère',
  10749: 'Romance', 878: 'Science-Fiction', 10770: 'Téléfilm', 53: 'Thriller',
  10752: 'Guerre', 37: 'Western',
};

interface BannerProps {
  items: Media[];
  onItemClick: (media: Media) => void;
}

export function Banner({ items, onItemClick }: BannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { setContentTheme } = useDynamicTheme();
  const prevSlideRef = useRef(0);

  const current = items[currentIndex];
  const totalItems = items.length;

  // Dynamic theme: adapt colors to current banner slide
  useEffect(() => {
    if (!current || currentIndex === prevSlideRef.current) return;
    prevSlideRef.current = currentIndex;
    const img = getBackdropUrl(current.backdrop_path, 'large') || getPosterUrl(current.poster_path, 'medium');
    if (img) setContentTheme(img);
  }, [currentIndex, current, setContentTheme]);

  const goToNext = useCallback(() => {
    if (isTransitioning || totalItems === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % totalItems);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, totalItems]);

  const goToPrev = useCallback(() => {
    if (isTransitioning || totalItems === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, totalItems]);

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  useEffect(() => {
    if (!isAutoPlaying || totalItems === 0) return;
    const interval = setInterval(goToNext, 7000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, goToNext, totalItems]);

  if (!current || totalItems === 0) {
    return <div className="w-full h-[60vh] md:h-[70vh] bg-card" />;
  }

  const backdropUrl = getBackdropUrl(current.backdrop_path, 'large');
  const posterUrl = getPosterUrl(current.poster_path, 'large');
  const title = getMediaTitle(current);
  const year = getMediaYear(current);
  const voteAvg = current.vote_average;
  const rating = voteAvg > 0 ? voteAvg.toFixed(1) : null;
  const isMovie = current.media_type === 'movie' || !!current.title;
  const rawOverview = current.overview || '';
  const hasOverview = rawOverview.trim().length > 10;
  
  // Derive genre labels from IDs
  const genreLabels = (current.genre_ids || [])
    .map(id => GENRE_NAMES_FR[id])
    .filter(Boolean) as string[];

  return (
    <section 
      className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Background Image — with poster fallback & genre gradient */}
      <div className="absolute inset-0 overflow-hidden">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt={title}
            fill
            priority
            sizes="100vw"
            className={`object-cover object-top transition-all duration-700 ease-out ${
              isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            }`}
          />
        ) : posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            priority
            sizes="100vw"
            className={`object-cover object-center transition-all duration-700 ease-out ${
              isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            }`}
          />
        ) : (
          /* Genre-colored cinematic gradient for items without any image */
          <div className="absolute inset-0" style={{
            background: (current.genre_ids?.length || 0) > 0
              ? `linear-gradient(135deg, hsl(${(current.genre_ids![0] * 37) % 360}, 50%, 12%), hsl(${(current.genre_ids![0] * 37 + 90) % 360}, 40%, 8%))`
              : 'linear-gradient(135deg, #1a1a2e, #16213e)',
          }} />
        )}
        
        {/* Ambient glow tinted by dynamic theme */}
        <div className="absolute inset-0" style={{ background: 'var(--dynamic-glow)' }} />

        {/* Cinematic Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
        
        {/* Bottom fade for sections */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-end">
        <div className="w-full pb-16 px-6 sm:px-10 lg:px-16">
          <div className="max-w-2xl">
            {/* Meta Tags */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Badge className="bg-primary text-black font-bold text-xs px-3 py-1">
                {isMovie ? 'FILM' : 'SÉRIE'}
              </Badge>
              
              {rating && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="w-4 h-4 fill-primary text-primary" />
                  <span className="font-semibold text-foreground">{rating}</span>
                </div>
              )}
              
              {year && (
                <span className="text-sm text-foreground/60">{year}</span>
              )}

              {/* Show genre pills when no overview — gives visual richness */}
              {!hasOverview && genreLabels.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {genreLabels.slice(0, 3).map((g, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5 bg-white/10 text-white/70 border-0">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-4 leading-tight tracking-tight">
              {title}
            </h1>

            {/* Overview — or smart contextual fallback */}
            {hasOverview ? (
              <p className="text-base text-foreground/70 mb-8 line-clamp-2 md:line-clamp-3 max-w-xl leading-relaxed">
                {rawOverview}
              </p>
            ) : (
              /* Show meaningful context instead of "Aucune description disponible" */
              <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center gap-1.5 text-foreground/40">
                  {isMovie ? <Film className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                  <span className="text-sm font-medium">{isMovie ? 'Film' : 'Série'}</span>
                </div>
                {genreLabels.length > 0 && (
                  <span className="text-sm text-foreground/30">·</span>
                )}
                {genreLabels.length > 0 && (
                  <span className="text-sm text-foreground/40">{genreLabels.slice(0, 3).join(', ')}</span>
                )}
                {year && (
                  <>
                    <span className="text-sm text-foreground/30">·</span>
                    <span className="text-sm text-foreground/40">{year}</span>
                  </>
                )}
                {rating && (
                  <>
                    <span className="text-sm text-foreground/30">·</span>
                    <span className="text-sm text-foreground/40">{rating}/10</span>
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button 
                size="lg"
                onClick={() => onItemClick(current)}
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-black font-bold text-base gap-2 hover:scale-105 transition-transform"
              >
                <Play className="w-5 h-5 fill-current" />
                Regarder
              </Button>
              
              <Button 
                size="lg"
                variant="outline"
                onClick={() => onItemClick(current)}
                className="h-12 px-6 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm font-medium gap-2"
              >
                <Info className="w-5 h-5" />
                Plus d'infos
              </Button>
            </div>
          </div>

          {/* Slide Indicators */}
          <div className="absolute bottom-6 right-6 sm:right-10 lg:right-16 flex items-center gap-2">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-10 h-2 bg-primary' 
                    : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
