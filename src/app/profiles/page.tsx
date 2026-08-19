'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Logo } from '@/components/ui/Logo';
import { useProfile, ProfileType, UserProfile } from '@/contexts/ProfileContext';
import { Pencil, LogOut, Check, ChevronDown, UserCircle, Camera, X, Ghost, Upload, Sparkles } from 'lucide-react';
import { useGuest } from '@/contexts/GuestContext';
import { Media, TMDBResponse, API_CONFIG } from '@/types/media';
import { PROFILE_IMAGES, SmallProfileAvatar, ProfileLogo } from '@/components/ui/ProfileAvatar';

// 20 Official NetPlus logos — real generated icons with distinct visual styles
const OFFICIAL_LOGOS = [
  { id: 'netplus-gold', name: 'Or Classic', src: '/logos/gold.png' },
  { id: 'netplus-fire', name: 'Flamme', src: '/logos/fire.png' },
  { id: 'netplus-ocean', name: 'Oc\u00e9an', src: '/logos/ocean.png' },
  { id: 'netplus-forest', name: 'For\u00eat', src: '/logos/forest.png' },
  { id: 'netplus-night', name: 'Nuit', src: '/logos/night.png' },
  { id: 'netplus-sunset', name: 'Coucher', src: '/logos/sunset.png' },
  { id: 'netplus-ice', name: 'Glace', src: '/logos/ice.png' },
  { id: 'netplus-royal', name: 'Royal', src: '/logos/royal.png' },
  { id: 'netplus-emerald', name: '\u00c9meraude', src: '/logos/emerald.png' },
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
  JEUNESSE: 'Contenu familial et éducatif',
  FRENESIE: 'Action, horreur et thrills',
  NOCTURNE: 'Tout sans restrictions',
};

const PROFILE_COLORS: Record<ProfileType, string> = {
  JEUNESSE: 'from-emerald-500 to-teal-600',
  FRENESIE: 'from-red-500 to-orange-600',
  NOCTURNE: 'from-violet-500 to-purple-700',
};

