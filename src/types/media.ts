// Media Types for TMDB API

import { DEBRID_SERVERS, DEBRID_LANGUAGE_GROUPS } from './servers/debrid';

export interface Media {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
  adult?: boolean;
  original_language: string;
  original_title?: string;
  original_name?: string;
}

export interface MovieDetails extends Media {
  runtime: number;
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  genres: Genre[];
  production_companies: ProductionCompany[];
  spoken_languages: SpokenLanguage[];
  belongs_to_collection?: Collection;
  homepage?: string;
  imdb_id?: string;
  title: string;
  release_date: string;
}

export interface TVDetails extends Media {
  episode_run_time: number[];
  number_of_episodes: number;
  number_of_seasons: number;
  seasons: Season[];
  status: string;
  tagline?: string;
  genres: Genre[];
  networks: Network[];
  created_by: Creator[];
  first_air_date: string;
  last_air_date: string;
  name: string;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  overview: string;
  poster_path: string | null;
  air_date: string;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  runtime: number;
  vote_average: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface Collection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface Network {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface Creator {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// Legacy server types (kept for backward compatibility)
export interface VideoServer {
  name: string;
  url: string;
  lang: string;
}

export interface LanguageGroup {
  id: string;
  label: string;
  flag: string;
  servers: VideoServer[];
}

// API Configuration
// NOTE: videoServers & languageGroups are now sourced from servers/debrid.ts
// They are kept here for backward compatibility with existing watch pages.
// New code should import directly from '@/types/servers'

export const API_CONFIG = {
  tmdb: {
    baseUrl: 'https://api.themoviedb.org/3',
    apiKey: '45a766dcce0da3d639845fd158b346e6',
    imageUrl: 'https://image.tmdb.org/t/p',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280',
    posterSizes: {
      small: '/w185',
      medium: '/w342',
      large: '/w500',
      original: '/original'
    },
    backdropSizes: {
      small: '/w300',
      medium: '/w780',
      large: '/w1280',
      original: '/original'
    }
  },
  // Legacy: mapped from DEBRID_SERVERS for backward compatibility
  videoServers: Object.fromEntries(
    Object.entries(DEBRID_SERVERS).map(([key, server]) => [
      key.replace('debrid_', 'server'),
      {
        name: server.name,
        lang: server.lang,
        movieUrl: server.movieUrl,
        tvUrl: server.tvUrl,
      }
    ])
  ),

  /** Language groups — re-exported from debrid module */
  languageGroups: DEBRID_LANGUAGE_GROUPS.map(g => ({
    id: g.id,
    label: g.label,
    flag: g.flag,
  })) as unknown as readonly { id: string; label: string; flag: string }[],
  language: 'fr-FR'
} as const;

// Helper functions
export const getPosterUrl = (path: string | null, size: keyof typeof API_CONFIG.tmdb.posterSizes = 'large'): string | null => {
  if (!path) return null;
  return `${API_CONFIG.tmdb.imageUrl}${API_CONFIG.tmdb.posterSizes[size]}${path}`;
};

export const getBackdropUrl = (path: string | null, size: keyof typeof API_CONFIG.tmdb.backdropSizes = 'large'): string | null => {
  if (!path) return null;
  return `${API_CONFIG.tmdb.imageUrl}${API_CONFIG.tmdb.backdropSizes[size]}${path}`;
};

export const getMediaTitle = (media: Media): string => {
  return media.title || media.name || 'Titre inconnu';
};

export const getMediaDate = (media: Media): string => {
  return media.release_date || media.first_air_date || '';
};

export const getMediaYear = (media: Media): string => {
  const date = getMediaDate(media);
  return date ? date.split('-')[0] : '';
};
