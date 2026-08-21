import { NextRequest, NextResponse } from 'next/server';
import { verifyPuterToken } from '@/lib/puter-jwt';
import { isAdmin } from '@/lib/beta-config';

// Routes that are always accessible (no auth, no beta check)
const PUBLIC_PATHS = [
  '/api/auth',
  '/api/beta',
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

  // ---- 1. Vercel Staging Password Protection ----
  if (isVercel) {
    const stagingPw = request.cookies.get('np-staging-auth')?.value;
    const expectedPw = process.env.STAGING_PASSWORD || 'NetPlus2026Staging';

    if (!stagingPw && pathname !== '/staging-login') {
      const loginUrl = new URL('/staging-login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    if (stagingPw && stagingPw !== expectedPw && pathname !== '/staging-login') {
      const loginUrl = new URL('/staging-login', request.url);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.set('np-staging-auth', '', { maxAge: 0, path: '/' });
      return res;
    }
    if (pathname === '/staging-login' && stagingPw === expectedPw) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ---- 2. Skip auth for public paths ----
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ---- 3. Admin API protection ----
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
      // Inject admin info in headers for downstream API routes
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('x-admin-email', payload.email);
      reqHeaders.set('x-admin-id', payload.id);
      return NextResponse.next({
        request: { headers: reqHeaders },
      });
    });
  }

  // ---- 4. Beta mode: check access for authenticated users ----
  // (Beta enforcement happens client-side via BetaContext + API check)
  // Here we just let the request through — the page will check beta access.

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and _next internals
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
