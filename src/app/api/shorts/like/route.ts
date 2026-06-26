import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Helper: get authenticated user from JWT token
// IMPORTANT: Must pass secret explicitly for App Router API routes
async function getAuthUser(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      console.log('[like/api] No token or email found in JWT');
      return null;
    }
    const user = await prisma.user.findUnique({ where: { email: token.email as string } });
    if (!user) {
      console.log('[like/api] User not found in DB for email:', token.email);
    }
    return user;
  } catch (error) {
    console.error('[like/api] getAuthUser error:', error);
    return null;
  }
}

// POST — Toggle like (like if not liked, unlike if already liked)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { mediaId, mediaType, segment, season } = body;

    if (!mediaId || !mediaType) {
      return NextResponse.json({ error: 'mediaId et mediaType requis' }, { status: 400 });
    }

    // Normalize: use 0 for movies (no season), actual season number for TV
    const normalizedSegment = Number(segment) || 0;
    const normalizedSeason = Number(season) || 0;
    const numericMediaId = Number(mediaId);

    // Check if already liked
    const existing = await prisma.shortLike.findUnique({
      where: {
        userId_mediaId_mediaType_segment_season: {
          userId: user.id,
          mediaId: numericMediaId,
          mediaType,
          segment: normalizedSegment,
          season: normalizedSeason,
        },
      },
    });

    if (existing) {
      // Unlike — delete the like
      await prisma.shortLike.delete({ where: { id: existing.id } });
      const countAfter = await prisma.shortLike.count({
        where: { mediaId: numericMediaId, mediaType, segment: normalizedSegment, season: normalizedSeason },
      });
      console.log(`[like/api] Unliked: mediaId=${numericMediaId}, user=${user.id}, count=${countAfter}`);
      return NextResponse.json({ liked: false, count: countAfter });
    } else {
      // Like — create new entry
      await prisma.shortLike.create({
        data: {
          userId: user.id,
          mediaId: numericMediaId,
          mediaType,
          segment: normalizedSegment,
          season: normalizedSeason,
        },
      });
      const countAfter = await prisma.shortLike.count({
        where: { mediaId: numericMediaId, mediaType, segment: normalizedSegment, season: normalizedSeason },
      });
      console.log(`[like/api] Liked: mediaId=${numericMediaId}, user=${user.id}, count=${countAfter}`);
      return NextResponse.json({ liked: true, count: countAfter });
    }
  } catch (error) {
    console.error('[like/api] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET — Get like count + whether current user liked
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get('mediaId');
    const mediaType = searchParams.get('mediaType');
    const segment = Number(searchParams.get('segment') || 0);
    const season = Number(searchParams.get('season') || 0);

    if (!mediaId || !mediaType) {
      return NextResponse.json({ error: 'mediaId et mediaType requis' }, { status: 400 });
    }

    const numericMediaId = Number(mediaId);

    const where = {
      mediaId: numericMediaId,
      mediaType,
      segment,
      season,
    };

    const count = await prisma.shortLike.count({ where });

    let liked = false;
    const user = await getAuthUser(req);
    if (user) {
      const existing = await prisma.shortLike.findUnique({
        where: {
          userId_mediaId_mediaType_segment_season: {
            userId: user.id,
            mediaId: numericMediaId,
            mediaType,
            segment,
            season,
          },
        },
      });
      liked = !!existing;
    }

    return NextResponse.json({ count, liked });
  } catch (error) {
    console.error('[like/api] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
