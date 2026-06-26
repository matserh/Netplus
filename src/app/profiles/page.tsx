'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Logo } from '@/components/ui/Logo';
import { useProfile, ProfileType, UserProfile } from '@/contexts/ProfileContext';
import { Pencil, LogOut, Check, Play } from 'lucide-react';
import { Media, TMDBResponse, API_CONFIG } from '@/types/media';

// Profile image mapping
const PROFILE_IMAGES: Record<ProfileType, string> = {
  JEUNESSE: '/profiles/jeunesse.png',
  FRENESIE: '/profiles/frenesie.png',
  NOCTURNE: '/profiles/nocturne.png',
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

// Promotional banner — Netflix style with movie backdrop
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

  // Auto-rotate banner
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
    <div className="relative w-full h-[40vh] sm:h-[45vh] md:h-[50vh] overflow-hidden">
      {/* Backdrop image */}
      <div className="absolute inset-0">
        <img
          src={`${API_CONFIG.tmdb.imageUrl}/original${current.backdrop_path}`}
          alt={title}
          className="w-full h-full object-cover transition-all duration-1000"
          key={currentIndex}
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />

      {/* Content overlay */}
      <div className="absolute bottom-8 sm:bottom-12 left-0 right-0 px-6 sm:px-10 md:px-16">
        <div className="max-w-lg">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 drop-shadow-lg">
            {title}
          </h2>
          {current.overview && (
            <p className="text-xs sm:text-sm text-white/60 line-clamp-2 mb-4 max-w-md">
              {current.overview}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs">
              <Play className="w-3 h-3 fill-current" />
              <span>Disponible maintenant</span>
            </div>
            {current.vote_average > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                ★ {current.vote_average.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dots indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-3 right-6 sm:right-10 flex items-center gap-1.5">
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

// Netflix-style profile card with real image
function ProfileCard({
  profile,
  onSelect,
  delay,
  isManaging,
}: {
  profile: UserProfile;
  onSelect: () => void;
  delay: number;
  isManaging: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = PROFILE_IMAGES[profile.type];

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex flex-col items-center gap-3 group transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {/* Avatar Card — Netflix style with real image */}
      <div
        className={`relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-xl overflow-hidden
          ring-2 ${hovered ? 'ring-white ring-offset-2 ring-offset-background' : 'ring-transparent'}
          transition-all duration-300 ${hovered ? 'scale-105' : 'scale-100'}
          shadow-lg bg-muted`}
      >
        {/* Image */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        <img
          src={imgSrc}
          alt={profile.name}
          className={`w-full h-full object-cover transition-all duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-110`}
          onLoad={() => setImgLoaded(true)}
        />

        {/* Hover overlay — pencil when managing */}
        {isManaging && (
          <div
            className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-200 ${
              hovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Pencil className="w-8 h-8 text-white" />
          </div>
        )}

        {/* Hover overlay — check when selecting */}
        {!isManaging && hovered && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Check className="w-7 h-7 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Profile Name */}
      <span
        className={`text-sm sm:text-base font-semibold transition-colors duration-200 ${
          hovered ? 'text-foreground' : 'text-foreground/60'
        }`}
      >
        {profile.name}
      </span>
    </button>
  );
}

export default function ProfilesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { profiles, setProfile, profile: currentProfile } = useProfile();
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Netflix-style promotional banner at top */}
      <PromoBanner />

      {/* Profile selection area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Logo */}
        <div className="mb-6 sm:mb-8">
          <Logo size="md" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 animate-fade-in">
          Qui regarde ?
        </h1>
        {managing && (
          <p className="text-sm text-primary mb-2 animate-fade-in">
            Modifiez vos profils
          </p>
        )}

        {/* Profiles — Netflix-style grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6 md:gap-8 justify-items-center my-8 sm:my-10">
          {profiles.map((profile, i) => (
            <ProfileCard
              key={profile.type}
              profile={profile}
              onSelect={() => handleSelect(profile)}
              delay={150 + i * 120}
              isManaging={managing}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <button
            onClick={() => setManaging(!managing)}
            className="flex items-center gap-2 px-5 py-2.5 rounded border border-foreground/30 text-foreground/50 hover:border-foreground/60 hover:text-foreground transition-all text-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{managing ? 'Terminé' : 'Gérer les profils'}</span>
          </button>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 px-5 py-2.5 rounded border border-foreground/30 text-foreground/50 hover:border-red-400/50 hover:text-red-400 transition-all text-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
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

// Small avatar component for sidebar/header reuse
function SmallProfileAvatar({ type, className }: { type: ProfileType; className?: string }) {
  const imgSrc = PROFILE_IMAGES[type];
  return (
    <div className={`relative overflow-hidden rounded-lg ${className || 'w-7 h-7'}`}>
      <img src={imgSrc} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

export { SmallProfileAvatar, PROFILE_IMAGES };
