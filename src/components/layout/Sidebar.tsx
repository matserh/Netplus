'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import {
  Home,
  TrendingUp,
  Film,
  Tv,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Heart,
  Clock,
  Bookmark,
  ChevronDown,
  Crown,
  User,
  Info,
  FileText,
  Shield,
  Calendar,
  Award,
  Zap
} from 'lucide-react';
import { Genre } from '@/types/media';
import { cn } from '@/lib/utils';
import { useProfile, ProfileType } from '@/contexts/ProfileContext';
import { ProfileLogo, PROFILE_IMAGES } from '@/components/ui/ProfileAvatar';

// Official logos for sidebar display
const OFFICIAL_LOGOS = [
  { id: 'netplus-gold', name: 'Or', src: '/logos/gold.png' },
  { id: 'netplus-fire', name: 'Flamme', src: '/logos/fire.png' },
  { id: 'netplus-ocean', name: 'Océan', src: '/logos/ocean.png' },
  { id: 'netplus-forest', name: 'Forêt', src: '/logos/forest.png' },
  { id: 'netplus-night', name: 'Nuit', src: '/logos/night.png' },
  { id: 'netplus-sunset', name: 'Coucher', src: '/logos/sunset.png' },
  { id: 'netplus-ice', name: 'Glace', src: '/logos/ice.png' },
  { id: 'netplus-royal', name: 'Royal', src: '/logos/royal.png' },
  { id: 'netplus-emerald', name: 'Émeraude', src: '/logos/emerald.png' },
  { id: 'netplus-ruby', name: 'Rubis', src: '/logos/ruby.png' },
  { id: 'netplus-amber', name: 'Ambre', src: '/logos/amber.png' },
  { id: 'netplus-violet', name: 'Violet', src: '/logos/violet.png' },
  { id: 'netplus-copper', name: 'Cuivre', src: '/logos/copper.png' },
  { id: 'netplus-silver', name: 'Argent', src: '/logos/silver.png' },
  { id: 'netplus-platinum', name: 'Platine', src: '/logos/platinum.png' },
  { id: 'netplus-crimson', name: 'Cramoisi', src: '/logos/crimson.png' },
  { id: 'netplus-teal', name: 'Turquoise', src: '/logos/teal.png' },
  { id: 'netplus-rose', name: 'Rose', src: '/logos/rose.png' },
  { id: 'netplus-indigo', name: 'Indigo', src: '/logos/indigo.png' },
  { id: 'netplus-graphite', name: 'Graphite', src: '/logos/graphite.png' },
];

const PROFILE_DESCRIPTIONS: Record<ProfileType, string> = {
  JEUNESSE: 'Familial',
  FRENESIE: 'Action',
  NOCTURNE: 'Tout',
};

