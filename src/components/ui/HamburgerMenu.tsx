'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/Logo';
import {
  Home,
  Film,
  Tv,
  TrendingUp,
  Star,
  X,
  Maximize,
  Minimize,
  Crown,
  User,
  Info,
  FileText,
  Shield,
  Award,
  Calendar,
  Sparkles,
  Zap,
  Clock
} from 'lucide-react';
import { Genre } from '@/types/media';

interface HamburgerMenuProps {
  genres: Genre[];
  onGenreSelect: (genreId: string, genreName: string) => void;
  onAIClick?: () => void;
}

export function HamburgerMenu({ genres, onGenreSelect, onAIClick }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const movieGenres = genres.filter(g =>
    [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37].includes(g.id)
  );
  const tvGenres = genres.filter(g =>
    [10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766, 10767, 10768, 37].includes(g.id)
  );

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="icon-hover text-foreground/80 hover:text-primary hover:bg-primary/10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Button>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Menu Panel */}
      <div className="absolute top-0 left-0 h-full w-[85vw] sm:w-[350px] bg-card border-r border-border shadow-2xl overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Logo size="sm" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="hover:bg-primary/10 hover:text-primary rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {/* Main Navigation */}
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/">
                <Home className="w-5 h-5" />
                Accueil
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/trending">
                <TrendingUp className="w-5 h-5" />
                Tendances
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/movies/popular">
                <Film className="w-5 h-5" />
                Films Populaires
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/tv/popular">
                <Tv className="w-5 h-5" />
                Séries Populaires
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/movies/top-rated">
                <Award className="w-5 h-5" />
                Films Mieux Notés
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/tv/top-rated">
                <Star className="w-5 h-5" />
                Séries Mieux Notées
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/upcoming">
                <Calendar className="w-5 h-5" />
                Prochainement
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/shorts">
                <Zap className="w-5 h-5" />
                Shorts
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/history">
                <Clock className="w-5 h-5" />
                Historique
              </Link>
            </Button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* AI Assistant (mobile sidebar) */}
          {onAIClick && (
            <div className="space-y-1">
              <button
                onClick={() => { onAIClick(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-primary via-primary to-amber-600 text-black hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
              >
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                <span>Assistant IA</span>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Account & Premium */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Compte</h3>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" asChild>
              <Link href="/profiles">
                <User className="w-5 h-5" />
                Profils
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 text-primary" asChild>
              <Link href="/pricing">
                <Crown className="w-5 h-5" />
                Premium
              </Link>
            </Button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Legal */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Légal</h3>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary text-xs" asChild>
              <Link href="/about">
                <Info className="w-4 h-4" />
                À propos
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary text-xs" asChild>
              <Link href="/terms">
                <FileText className="w-4 h-4" />
                Conditions
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary text-xs" asChild>
              <Link href="/privacy">
                <Shield className="w-4 h-4" />
                Confidentialité
              </Link>
            </Button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Film Genres */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Film className="w-4 h-4 text-primary" />
              Films
            </h3>
            <div className="flex flex-wrap gap-2">
              {movieGenres.slice(0, 8).map(genre => (
                <Badge
                  key={genre.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
                  onClick={() => {
                    onGenreSelect(String(genre.id), genre.name);
                    setIsOpen(false);
                  }}
                >
                  {genre.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* TV Genres */}
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Tv className="w-4 h-4 text-primary" />
              Séries TV
            </h3>
            <div className="flex flex-wrap gap-2">
              {tvGenres.slice(0, 8).map(genre => (
                <Badge
                  key={genre.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
                  onClick={() => {
                    onGenreSelect(String(genre.id), genre.name);
                    setIsOpen(false);
                  }}
                >
                  {genre.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">© 2026 Netplus</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
