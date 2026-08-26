import { NextRequest, NextResponse } from 'next/server';

/**
 * TMDB → Anilist ID Mapping API
 * 
 * Since TMDB and Anilist use different ID systems, we need to map between them.
 * This API uses Anilist's external ID search to find the Anilist ID for a TMDB anime.
 * 
 * Cache is in-memory per server instance.
 */

const tmdbToAnilistCache = new Map<number, number>();

/**
 * Search Anilist for a TMDB anime by title
 */
async function findAnilistId(tmdbId: number, title: string): Promise<number | null> {
  // Check cache first
  const cached = tmdbToAnilistCache.get(tmdbId);
  if (cached) return cached;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          Media(search: "${title.replace(/"/g, '\\"')}", type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
          }
        }`
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const anilistId = data?.data?.Media?.id;

    if (anilistId) {
      tmdbToAnilistCache.set(tmdbId, anilistId);
    }

    return anilistId || null;
  } catch (error) {
    console.error('[Anime Mapping] Failed to find Anilist ID:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tmdbId = parseInt(searchParams.get('tmdbId') || '0');
  const title = searchParams.get('title') || '';

  if (!tmdbId && !title) {
    return NextResponse.json(
      { error: 'Provide tmdbId or title parameter' },
      { status: 400 }
    );
  }

  if (title) {
    const anilistId = await findAnilistId(tmdbId || 0, title);
    return NextResponse.json({
      tmdbId,
      title,
      anilistId,
    });
  }

  if (tmdbId) {
    const cached = tmdbToAnilistCache.get(tmdbId);
    if (cached) {
      return NextResponse.json({ tmdbId, anilistId: cached });
    }
    return NextResponse.json({
      tmdbId,
      anilistId: null,
      message: 'No cached mapping found. Provide title for lookup.',
    });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmdbId, title } = body;

    if (!tmdbId || !title) {
      return NextResponse.json(
        { error: 'Provide tmdbId and title in request body' },
        { status: 400 }
      );
    }

    const anilistId = await findAnilistId(tmdbId, title);
    return NextResponse.json({
      tmdbId,
      title,
      anilistId,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
