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
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  profiles: UserProfile[];
  getNowPlayingEndpoint: () => string;
  getUpcomingEndpoint: () => string;
  getBannerEndpoint: () => string;
  getDiscoverEndpoint: (mediaType: 'movie' | 'tv') => string;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);

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
        // Pipe | = OR logic (any of these genres), comma = AND (must have ALL)
        return {
          certification_country: 'FR',
          'certification.lte': '12',
          with_genres: '16|10751|14',
          without_genres: '27|53|80',
        };
      case 'FRENESIE':
        // No certification filter — excludes movies without French cert data
        // Pipe | = OR logic: Action OR Drama OR Horror OR Fantasy OR Sci-Fi
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

  return (
    <ProfileContext.Provider value={{
      profile, setProfile, clearProfile, profiles: PROFILES,
      getNowPlayingEndpoint, getUpcomingEndpoint, getBannerEndpoint, getDiscoverEndpoint,
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