// Fetch helper
const fetchTMDB = async <T,>(endpoint: string): Promise<T | null> => {
  try {
    const res = await fetch(
      `${API_CONFIG.tmdb.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_CONFIG.tmdb.apiKey}&language=fr-FR`
    );
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
};

// Promotional banner
function PromoBanner() {
  const [items, setItems] = useState<Media[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const data = await fetchTMDB<TMDBResponse<Media>>('/movie/now_playing?region=FR');
      if (data?.results) {
        setItems(data.results.filter(m => m.backdrop_path).slice(0, 5));
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[currentIndex];
  const title = current.title || current.name || '';

  return (
    <div className="relative w-full h-[35vh] sm:h-[40vh] overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={`${API_CONFIG.tmdb.imageUrl}/original${current.backdrop_path}`}
          alt={title}
          className="w-full h-full object-cover transition-all duration-1000"
          key={currentIndex}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 right-6 flex items-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'bg-primary w-4' : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { profiles, setProfile, profile: currentProfile, clearProfile, hydrated } = useProfile();
  const { isGuest, enterGuestMode, exitGuestMode } = useGuest();
  const [managing, setManaging] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomLogoModal, setShowCustomLogoModal] = useState(false);
  const [showOfficialLogosModal, setShowOfficialLogosModal] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [customLogoPreview, setCustomLogoPreview] = useState<string | null>(null);
  const [selectedOfficialLogo, setSelectedOfficialLogo] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If unauthenticated AND not in guest mode, redirect to login.
  // (Guest mode is only entered explicitly by the user from the login page)
  useEffect(() => {
    if (status === 'unauthenticated' && !isGuest) {
      router.push('/login');
    }
  }, [status, isGuest, router]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Wait for both session check AND profile hydration from localStorage
  // This prevents the error boundary from catching null-profile errors on first load
  if ((status === 'loading' && !isGuest) || !hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground/50">Chargement...</span>
        </div>
      </div>
    );
  }

  const handleSelect = (profile: UserProfile) => {
    if (managing) return;
    setProfile(profile);
    router.push('/');
  };

  const userName = session?.user?.name || (isGuest ? 'Invité' : 'Utilisateur');
  const userEmail = session?.user?.email || (isGuest ? '' : '');
  // Priority: custom logo > official logo > profile default
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [officialLogo, setOfficialLogo] = useState<string | null>(null);
  useEffect(() => {
    setCustomLogo(localStorage.getItem('netplus-custom-logo'));
    const officialId = localStorage.getItem('netplus-official-logo');
    if (officialId) {
      const found = OFFICIAL_LOGOS.find(l => l.id === officialId);
      setOfficialLogo(found ? found.id : null);
    }
  }, [showCustomLogoModal, showOfficialLogosModal]);
  const currentImg = customLogo || (officialLogo ? null : (currentProfile ? PROFILE_IMAGES[currentProfile.type] : '/profiles/nocturne.png'));
  const officialLogoData = officialLogo ? OFFICIAL_LOGOS.find(l => l.id === officialLogo) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar with user dropdown — FIXED, full black, extends under status bar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-[#000000]"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          minHeight: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        }}
      >
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          <Logo size="sm" />

          {/* User dropdown trigger */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-muted/50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all">
                {officialLogoData ? (
                  <img src={officialLogoData.src} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <img src={currentImg} alt="Profil" className="w-full h-full object-cover" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors hidden sm:block">
                {currentProfile?.name || 'Profil'}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl shadow-black/30 overflow-hidden animate-scale-in z-50">
                {/* User info */}
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30">
                      {officialLogoData ? (
                        <img src={officialLogoData.src} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <img src={currentImg} alt="Profil" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{userName}</p>
                      {userEmail && <p className="text-xs text-muted-foreground truncate">{userEmail}</p>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowCustomLogoModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Changer le logo
                  </button>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowOfficialLogosModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Gérer le profil
                  </button>

                  <div className="my-1.5 h-px bg-border/50" />

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowDisconnectConfirm(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer — matches fixed header height so content starts below */}
      <div style={{ height: 'calc(env(safe-area-inset-top, 0px) + 56px)' }} />

      {/* Custom logo import modal — "Changer le logo" = import your own */}
      {showCustomLogoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCustomLogoModal(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Changer le logo</h3>
              <button onClick={() => setShowCustomLogoModal(false)} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Importez votre propre logo personnalisé pour votre profil.</p>

            {/* Preview area */}
            <div className="w-32 h-32 mx-auto rounded-xl border-2 border-dashed border-border mb-4 flex items-center justify-center overflow-hidden bg-muted/30">
              {customLogoPreview ? (
                <img src={customLogoPreview} alt="Aperçu" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                  <Upload className="w-8 h-8" />
                  <span className="text-xs">Aucun fichier</span>
                </div>
              )}
            </div>

            {/* File input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setCustomLogoPreview(ev.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-all text-sm"
              >
                <Upload className="w-4 h-4" />
                Parcourir
              </button>
              <button
                onClick={() => {
                  if (customLogoPreview) {
                    // Save custom logo to localStorage
                    localStorage.setItem('netplus-custom-logo', customLogoPreview);
                    setShowCustomLogoModal(false);
                  }
                }}
                disabled={!customLogoPreview}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-all text-sm disabled:opacity-40"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official logos modal — "Gérer le profil" = choose from 20 real NetPlus logo icons */}
      {showOfficialLogosModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOfficialLogosModal(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-lg w-full animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold">Thèmes Netplus</h3>
                <p className="text-xs text-muted-foreground">20 icônes exclusives pour personnaliser votre profil</p>
              </div>
              <button onClick={() => setShowOfficialLogosModal(false)} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-4">
              {OFFICIAL_LOGOS.map((logo) => {
                const isSelected = selectedOfficialLogo === logo.id || localStorage.getItem('netplus-official-logo') === logo.id;
                return (
                  <button
                    key={logo.id}
                    onClick={() => setSelectedOfficialLogo(logo.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all group ${
                      isSelected ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden shadow-md ring-1 ring-white/10">
                      <img src={logo.src} alt={logo.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-medium text-foreground/60 group-hover:text-foreground transition-colors truncate w-full text-center">
                      {logo.name}
                    </span>
                    {isSelected && <Check className="w-3 h-3 text-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowOfficialLogosModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-all text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (selectedOfficialLogo) {
                    localStorage.setItem('netplus-official-logo', selectedOfficialLogo);
                    localStorage.removeItem('netplus-custom-logo');
                    setShowOfficialLogosModal(false);
                  }
                }}
                disabled={!selectedOfficialLogo}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-black font-semibold hover:bg-primary/90 transition-all text-sm disabled:opacity-40"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect confirmation modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDisconnectConfirm(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <LogOut className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Déconnexion</h3>
                <p className="text-sm text-muted-foreground">Voulez-vous vraiment vous déconnecter de Netplus ?</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-all text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    // 1. Clear all localStorage state so user is NOT auto-restored on next visit
                    clearProfile();           // removes netplus-profile
                    exitGuestMode();           // removes netplus_guest_mode + netplus_guest_id
                    localStorage.removeItem('netplus-custom-logo');
                    localStorage.removeItem('netplus-official-logo');
                    localStorage.removeItem('netplus-notifications');
                    // 2. Sign out via NextAuth (clears JWT cookie) and redirect to /login
                    await signOut({ callbackUrl: '/login', redirect: true });
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all text-sm"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promo banner */}
      <PromoBanner />

      {/* Profile selection */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 animate-fade-in">
          {managing ? 'Gérer les profils' : 'Qui regarde ?'}
        </h1>
        {managing && (
          <p className="text-sm text-primary mb-2 animate-fade-in">
            Cliquez sur un profil pour le modifier
          </p>
        )}

        {/* Profile cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 md:gap-10 justify-items-center my-8 sm:my-10">
          {profiles.map((profile, i) => {
            const imgSrc = PROFILE_IMAGES[profile.type];
            const gradient = PROFILE_COLORS[profile.type];
            const desc = PROFILE_DESCRIPTIONS[profile.type];
            const isActive = currentProfile?.type === profile.type;
            const [hovered, setHovered] = useState(false);
            const [visible, setVisible] = useState(false);
            const [imgLoaded, setImgLoaded] = useState(false);

            useEffect(() => {
              const timer = setTimeout(() => setVisible(true), 150 + i * 120);
              return () => clearTimeout(timer);
            }, []);

            return (
              <button
                key={profile.type}
                onClick={() => handleSelect(profile)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`flex flex-col items-center gap-3 group transition-all duration-500 ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-xl overflow-hidden
                    ring-2 ${isActive ? 'ring-primary ring-offset-2 ring-offset-background' : hovered ? 'ring-white/60 ring-offset-2 ring-offset-background' : 'ring-transparent'}
                    transition-all duration-300 ${hovered ? 'scale-105' : 'scale-100'}
                    shadow-lg bg-muted`}
                >
                  {!imgLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
                  <img
                    src={imgSrc}
                    alt={profile.name}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      imgLoaded ? 'opacity-100' : 'opacity-0'
                    } group-hover:scale-110`}
                    onLoad={() => setImgLoaded(true)}
                  />

                  {/* Active badge */}
                  {isActive && !managing && (
                    <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 text-black" />
                    </div>
                  )}

                  {/* Managing overlay */}
                  {managing && (
                    <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200 ${
                      hovered ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <Pencil className="w-8 h-8 text-white" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  {!managing && !isActive && hovered && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center animate-fade-in">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Check className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Name */}
                <span className={`text-sm sm:text-base font-semibold transition-colors duration-200 ${
                  isActive ? 'text-primary' : hovered ? 'text-foreground' : 'text-foreground/60'
                }`}>
                  {profile.name}
                </span>

                {/* Description */}
                <span className="text-[11px] text-muted-foreground/40 max-w-[120px] text-center">
                  {desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Managing toggle */}
        {managing && (
          <button
            onClick={() => setManaging(false)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-black font-semibold hover:bg-primary/90 transition-all text-sm"
          >
            Terminé
          </button>
        )}
      </div>

      {/* Bottom */}
      <div className="py-3 text-center">
        <p className="text-[10px] text-muted-foreground/20">
          © 2026 Netplus · Aeronlabs + IAgen
        </p>
      </div>
    </div>
  );
}

// Re-export for backward compatibility
export { SmallProfileAvatar, PROFILE_IMAGES } from '@/components/ui/ProfileAvatar';
