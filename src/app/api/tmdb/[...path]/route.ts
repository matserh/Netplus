/**
 * Server-side TMDB API Proxy
 *
 * All client-side TMDB requests go through this route so the API key
 * never reaches the browser bundle. The key is read from process.env.TMDB_API_KEY
 * on the server and appended to the upstream request.
 *
 * Usage from client:  fetch('/api/tmdb/trending/all/week?language=fr-FR&page=1')
 * Server forwards to:  https://api.themoviedb.org/3/trending/all/week?api_key=XXX&language=fr-FR&page=1
 */

import { NextRequest, NextResponse } from 'next/server';

// This route runs in the Worker runtime with nodejs_compat — no need for edge runtime

const TMDB_BASE = 'https://api.themoviedb.org/3';
// Read env var at request time (not module load time) for Cloudflare Workers compatibility

// Cache control: 5 min on trending/popular, 1 hour on details
function getMaxAge(path: string): number {
  if (path.includes('/trending') || path.includes('/popular') || path.includes('/now_playing') || path.includes('/upcoming')) {
    return 300; // 5 minutes
  }
  if (path.includes('/genre')) return 3600; // 1 hour (genres rarely change)
  return 600; // 10 minutes default
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const TMDB_API_KEY = process.env.TMDB_API_KEY;

    if (!TMDB_API_KEY) {
      console.error('[tmdb-proxy] TMDB_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Service non configuré' },
        { status: 503 }
      );
    }

    // Reconstruct the TMDB endpoint path
    const endpoint = '/' + path.join('/');

    // Clone client query params (language, page, query, region, etc.)
    const clientParams = req.nextUrl.searchParams;
    const upstreamUrl = new URL(`${TMDB_BASE}${endpoint}`);

    // Always add the API key server-side
    upstreamUrl.searchParams.set('api_key', TMDB_API_KEY);

    // Forward all client query params except api_key
    for (const [key, value] of clientParams.entries()) {
      if (key !== 'api_key') {
        upstreamUrl.searchParams.set(key, value);
      }
    }

    // Fetch from TMDB
    const response = await fetch(upstreamUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NetPlus/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[tmdb-proxy] TMDB ${response.status}: ${endpoint} - ${errorText}`);
      return NextResponse.json(
        { error: 'Erreur TMDB', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Set cache headers
    const maxAge = getMaxAge(endpoint);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      },
    });
  } catch (error) {
    console.error('[tmdb-proxy] Error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
