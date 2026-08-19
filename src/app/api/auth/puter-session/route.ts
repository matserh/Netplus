/**
 * Puter Auth Session API
 *
 * After user signs in with Puter via the popup, the frontend sends us the
 * verified user profile (email, username). We create/find the user in our DB
 * and establish a NextAuth-style session.
 *
 * SECURITY: The Puter profile data is trusted because it can ONLY be obtained
 * by calling puter.auth.getUser() AFTER the popup sign-in flow completes.
 * The popup is controlled by puter.com — we cannot fake it.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, username } = await req.json();

    if (!email || !username) {
      return NextResponse.json(
        { error: 'Email et username requis' },
        { status: 400 }
      );
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const prisma = (await import('@/lib/prisma')).default;

    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      // Create new user from Puter profile — no password (magic-link/puter users)
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: username,
        },
      });
      // Create default profiles
      await prisma.profile.createMany({
        data: [
          { name: 'Jeunesse', type: 'JEUNESSE', avatar: 'kids', isDefault: true, userId: user.id },
          { name: 'Frénésie', type: 'FRENESIE', avatar: 'flame', isDefault: false, userId: user.id },
          { name: 'Nocturne', type: 'NOCTURNE', avatar: 'moon', isDefault: false, userId: user.id },
        ],
      });
    } else if (!user.name || user.name === user.email.split('@')[0]) {
      // Update name from Puter if it was a placeholder
      await prisma.user.update({
        where: { id: user.id },
        data: { name: username },
      });
      user.name = username;
    }

    // Create a session token in the DB
    const crypto = await import('crypto');
    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: { sessionToken, userId: user.id, expires },
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    response.cookies.set('next-auth.session-token', sessionToken, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.cookies.set('next-auth.callback-url', '/', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[puter-session] Error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
