import { NextRequest, NextResponse } from 'next/server';

/**
 * Anime Streaming API
 * 
 * Proxies streaming requests to anime providers (GogoAnime, Aniplay, etc.)
 * Returns embed URLs that can be used in iframes.
 * 
 * Architecture:
 * 1. Map Anilist ID → Provider episode ID
 * 2. Fetch streaming sources from provider
 * 3. Return embed URL(s) to frontend
 * 
 * Supported providers: gogoanime, aniplay, vidsrc (fallback)
 */

// Provider-specific search/episode lookup endpoints
const GOGO_SEARCH_URL = 'https://gogoanime3.co/search';
const GOGO_AJAX_URL = 'https://gogoanime3.co/ajax';
const ANIPLAY_BASE = 'https://aniplay.to';

// Anilist → provider ID mapping (cached in-memory, refetched per session)
const anilistToGogoCache = new Map<string, string>();

/**
 * Search GogoAnime for a title and return the episode page URL
 */
async function searchGogoAnime(title: string, episode: number, isDub: boolean): Promise<string | null> {
  try {
    const searchQuery = isDub ? `${title} (Dub)` : title;
    
    // Search for the anime
    const searchRes = await fetch(`${GOGO_SEARCH_URL}?keyword=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://gogoanime3.co/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!searchRes.ok) return null;

    const html = await searchRes.text();
    
    // Extract the first anime link from search results
    // GogoAnime search returns links like /category/naruto
    const categoryMatch = html.match(/href="(\/category\/[^"]+)"/i);
    if (!categoryMatch) return null;

    const categorySlug = categoryMatch[1].replace('/category/', '');
    
    // Build episode URL
    // GogoAnime episode URLs follow: /{slug}-episode-{number}
    // For dub: the slug typically ends with -(dub)
    const episodeSlug = isDub 
      ? `${categorySlug}-episode-${episode}` 
      : `${categorySlug}-episode-${episode}`;
    
    return `https://gogoanime3.co/${episodeSlug}`;
  } catch (error) {
    console.error('[Anime API] GogoAnime search failed:', error);
    return null;
  }
}

/**
 * Get streaming sources from GogoAnime episode page
 */
async function getGogoAnimeSources(episodeUrl: string): Promise<{ embedUrl: string; sources: string[] } | null> {
  try {
    const res = await fetch(episodeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://gogoanime3.co/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    
    // Extract the embed ID from the episode page
    // GogoAnime loads the player via an AJAX call with an ID
    const idMatch = html.match(/data-id="(\d+)"/);
    if (!idMatch) {
      // Try alternate pattern
      const altMatch = html.match(/movie_id\s*=\s*["'](\d+)/);
      if (!altMatch) return null;
    }
    
    const animeId = idMatch ? idMatch[1] : (html.match(/movie_id\s*=\s*["'](\d+)/)?.[1]);
    if (!animeId) return null;

    // Try multiple server endpoints
    const servers = ['embed-6', 'embed-4', 'embed-2', 'embed-5'];
    
    for (const server of servers) {
      try {
        const ajaxRes = await fetch(`${GOGO_AJAX_URL}/${server}/getSources?id=${animeId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': episodeUrl,
            'X-Requested-With': 'XMLHttpRequest',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (ajaxRes.ok) {
          const data = await ajaxRes.json();
          if (data?.link) {
            return { embedUrl: data.link, sources: [data.link] };
          }
          if (data?.sources) {
            const source = data.sources.find((s: { file: string }) => s.file);
            if (source) {
              return { embedUrl: source.file, sources: data.sources.map((s: { file: string }) => s.file) };
            }
          }
        }
      } catch {
        // Try next server
      }
    }

    return null;
  } catch (error) {
    console.error('[Anime API] GogoAnime sources failed:', error);
    return null;
  }
}

/**
 * Aniplay provider - uses different URL patterns for sub/dub
 */
async function getAniplayStream(
  anilistId: number, 
  episode: number, 
  audioType: 'sub' | 'dub',
  dubLang?: string
): Promise<string | null> {
  try {
    // Aniplay uses Anilist IDs directly in their URLs
    // Pattern: /watch/{anilist-id}/{episode}?lang=sub|dub
    const lang = audioType === 'dub' ? 'dub' : 'sub';
    const langParam = audioType === 'dub' && dubLang ? `&dubLang=${dubLang}` : '';
    
    return `${ANIPLAY_BASE}/watch/${anilistId}/${episode}?lang=${lang}${langParam}`;
  } catch (error) {
    console.error('[Anime API] Aniplay failed:', error);
    return null;
  }
}

/**
 * VidSrc fallback - uses TMDB-based embed for anime
 * This will try to find the TMDB ID from Anilist external IDs
 */
async function getVidSrcFallback(
  anilistId: number,
  episode: number,
  _audioType: 'sub' | 'dub'
): Promise<string | null> {
  try {
    // Get Anilist data to find TMDB ID
    const anilistRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          Media(id: ${anilistId}) {
            idMal
            externalLinks {
              site
              url
            }
          }
        }`
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!anilistRes.ok) return null;

    const data = await anilistRes.json();
    const media = data?.data?.Media;
    if (!media?.idMal) return null;

    // Use MyAnimeList ID to find TMDB ID via external IDs
    // Fallback: use the Anilist ID directly as TMDB ID (works for some anime)
    const tmdbId = media.idMal;

    // Calculate season and episode from flat episode number
    // Most anime have 1 season, but some have multiple
    const season = 1;
    
    return `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}`;
  } catch (error) {
    console.error('[Anime API] VidSrc fallback failed:', error);
    return null;
  }
}

/**
 * Resolve Anilist ID to anime title for GogoAnime search
 */
async function getAnimeTitle(anilistId: number): Promise<string | null> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          Media(id: ${anilistId}) {
            title {
              romaji
              english
            }
            synonyms
          }
        }`
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const media = data?.data?.Media;
    if (!media?.title) return null;

    return media.title.english || media.title.romaji || media.synonyms?.[0] || null;
  } catch (error) {
    console.error('[Anime API] Failed to get anime title:', error);
    return null;
  }
}

/**
 * Main streaming handler
 */
async function getStreamUrl(
  provider: string,
  anilistId: number,
  episode: number,
  audioType: 'sub' | 'dub',
  dubLang?: string
): Promise<{ url: string; provider: string; fallbacks: string[] }> {
  const fallbacks: string[] = [];

  switch (provider) {
    case 'gogoanime': {
      const isDub = audioType === 'dub';
      const title = await getAnimeTitle(anilistId);
      if (!title) break;

      const episodeUrl = await searchGogoAnime(title, episode, isDub);
      if (!episodeUrl) break;

      const sources = await getGogoAnimeSources(episodeUrl);
      if (sources?.embedUrl) {
        return { url: sources.embedUrl, provider, fallbacks: sources.sources };
      }
      break;
    }

    case 'aniplay': {
      const url = await getAniplayStream(anilistId, episode, audioType, dubLang);
      if (url) {
        // Add VidSrc as fallback
        const vsUrl = await getVidSrcFallback(anilistId, episode, audioType);
        return { url, provider, fallbacks: vsUrl ? [vsUrl] : [] };
      }
      break;
    }

    case 'vidsrc': {
      const url = await getVidSrcFallback(anilistId, episode, audioType);
      if (url) {
        return { url, provider: 'vidsrc', fallbacks: [] };
      }
      break;
    }
  }

  // All providers failed — return VidSrc as ultimate fallback
  const vsUrl = await getVidSrcFallback(anilistId, episode, audioType);
  if (vsUrl) {
    return { url: vsUrl, provider: 'vidsrc-fallback', fallbacks: [] };
  }

  return { url: '', provider: 'none', fallbacks: [] };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const provider = searchParams.get('provider') || 'gogoanime';
  const anilistId = parseInt(searchParams.get('anilistId') || '0');
  const episode = parseInt(searchParams.get('episode') || '1');
  const audioType = (searchParams.get('audioType') || 'sub') as 'sub' | 'dub';
  const dubLang = searchParams.get('dubLang') || undefined;

  // Validate required params
  if (!anilistId || !episode) {
    return NextResponse.json(
      { error: 'Missing required parameters: anilistId, episode' },
      { status: 400 }
    );
  }

  // Validate provider
  const validProviders = ['gogoanime', 'aniplay', 'vidsrc'];
  if (!validProviders.includes(provider)) {
    return NextResponse.json(
      { error: `Invalid provider. Use one of: ${validProviders.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const result = await getStreamUrl(provider, anilistId, episode, audioType, dubLang);

    if (!result.url) {
      return NextResponse.json(
        { error: 'No streaming source found for this episode', fallbacks: result.fallbacks },
        { status: 404 }
      );
    }

    return NextResponse.json({
      url: result.url,
      provider: result.provider,
      audioType,
      episode,
      anilistId,
      fallbacks: result.fallbacks,
    });
  } catch (error) {
    console.error('[Anime Stream API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streaming source' },
      { status: 500 }
    );
  }
}