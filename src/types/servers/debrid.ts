// Debrid Video Servers for Movies & Series
// These servers source from debrid services (Real-Debrid, AllDebrid, etc.)
// Audio dubbing availability depends on the source file served by each provider.

export interface DebridVideoServer {
  name: string;
  lang: string;
  audioType: 'dub' | 'sub' | 'auto';
  description: string;
  movieUrl: (id: number) => string;
  tvUrl: (id: number, season: number, episode: number) => string;
}

// Language group for debrid servers
export interface DebridLanguageGroup {
  id: string;
  label: string;
  flag: string;
  description: string;
}

/**
 * DEBRID SERVERS
 * 
 * Audio Type Legend:
 * - 'dub': Provider tends to serve dubbed audio when available
 * - 'sub': Provider primarily serves with subtitle language change
 * - 'auto': Provider auto-selects best available audio for the language
 * 
 * NOTE: Actual audio language depends on the source file. These labels
 * indicate the provider's tendency, not a guarantee.
 */
export const DEBRID_SERVERS: Record<string, DebridVideoServer> = {
  // === FRENCH AUDIO (VF) - Servers that tend to serve French-dubbed content ===
  debrid_vf_1: {
    name: 'VidSrc VF',
    lang: 'VF',
    audioType: 'dub',
    description: 'Audio français (dubbing)',
    movieUrl: (id: number) => `https://vidsrc.pm/embed/movie/${id}?lang=fr`,
    tvUrl: (id: number, s: number, e: number) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}?lang=fr`,
  },
  debrid_vf_2: {
    name: 'VidSrcMe VF',
    lang: 'VF',
    audioType: 'dub',
    description: 'Audio français (dubbing)',
    movieUrl: (id: number) => `https://vidsrcme.ru/embed/movie/${id}?lang=fr`,
    tvUrl: (id: number, s: number, e: number) => `https://vidsrcme.ru/embed/tv/${id}/${s}/${e}?lang=fr`,
  },
  debrid_vf_3: {
    name: 'VidCore VF',
    lang: 'VF',
    audioType: 'auto',
    description: 'Audio auto (VF si dispo)',
    movieUrl: (id: number) => `https://vidcore.org/embed/movie/${id}`,
    tvUrl: (id: number, s: number, e: number) => `https://vidcore.org/embed/tv/${id}/${s}/${e}`,
  },
  debrid_vf_4: {
    name: '2Embed VF',
    lang: 'VF',
    audioType: 'auto',
    description: 'Audio auto (VF si dispo)',
    movieUrl: (id: number) => `https://www.2embed.cc/embed/movie/${id}`,
    tvUrl: (id: number, s: number, e: number) => `https://www.2embed.cc/embed/tv/${id}/${s}/${e}`,
  },

  // === ENGLISH AUDIO (VO) ===
  debrid_vo_1: {
    name: 'VidSrc EN',
    lang: 'VO',
    audioType: 'dub',
    description: 'Original English audio',
    movieUrl: (id: number) => `https://vidsrc.pm/embed/movie/${id}?lang=en`,
    tvUrl: (id: number, s: number, e: number) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}?lang=en`,
  },
  debrid_vo_2: {
    name: 'VidSrcMe EN',
    lang: 'VO',
    audioType: 'dub',
    description: 'Original English audio',
    movieUrl: (id: number) => `https://vidsrcme.ru/embed/movie/${id}?lang=en`,
    tvUrl: (id: number, s: number, e: number) => `https://vidsrcme.ru/embed/tv/${id}/${s}/${e}?lang=en`,
  },

  // === SUBTITLE LANGUAGE SERVERS (VOSTFR style) ===
  debrid_sub_es: {
    name: 'VidSrc ES',
    lang: 'ES',
    audioType: 'sub',
    description: 'Subtítulos en español',
    movieUrl: (id: number) => `https://vidsrc.pm/embed/movie/${id}?lang=es`,
    tvUrl: (id: number, s: number, e: number) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}?lang=es`,
  },
  debrid_sub_de: {
    name: 'VidSrc DE',
    lang: 'DE',
    audioType: 'sub',
    description: 'Deutsche Untertitel',
    movieUrl: (id: number) => `https://vidsrc.pm/embed/movie/${id}?lang=de`,
    tvUrl: (id: number, s: number, e: number) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}?lang=de`,
  },
  debrid_sub_ar: {
    name: 'VidSrc AR',
    lang: 'AR',
    audioType: 'sub',
    description: 'ترجمة عربية',
    movieUrl: (id: number) => `https://vidsrc.pm/embed/movie/${id}?lang=ar`,
    tvUrl: (id: number, s: number, e: number) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}?lang=ar`,
  },
  debrid_sub_ja: {
    name: 'VidSrc JA',
    lang: 'JA',
    audioType: 'sub',
    description: '日本語字幕',
    movieUrl: (id: number) => `https://vidsrc.pm/embed/movie/${id}?lang=ja`,
    tvUrl: (id: number, s: number, e: number) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}?lang=ja`,
  },
  debrid_sub_pt: {
    name: 'VidSrc PT',
    lang: 'PT',
    audioType: 'sub',
    description: 'Legendas em português',
    movieUrl: (id: number) => `https://vidsrc.pm/embed/movie/${id}?lang=pt`,
    tvUrl: (id: number, s: number, e: number) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}?lang=pt`,
  },
};

/** Debrid language groups for the UI */
export const DEBRID_LANGUAGE_GROUPS: DebridLanguageGroup[] = [
  { id: 'VF', label: 'Français', flag: '🇫🇷', description: 'Audio VF (dubbing français)' },
  { id: 'VO', label: 'English', flag: '🇬🇧', description: 'Audio VO original' },
  { id: 'ES', label: 'Español', flag: '🇪🇸', description: 'Subtítulos ES' },
  { id: 'DE', label: 'Deutsch', flag: '🇩🇪', description: 'Untertitel DE' },
  { id: 'AR', label: 'العربية', flag: '🇸🇦', description: 'ترجمة عربية' },
  { id: 'JA', label: '日本語', flag: '🇯🇵', description: '字幕 JA' },
  { id: 'PT', label: 'Português', flag: '🇧🇷', description: 'Legendas PT' },
];

/**
 * Get debrid servers filtered by language group
 */
export const getDebridServersByLang = (lang: string): DebridVideoServer[] => {
  return Object.values(DEBRID_SERVERS).filter(s => s.lang === lang);
};

/**
 * Build debrid video URL for a specific server
 */
export const getDebridVideoUrl = (
  server: DebridVideoServer,
  tmdbId: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): string => {
  if (type === 'movie') {
    return server.movieUrl(tmdbId);
  }
  return server.tvUrl(tmdbId, season || 1, episode || 1);
};
