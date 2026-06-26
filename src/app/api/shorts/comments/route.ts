import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// Helper: get authenticated user from JWT token
// IMPORTANT: Must pass secret explicitly for App Router API routes
async function getAuthUser(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return null;
    const user = await prisma.user.findUnique({ where: { email: token.email as string } });
    return user;
  } catch (error) {
    console.error('[comments/api] getAuthUser error:', error);
    return null;
  }
}

// GET — Get comments for a short
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

    const comments = await prisma.shortComment.findMany({
      where: {
        mediaId: Number(mediaId),
        mediaType,
        segment,
        season,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — Add a comment
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { mediaId, mediaType, segment, season, content } = body;

    if (!mediaId || !mediaType || !content?.trim()) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Commentaire trop long (500 caractères max)' }, { status: 400 });
    }

    const comment = await prisma.shortComment.create({
      data: {
        userId: user.id,
        mediaId: Number(mediaId),
        mediaType,
        segment: Number(segment) || 0,
        season: Number(season) || 0,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Comment POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
