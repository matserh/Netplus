// Server configuration barrel export
// This module provides organized access to all video server types:
// - Debrid servers: For movies & series (TMDB-based)
// - Anime servers: For anime content (Anilist-based, sub/dub)
// Both are interconnected through shared types and a unified interface

export type { DebridVideoServer, DebridLanguageGroup } from './debrid';
export {
  DEBRID_SERVERS,
  DEBRID_LANGUAGE_GROUPS,
  getDebridServersByLang,
  getDebridVideoUrl,
} from './debrid';

export type {
  AnimeVideoServer,
  AnimeStreamConfig,
  AnimeLanguageGroup,
  AnimeAudioType,
} from './anime';
export {
  ANIME_SERVERS,
  ANIME_LANGUAGE_GROUPS,
  getAnimeServersByGroup,
  getAnimeStreamUrl,
  ANIME_GENRE_ID,
  isAnimeMedia,
} from './anime';

import { isAnimeMedia } from './anime';

/**
 * Content type classification
 */
export type ContentType = 'debrid' | 'anime';

/**
 * Determine if a TMDB media item should use anime servers
 */
export const getContentType = (
  genreIds: number[],
  originalLanguage?: string
): ContentType => {
  return isAnimeMedia(genreIds, originalLanguage) ? 'anime' : 'debrid';
};
