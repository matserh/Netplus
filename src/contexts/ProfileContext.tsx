'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ProfileType = 'JEUNESSE' | 'FRENESIE' | 'NOCTURNE';

export interface UserProfile {
  name: string;
  type: ProfileType;
  avatar: string; // icon identifier: 'kids' | 'flame' | 'moon'
}

const PROFILES: UserProfile[] = [
  { name: 'Jeunesse', type: 'JEUNESSE', avatar: 'kids' },
  { name: 'Frénésie', type: 'FRENESIE', avatar: 'flame' },
  { name: 'Nocturne', type: 'NOCTURNE', avatar: 'moon' },
];

// TMDB helper: build query string from params
function buildQuery(params: Record<string, string>): string {
  return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

interface ProfileContextType {
  profile: UserProfile | null;
  hydrated: boolean;
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  profiles: UserProfile[];
  getNowPlayingEndpoint: () => string;
  getUpcomingEndpoint: () => string;
  getBannerEndpoint: () => string;
  getDiscoverEndpoint: (mediaType: 'movie' | 'tv') => string;
  getTrendingEndpoint: () => string;
  getPopularEndpoint: (mediaType: 'movie' | 'tv') => string;
  getTopRatedEndpoint: (mediaType: 'movie' | 'tv') => string;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('netplus-profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old emoji avatars to new icon identifiers
        if (parsed.avatar === '😊') parsed.avatar = 'kids';
        if (parsed.avatar === '🔥') parsed.avatar = 'flame';
        if (parsed.avatar === '🌙') parsed.avatar = 'moon';
        setProfileState(parsed);
      } catch {
        localStorage.removeItem('netplus-profile');
      }
    }
    setHydrated(true);
  }, []);

  const setProfile = (p: UserProfile) => {
    setProfileState(p);
    localStorage.setItem('netplus-profile', JSON.stringify(p));
  };

  const clearProfile = () => {
    setProfileState(null);
    localStorage.removeItem('netplus-profile');
  };

  const getBaseParams = (): Record<string, string> => {
    switch (profile?.type) {
      case 'JEUNESSE':
        return {
          certification_country: 'FR',
          'certification.lte': '12',
          with_genres: '16|10751|14',
          without_genres: '27|53|80',
        };
      case 'FRENESIE':
        return {
          with_genres: '28|18|27|14|878',
        };
      case 'NOCTURNE':
      default:
        return {};
    }
  };

  const getNowPlayingEndpoint = useCallback((): string => {
    const base = getBaseParams();
    return `/movie/now_playing?region=FR&${buildQuery(base)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.type]);

  const getUpcomingEndpoint = useCallback((): string => {
    const base = getBaseParams();
    return `/movie/upcoming?region=FR&${buildQuery(base)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.type]);

  const getBannerEndpoint = useCallback((): string => {
    const base = getBaseParams();
    return `/movie/now_playing?region=FR&${buildQuery(base)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.type]);

  const getDiscoverEndpoint = useCallback((mediaType: 'movie' | 'tv'): string => {
    const base = getBaseParams();
    return `/discover/${mediaType}?sort_by=popularity.desc&${buildQuery(base)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.type]);

  // Trending — uses /trending/all/week with profile genre params appended
  const getTrendingEndpoint = useCallback((): string => {
    const base = getBaseParams();
    // trending doesn't support certification/without_genres natively,
    // so we use discover as a fallback when profile has filters
    if (Object.keys(base).length > 0) {
      return `/discover/movie?sort_by=popularity.desc&${buildQuery(base)}`;
    }
    return '/trending/all/week';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.type]);

  // Popular — uses discover with popularity sort + profile params
  const getPopularEndpoint = useCallback((mediaType: 'movie' | 'tv'): string => {
    const base = getBaseParams();
    return `/discover/${mediaType}?sort_by=popularity.desc&${buildQuery(base)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.type]);

  // Top Rated — uses discover with vote_average sort + profile params
  const getTopRatedEndpoint = useCallback((mediaType: 'movie' | 'tv'): string => {
    const base = getBaseParams();
    // Add minimum vote count to avoid obscure items
    const params = { ...base, 'vote_count.gte': '200' };
    return `/discover/${mediaType}?sort_by=vote_average.desc&${buildQuery(params)}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.type]);

  return (
    <ProfileContext.Provider value={{
      profile, hydrated, setProfile, clearProfile, profiles: PROFILES,
      getNowPlayingEndpoint, getUpcomingEndpoint, getBannerEndpoint,
      getDiscoverEndpoint, getTrendingEndpoint, getPopularEndpoint, getTopRatedEndpoint,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