interface SidebarProps {
  genres: Genre[];
  onGenreSelect: (genreId: string, genreName: string) => void;
  onAIClick: () => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ genres, onGenreSelect, onAIClick, isCollapsed, onToggle }: SidebarProps) {
  const [showGenres, setShowGenres] = useState(true);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const pathname = usePathname();
  const { profile, profiles, setProfile } = useProfile();
  const router = useRouter();

  // Resolve the current logo to display
  const [currentLogoSrc, setCurrentLogoSrc] = useState<string | null>(null);
  const [customLogoId, setCustomLogoId] = useState<string | null>(null);
  useEffect(() => {
    const custom = localStorage.getItem('netplus-custom-logo');
    if (custom) { setCurrentLogoSrc(custom); setCustomLogoId(null); return; }
    const officialId = localStorage.getItem('netplus-official-logo');
    if (officialId) {
      const found = OFFICIAL_LOGOS.find(l => l.id === officialId);
      if (found) { setCurrentLogoSrc(found.src); setCustomLogoId(officialId); return; }
    }
    if (profile) { setCurrentLogoSrc(PROFILE_IMAGES[profile.type]); setCustomLogoId(null); }
    else { setCurrentLogoSrc(null); setCustomLogoId(null); }
  }, [profile]);

  const mainNav = [
    { icon: Home, label: 'Accueil', href: '/' },
    { icon: TrendingUp, label: 'Tendances', href: '/trending' },
    { icon: Film, label: 'Films Populaires', href: '/movies/popular' },
    { icon: Tv, label: 'Séries Populaires', href: '/tv/popular' },
    { icon: Award, label: 'Films Mieux Notés', href: '/movies/top-rated' },
    { icon: Star, label: 'Séries Mieux Notées', href: '/tv/top-rated' },
    { icon: Calendar, label: 'Prochainement', href: '/upcoming' },
    { icon: Zap, label: 'Shorts', href: '/shorts' },
  ];

  // Determine which nav item is active based on current URL
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const accountNav = [
    { icon: User, label: 'Profils', href: '/profiles' },
    { icon: Crown, label: 'Premium', href: '/pricing' },
  ];

  const legalNav = [
    { icon: Info, label: 'À propos', href: '/about' },
    { icon: FileText, label: 'Conditions', href: '/terms' },
    { icon: Shield, label: 'Confidentialité', href: '/privacy' },
  ];

  const library = [
    { icon: Heart, label: 'Favoris', href: '#' },
    { icon: Clock, label: 'Historique', href: '/history' },
    { icon: Bookmark, label: 'Ma liste', href: '#' },
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-60"
    )}>
      {/* Header with Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border/50">
        <Link href="/" className={cn("flex items-center", isCollapsed && "justify-center w-full")}>
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
              <span className="text-xs font-black text-black">N</span>
            </div>
          ) : (
            <Logo />
          )}
        </Link>

        {!isCollapsed && (
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 hover:bg-sidebar-accent">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--primary) transparent' }}>
        <div className="p-3 space-y-1">
          {/* Current Profile — shows logo + switcher */}
          {!isCollapsed && (
            <div className="mb-2">
              <button
                onClick={() => setShowProfileSwitcher(!showProfileSwitcher)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sidebar-accent/50 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                  {currentLogoSrc ? (
                    <img src={currentLogoSrc} alt="Profil" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/70 to-amber-500/70 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-black" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-white transition-colors">
                    {profile?.name || 'Choisir profil'}
                  </p>
                  <p className="text-[10px] text-white/50">
                    {profile ? PROFILE_DESCRIPTIONS[profile.type] : 'Non sélectionné'}
                  </p>
                </div>
                <ChevronDown className={cn("w-3 h-3 text-white/50 transition-transform", showProfileSwitcher && "rotate-180")} />
              </button>

              {/* Profile switcher dropdown */}
              {showProfileSwitcher && (
                <div className="mt-1 ml-2 space-y-0.5 animate-scale-in">
                  {/* 3 Content category profiles */}
                  {profiles.map((p) => (
                    <button
                      key={p.type}
                      onClick={() => { setProfile(p); setShowProfileSwitcher(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all",
                        profile?.type === p.type
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-white/70 hover:text-primary hover:bg-primary/5"
                      )}
                    >
                      <div className="w-6 h-6 rounded-md overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                        <img src={PROFILE_IMAGES[p.type]} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <span>{p.name}</span>
                      <span className="ml-auto text-[9px] text-white/40">{PROFILE_DESCRIPTIONS[p.type]}</span>
                    </button>
                  ))}

                  {/* Divider */}
                  <div className="my-1.5 h-px bg-sidebar-border/40 mx-3" />

                  {/* Official logos row */}
                  <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest px-3 mb-1.5">Thèmes NetPlus</p>
                  <div className="grid grid-cols-5 gap-1.5 px-3">
                    {OFFICIAL_LOGOS.map((logo) => {
                      const isSelected = customLogoId === logo.id;
                      return (
                        <button
                          key={logo.id}
                          onClick={() => {
                            localStorage.setItem('netplus-official-logo', logo.id);
                            localStorage.removeItem('netplus-custom-logo');
                            setCurrentLogoSrc(logo.src);
                            setCustomLogoId(logo.id);
                            setShowProfileSwitcher(false);
                          }}
                          className={cn(
                            "w-full aspect-square rounded-md overflow-hidden ring-1 transition-all",
                            isSelected ? "ring-primary ring-2" : "ring-white/10 hover:ring-white/30"
                          )}
                        >
                          <img src={logo.src} alt={logo.name} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Manage profiles link */}
                  <Link
                    href="/profiles"
                    onClick={() => setShowProfileSwitcher(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-primary hover:bg-primary/5 transition-all mt-1"
                  >
                    <User className="w-3.5 h-3.5" />
                    Gérer les profils
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Collapsed sidebar — just show profile logo */}
          {isCollapsed && (
            <Link
              href="/profiles"
              className="w-8 h-8 mx-auto rounded-lg overflow-hidden ring-1 ring-white/10 hover:ring-primary/50 transition-all block mb-2"
            >
              {currentLogoSrc ? (
                <img src={currentLogoSrc} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/70 to-amber-500/70 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-black" />
                </div>
              )}
            </Link>
          )}

          {/* Main Nav */}
          <nav className="space-y-1">
            {mainNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
                  isActive(item.href)
                    ? "bg-primary/15 text-primary shadow-sm shadow-primary/10" 
                    : "text-sidebar-foreground/60 hover:text-primary hover:bg-primary/8",
                  isCollapsed && "justify-center px-2"
                )}
              >
                {/* Active indicator */}
                {isActive(item.href) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                )}
                <item.icon className={cn(
                  "w-[18px] h-[18px] flex-shrink-0 transition-all duration-300",
                  isActive(item.href) ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-primary"
                )} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Divider */}
          <div className="my-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

          {/* AI Button */}
          <button
            onClick={onAIClick}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all duration-200",
              "bg-gradient-to-r from-primary via-primary to-amber-600 text-black",
              "hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]",
              isCollapsed && "justify-center px-2"
            )}
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Maître Netplus</span>}
          </button>

          {/* Library */}
          {!isCollapsed && (
            <>
              <div className="my-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
              
              <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest px-3 mb-2">
                Bibliothèque
              </p>
              <nav className="space-y-0.5">
                {library.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href || '#'}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </>
          )}

          {/* Account & Premium */}
          {!isCollapsed && (
            <>
              <div className="my-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

              <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest px-3 mb-2">
                Compte
              </p>
              <nav className="space-y-0.5">
                {accountNav.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

            </>
          )}

          {/* Genres */}
          {!isCollapsed && (
            <>
              <div className="my-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />

              <button
                onClick={() => setShowGenres(!showGenres)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest hover:text-sidebar-foreground transition-colors"
              >
                <span>Genres</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", showGenres && "rotate-180")} />
              </button>

              {showGenres && (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {genres.slice(0, 12).map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => onGenreSelect(String(genre.id), genre.name)}
                      className="px-2.5 py-2 text-xs text-sidebar-foreground/70 hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200 text-left truncate"
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Collapse Toggle (when collapsed) */}
      {isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-sidebar border border-sidebar-border shadow-lg hover:bg-sidebar-accent"
        >
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </Button>
      )}

      {/* Legal Links & Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-sidebar-border/50 space-y-1">
          <nav className="space-y-0.5">
            {legalNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[11px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-all duration-200"
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <p className="text-[9px] text-muted-foreground/30 text-center pt-1">© 2026 Netplus</p>
        </div>
      )}
    </aside>
  );
}
