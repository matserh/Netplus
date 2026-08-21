import { NextRequest, NextResponse } from 'next/server';
import { verifyPuterToken } from '@/lib/puter-jwt';
import { isAdmin } from '@/lib/beta-config';

// Staging verify endpoint — must be reachable without any cookie
const STAGING_VERIFY = '/api/staging-verify';

// Routes that are always accessible (no auth, no beta check)
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/beta',
  STAGING_VERIFY,
  '/login',
  '/_next',
  '/favicon',
  '/logo.svg',
  '/BUILD_ID',
  '/beta-access',
  '/staging-login',
];

// API routes that need admin auth
const ADMIN_API_PATHS = ['/api/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isVercel = !!process.env.VERCEL;

  // ---- 1. Let staging verify endpoint through WITHOUT any redirect ----
  // This MUST come before the staging password check to avoid a redirect loop.
  if (pathname === STAGING_VERIFY || pathname.startsWith(STAGING_VERIFY + '/')) {
    return NextResponse.next();
  }

  // ---- 2. Vercel Staging Password Protection ----
  if (isVercel) {
    const stagingCookie = request.cookies.get('np-staging-auth')?.value;
    const expectedHash = process.env.STAGING_PASSWORD_HASH ||
      'f8316ec907e8315a38904e124c3b115d4bf48139706fbe23d04caafd54816528';

    if (!stagingCookie && pathname !== '/staging-login') {
      return NextResponse.redirect(new URL('/staging-login', request.url));
    }
    if (stagingCookie && stagingCookie !== expectedHash && pathname !== '/staging-login') {
      const res = NextResponse.redirect(new URL('/staging-login', request.url));
      res.cookies.set('np-staging-auth', '', { maxAge: 0, path: '/' });
      return res;
    }
    if (pathname === '/staging-login' && stagingCookie === expectedHash) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ---- 3. Skip auth for public paths ----
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ---- 4. Admin API protection ----
  if (ADMIN_API_PATHS.some(p => pathname.startsWith(p))) {
    const token = request.cookies.get('next-auth.session-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return verifyPuterToken(token).then(payload => {
      if (!payload) {
        return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
      }
      if (!isAdmin(payload.email)) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('x-admin-email', payload.email);
      reqHeaders.set('x-admin-id', payload.id);
      return NextResponse.next({
        request: { headers: reqHeaders },
      });
    });
  }

  // ---- 5. Let all other requests through ----
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};