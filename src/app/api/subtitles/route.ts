import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

const TMDB_API_KEY = '45a766dcce0da3d639845fd158b346e6';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// ─── SRT Parser ───
interface SubtitleBlock {
  index: number;
  startTime: number; // seconds
  endTime: number;   // seconds
  text: string;
}

function parseSRT(srtContent: string): SubtitleBlock[] {
  const blocks: SubtitleBlock[] = [];
  const rawBlocks = srtContent.trim().replace(/\r\n/g, '\n').split(/\n\n+/);

  for (const block of rawBlocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) continue;

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    const text = lines.slice(2).join('\n').trim();

    blocks.push({ index, startTime, endTime, text });
  }

  return blocks;
}

// ─── VTT Parser ───
function parseVTT(vttContent: string): SubtitleBlock[] {
  const blocks: SubtitleBlock[] = [];
  const cleaned = vttContent.replace(/^WEBVTT.*\n/i, '').trim();
  const rawBlocks = cleaned.split(/\n\n+/);
  let blockIndex = 0;

  for (const block of rawBlocks) {
    const lines = block.split('\n').filter(l => l.trim());
    
    // Find the timestamp line
    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }
    if (timeLineIdx === -1) continue;

    const timeMatch = lines[timeLineIdx].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) {
      // Try MM:SS.mmm format
      const shortMatch = lines[timeLineIdx].match(
        /(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2})[,.](\d{3})/
      );
      if (!shortMatch) continue;
      
      const startTime = parseInt(shortMatch[1]) * 60 + parseInt(shortMatch[2]) + parseInt(shortMatch[3]) / 1000;
      const endTime = parseInt(shortMatch[4]) * 60 + parseInt(shortMatch[5]) + parseInt(shortMatch[6]) / 1000;
      const text = lines.slice(timeLineIdx + 1).join('\n').trim();
      
      blocks.push({ index: ++blockIndex, startTime, endTime, text });
      continue;
    }

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    const text = lines.slice(timeLineIdx + 1).join('\n').trim();
    blocks.push({ index: ++blockIndex, startTime, endTime, text });
  }

  return blocks;
}

// ─── Get IMDB ID from TMDB ───
async function getImdbId(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<string | null> {
  try {
    const endpoint = mediaType === 'movie' 
      ? `${TMDB_BASE}/movie/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`
      : `${TMDB_BASE}/tv/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
    
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = await res.json();
    return data.imdb_id || null;
  } catch {
    return null;
  }
}

// ─── Search subtitles on multiple sources ───
async function fetchSubtitleFromOpenSubtitles(imdbId: string, lang: string = 'en', season?: number, episode?: number): Promise<string | null> {
  try {
    // OpenSubtitles REST API - search for subtitles
    let searchUrl = `https://rest.opensubtitles.org/search/imdbid-${imdbId.replace('tt', '')}/sublangid-${lang}`;
    // Add season/episode for TV shows
    if (season) searchUrl += `/season-${season}`;
    if (episode) searchUrl += `/episode-${episode}`;
    
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'NetPlus v1.0' }
    });
    if (!res.ok) return null;
    
    const results = await res.json();
    if (!results || results.length === 0) return null;
    
    // Get the first result's download link
    const sub = results[0];
    const downloadUrl = sub.SubDownloadLink;
    if (!downloadUrl) return null;
    
    // Download the subtitle file (it's gzipped SRT)
    const subRes = await fetch(downloadUrl);
    if (!subRes.ok) return null;
    
    // OpenSubtitles returns gzip-compressed .srt.gz files
    // Must decompress before parsing
    try {
      const buffer = await subRes.arrayBuffer();
      const decompressed = gunzipSync(Buffer.from(buffer)).toString('utf-8');
      return decompressed;
    } catch {
      // Fallback: try reading as plain text (some sources may not be gzipped)
      try {
        const text = await new Response(buffer).text();
        return text;
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
}

// ─── Fallback: fetch from subdl.com ───
async function fetchSubtitleFromSubDL(imdbId: string, lang: string = 'en', mediaType: 'movie' | 'tv' = 'movie', season?: number, episode?: number): Promise<string | null> {
  try {
    // SubDL uses imdb_id parameter (not film_name) and supports tv type
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    let searchUrl = `https://api.subdl.com/auto?imdb_id=${encodeURIComponent(imdbId)}&language=${lang}&type=${type}`;
    if (season) searchUrl += `&season_number=${season}`;
    if (episode) searchUrl += `&episode_number=${episode}`;
    
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.subtitles?.length) return null;
    
    const sub = data.subtitles[0];
    const downloadUrl = sub.url?.startsWith('http') ? sub.url : `https://api.subdl.com${sub.url}`;
    
    const subRes = await fetch(downloadUrl);
    if (!subRes.ok) return null;
    
    return await subRes.text();
  } catch {
    return null;
  }
}

