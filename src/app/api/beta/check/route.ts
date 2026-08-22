import { NextRequest, NextResponse } from 'next/server';
import { verifyPuterToken } from '@/lib/puter-jwt';
import { isAdmin, BETA_MODE } from '@/lib/beta-config';
import { verifyAccessJWT, ACCESS_COOKIE_NAME } from '@/lib/invitation';

export async function GET(req: NextRequest) {
  try {
    // If beta mode is off, everyone has access
    if (!BETA_MODE) {
      return NextResponse.json({ hasAccess: true, isAdmin: false, betaMode: false });
    }

    // 1. Check access cookie (JWT-based, works without DB)
    const accessCookie = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
    if (accessCookie) {
      const access = await verifyAccessJWT(accessCookie);
      if (access) {
        return NextResponse.json({ hasAccess: true, isAdmin: false, betaMode: true });
      }
      // Invalid/expired access cookie — clear it
      const res = NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'no_access' });
      res.cookies.set(ACCESS_COOKIE_NAME, '', { maxAge: 0, path: '/' });
      return res;
    }

    // 2. Check session for admin
    const token = req.cookies.get('next-auth.session-token')?.value;
    if (!token) {
      return NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'not_authenticated' });
    }

    const payload = await verifyPuterToken(token);
    if (!payload) {
      return NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'invalid_session' });
    }

    // Admin always has access — pure email check, no database
    if (isAdmin(payload.email)) {
      return NextResponse.json({ hasAccess: true, isAdmin: true, betaMode: true });
    }

    // Regular user without access cookie
    return NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'no_access' });
  } catch (error) {
    console.error('[beta/check] Error:', error);
    return NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'error' });
  }
}