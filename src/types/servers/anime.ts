// Anime Video Servers — GogoAnime, Aniplay, and other anime-specific sources
// Anime is different from debrid: sources have separate SUB and DUB episode versions
// The audio language is inherent to the episode, not a parameter

export type AnimeAudioType = 'sub' | 'dub';

export interface AnimeVideoServer {
  name: string;
  /** Source provider (gogoanime, aniplay, etc.) */
  provider: string;
  /** Supported audio types */
  audioTypes: AnimeAudioType[];
  /** Supported dub languages (only for 'dub' type) */
  dubLanguages: string[];
  description: string;
  /**
   * Build the streaming URL for this server.
   * Returns null if the configuration is invalid.
   */
  buildUrl: (config: AnimeStreamConfig) => string | null;
}

export interface AnimeStreamConfig {
  /** Anilist ID for the anime */
  anilistId: number;
  /** Episode number */
  episode: number;
  /** Audio type: sub or dub */
  audioType: AnimeAudioType;
  /** Preferred language for dubbed versions */
  dubLang?: string;
  /** Server preference index for multi-server sources */
  serverIndex?: number;
}

export interface AnimeLanguageGroup {
  id: string;
  label: string;
  flag: string;
  audioType: AnimeAudioType;
  description: string;
}

/**
 * ANIME SERVERS
 * 
 * Architecture:
 * - Anime servers use server-side API routes to fetch actual streaming URLs
 * - The frontend calls /api/anime/stream which proxies to the anime source
 * - This avoids CORS issues and keeps source URLs private
 * - Each server has different source providers and dub language availability
 */
export const ANIME_SERVERS: Record<string, AnimeVideoServer> = {
  // === GOGOANIME SOURCES ===
  // GogoAnime has separate sub and dub episodes for many popular anime
  // French dub (VF) is available for many shonen series

  anime_gogo_sub: {
    name: 'GogoAnime VOSTFR',
    provider: 'gogoanime',
    audioTypes: ['sub'],
    dubLanguages: [],
    description: 'Sous-titres français (VOSTFR)',
    buildUrl: (config: AnimeStreamConfig) => {
      return `/api/anime/stream?provider=gogoanime&anilistId=${config.anilistId}&episode=${config.episode}&audioType=sub`;
    },
  },

  anime_gogo_dub_fr: {
    name: 'GogoAnime VF',
    provider: 'gogoanime',
    audioTypes: ['dub'],
    dubLanguages: ['fr'],
    description: 'Audio français (VF)',
    buildUrl: (config: AnimeStreamConfig) => {
      return `/api/anime/stream?provider=gogoanime&anilistId=${config.anilistId}&episode=${config.episode}&audioType=dub&dubLang=fr`;
    },
  },

  anime_gogo_dub_en: {
    name: 'GogoAnime Dub EN',
    provider: 'gogoanime',
    audioTypes: ['dub'],
    dubLanguages: ['en'],
    description: 'English dub audio',
    buildUrl: (config: AnimeStreamConfig) => {
      return `/api/anime/stream?provider=gogoanime&anilistId=${config.anilistId}&episode=${config.episode}&audioType=dub&dubLang=en`;
    },
  },

  // === ANIPLAY / ANIWATCH SOURCES ===
  // Aniplay provides high-quality streams with multi-language dub support

  anime_ani_sub: {
    name: 'AniPlay VOSTFR',
    provider: 'aniplay',
    audioTypes: ['sub'],
    dubLanguages: [],
    description: 'Sous-titres français',
    buildUrl: (config: AnimeStreamConfig) => {
      return `/api/anime/stream?provider=aniplay&anilistId=${config.anilistId}&episode=${config.episode}&audioType=sub`;
    },
  },

  anime_ani_dub_fr: {
    name: 'AniPlay VF',
    provider: 'aniplay',
    audioTypes: ['dub'],
    dubLanguages: ['fr'],
    description: 'Audio français (VF)',
    buildUrl: (config: AnimeStreamConfig) => {
      return `/api/anime/stream?provider=aniplay&anilistId=${config.anilistId}&episode=${config.episode}&audioType=dub&dubLang=fr`;
    },
  },

  anime_ani_dub_en: {
    name: 'AniPlay Dub EN',
    provider: 'aniplay',
    audioTypes: ['dub'],
    dubLanguages: ['en'],
    description: 'English dub audio',
    buildUrl: (config: AnimeStreamConfig) => {
      return `/api/anime/stream?provider=aniplay&anilistId=${config.anilistId}&episode=${config.episode}&audioType=dub&dubLang=en`;
    },
  },

  // === MULTI-SOURCE FALLBACK ===
  // Uses vidsrc.pm for anime as a last resort (TMDB-based)

  anime_fallback_sub: {
    name: 'VidSrc Anime',
    provider: 'vidsrc',
    audioTypes: ['sub'],
    dubLanguages: [],
    description: 'Fallback (VOSTFR)',
    buildUrl: (config: AnimeStreamConfig) => {
      return `/api/anime/stream?provider=vidsrc&anilistId=${config.anilistId}&episode=${config.episode}&audioType=sub`;
    },
  },
};

/** Anime language groups for the UI */
export const ANIME_LANGUAGE_GROUPS: AnimeLanguageGroup[] = [
  { id: 'VF', label: 'Français VF', flag: '🇫🇷', audioType: 'dub', description: 'Audio doublé français' },
  { id: 'VOSTFR', label: 'VOSTFR', flag: '🇫🇷', audioType: 'sub', description: 'Sous-titres français' },
  { id: 'DUB_EN', label: 'English Dub', flag: '🇬🇧', audioType: 'dub', description: 'English dubbed audio' },
];

/**
 * Get anime servers filtered by language group and audio type
 */
export const getAnimeServersByGroup = (groupId: string): AnimeVideoServer[] => {
  const group = ANIME_LANGUAGE_GROUPS.find(g => g.id === groupId);
  if (!group) return Object.values(ANIME_SERVERS);

  return Object.values(ANIME_SERVERS).filter(server => {
    if (group.audioType === 'sub') {
      return server.audioTypes.includes('sub');
    }
    // For dub groups, filter by dub language
    if (groupId === 'VF') {
      return server.dubLanguages.includes('fr');
    }
    if (groupId === 'DUB_EN') {
      return server.dubLanguages.includes('en');
    }
    return server.audioTypes.includes('dub');
  });
};

/**
 * Build anime streaming URL for a specific server
 */
export const getAnimeStreamUrl = (server: AnimeVideoServer, config: AnimeStreamConfig): string | null => {
  return server.buildUrl(config);
};

/**
 * TMDB genre ID for Animation
 */
export const ANIME_GENRE_ID = 16;

/**
 * Check if a media item is likely anime based on genre IDs and original language
 */
export const isAnimeMedia = (genreIds: number[], originalLanguage?: string): boolean => {
  const hasAnimeGenre = genreIds.includes(ANIME_GENRE_ID);
  const isJapanese = originalLanguage === 'ja';
  return hasAnimeGenre && isJapanese;
};
