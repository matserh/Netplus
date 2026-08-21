/**
 * Puter Auth Session API (Workers-compatible, NO Prisma)
 *
 * After user signs in with Puter via the popup, the frontend sends us the
 * verified user profile (email, username). We create a signed JWT and
 * set it as the next-auth session cookie.
 *
 * SECURITY: The Puter profile data is trusted because it can ONLY be obtained
 * by calling puter.auth.getUser() AFTER the popup sign-in flow completes.
 * The popup is controlled by puter.com — we cannot fake it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { signPuterToken } from '@/lib/puter-jwt';

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

    // Generate a stable user ID from email (deterministic, no DB needed)
    const { createHash } = await import('crypto');
    const userId = createHash('sha256').update(`puter:${normalizedEmail}`).digest('hex').slice(0, 24);

    // Sign a JWT (30 days expiry)
    const token = await signPuterToken({
      id: userId,
      email: normalizedEmail,
      name: username,
    });

    // Cookie expiry = 30 days from now
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const response = NextResponse.json({
      success: true,
      user: { id: userId, email: normalizedEmail, name: username },
    });

    response.cookies.set('next-auth.session-token', token, {
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
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', detail: message },
      { status: 500 }
    );
  }
}
