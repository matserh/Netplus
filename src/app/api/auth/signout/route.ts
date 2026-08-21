/**
 * Custom sign-out endpoint — Workers-compatible, NO Prisma.
 * Clears the session cookie when user logs out.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Get the callback URL from the request body or default to /login
    let callbackUrl = '/login';
    try {
      const body = await req.json();
      if (body?.callbackUrl) callbackUrl = body.callbackUrl;
    } catch {
      // no body
    }

    const response = NextResponse.json({ url: callbackUrl });

    // Clear the session cookie
    response.cookies.set('next-auth.session-token', '', {
      expires: new Date(0),
      path: '/',
    });
    response.cookies.set('next-auth.callback-url', '', {
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[signout] Error:', error);
    return NextResponse.json({ url: '/login' });
  }
}