// ─── Main GET handler ───
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get('tmdbId');
    const mediaType = (searchParams.get('mediaType') || 'movie') as 'movie' | 'tv';
    const lang = searchParams.get('lang') || 'fr'; // Target language
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');

    if (!tmdbId) {
      return NextResponse.json({ error: 'tmdbId requis' }, { status: 400 });
    }

    // Validate tmdbId is a valid number
    const numericTmdbId = Number(tmdbId);
    if (isNaN(numericTmdbId) || numericTmdbId <= 0) {
      return NextResponse.json({ error: 'tmdbId invalide' }, { status: 400 });
    }

    // Step 1: Get IMDB ID
    const imdbId = await getImdbId(numericTmdbId, mediaType);
    if (!imdbId) {
      return NextResponse.json({ 
        error: 'IMDB ID non trouvé',
        subtitles: [],
        source: 'none'
      });
    }

    const seasonNum = season ? Number(season) : undefined;
    const episodeNum = episode ? Number(episode) : undefined;

    // Step 2: Try to fetch French subtitles directly
    let srtContent: string | null = null;
    let source = '';
    let sourceLang = '';

    // Try French first
    srtContent = await fetchSubtitleFromOpenSubtitles(imdbId, 'fre', seasonNum, episodeNum);
    if (srtContent) { source = 'opensubtitles'; sourceLang = 'fr'; }
    
    if (!srtContent) {
      srtContent = await fetchSubtitleFromSubDL(imdbId, 'fre', mediaType, seasonNum, episodeNum);
      if (srtContent) { source = 'subdl'; sourceLang = 'fr'; }
    }

    // If no French, try English (we'll translate later)
    if (!srtContent) {
      srtContent = await fetchSubtitleFromOpenSubtitles(imdbId, 'eng', seasonNum, episodeNum);
      if (srtContent) { source = 'opensubtitles'; sourceLang = 'en'; }
    }

    if (!srtContent) {
      srtContent = await fetchSubtitleFromSubDL(imdbId, 'en', mediaType, seasonNum, episodeNum);
      if (srtContent) { source = 'subdl'; sourceLang = 'en'; }
    }

    if (!srtContent) {
      return NextResponse.json({
        error: 'Aucun sous-titre trouvé pour ce contenu',
        subtitles: [],
        source: 'none',
        imdbId,
        needsTranslation: false,
      });
    }

    // Step 3: Parse the subtitle content
    let blocks: SubtitleBlock[] = [];
    
    if (srtContent.trim().startsWith('WEBVTT')) {
      blocks = parseVTT(srtContent);
    } else {
      blocks = parseSRT(srtContent);
    }

    if (blocks.length === 0) {
      return NextResponse.json({
        error: 'Impossible de parser les sous-titres',
        subtitles: [],
        source,
        imdbId,
        needsTranslation: false,
      });
    }

    // Step 4: Return subtitle data
    const needsTranslation = sourceLang !== 'fr' && lang === 'fr';

    return NextResponse.json({
      subtitles: blocks.map(b => ({
        index: b.index,
        startTime: Math.round(b.startTime * 1000) / 1000, // precise seconds
        endTime: Math.round(b.endTime * 1000) / 1000,
        text: b.text,
      })),
      source,
      sourceLang,
      imdbId,
      needsTranslation,
      totalBlocks: blocks.length,
    });
  } catch (error) {
    console.error('[subtitles/api] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
