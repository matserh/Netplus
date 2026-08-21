/**
 * Custom session endpoint — Workers-compatible, NO Prisma.
 * Overrides the default next-auth /api/auth/session for Puter JWT sessions.
 *
 * When the client calls useSession(), next-auth fetches GET /api/auth/session.
 * This route reads our Puter JWT from the cookie and returns it in the
 * format next-auth expects.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPuterToken } from '@/lib/puter-jwt';

export async function GET(req: NextRequest) {
  try {
    // Read the session token from cookie
    const token = req.cookies.get('next-auth.session-token')?.value;

    if (!token) {
      // No session cookie — return empty session (next-auth format)
      return NextResponse.json({});
    }

    // Try to verify as Puter JWT
    const payload = await verifyPuterToken(token);

    if (payload) {
      // Return in next-auth session format
      return NextResponse.json({
        user: {
          id: payload.id,
          email: payload.email,
          name: payload.name,
          image: null,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Token not recognized — return empty session
    return NextResponse.json({});
  } catch (error) {
    console.error('[session] Error:', error);
    return NextResponse.json({});
  }
}
