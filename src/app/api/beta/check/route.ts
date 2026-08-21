import { NextRequest, NextResponse } from 'next/server';
import { verifyPuterToken } from '@/lib/puter-jwt';
import { isAdmin, BETA_MODE } from '@/lib/beta-config';

export async function GET(req: NextRequest) {
  try {
    // If beta mode is off, everyone has access
    if (!BETA_MODE) {
      return NextResponse.json({ hasAccess: true, isAdmin: false, betaMode: false });
    }

    const token = req.cookies.get('next-auth.session-token')?.value;
    if (!token) {
      return NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'not_authenticated' });
    }

    const payload = await verifyPuterToken(token);
    if (!payload) {
      return NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'invalid_session' });
    }

    // Admin always has access — NO database needed, pure email check
    if (isAdmin(payload.email)) {
      // Try to persist in DB (best effort, don't fail if DB unavailable)
      try {
        const { db } = await import('@/lib/db');
        const { createHash } = await import('crypto');
        const userId = createHash('sha256').update(`puter:${payload.email.toLowerCase()}`).digest('hex').slice(0, 24);
        await db.user.upsert({
          where: { id: userId },
          create: { id: userId, email: payload.email, name: payload.name, role: 'admin' },
          update: { role: 'admin', status: 'active', name: payload.name },
        });
        await db.betaAccess.upsert({
          where: { userId },
          create: { userId, status: 'active', grantedBy: 'system' },
          update: { status: 'active' },
        });
      } catch {
        /* DB not available (e.g. Vercel staging without persistent SQLite) — that's fine */
      }

      return NextResponse.json({ hasAccess: true, isAdmin: true, betaMode: true });
    }

    // Regular users — check DB for beta access
    try {
      const { db } = await import('@/lib/db');
      const { createHash } = await import('crypto');
      const userId = createHash('sha256').update(`puter:${payload.email.toLowerCase()}`).digest('hex').slice(0, 24);

      const betaAccess = await db.betaAccess.findUnique({ where: { userId } });

      if (!betaAccess || betaAccess.status !== 'active') {
        const status = betaAccess?.status || 'none';
        return NextResponse.json({
          hasAccess: false,
          isAdmin: false,
          betaMode: true,
          reason: status === 'banned' ? 'banned' : status === 'paused' ? 'paused' : 'no_access',
        });
      }

      return NextResponse.json({ hasAccess: true, isAdmin: false, betaMode: true });
    } catch {
      // DB not available for regular user check — deny access
      return NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'error' });
    }
  } catch (error) {
    console.error('[beta/check] Error:', error);
    return NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'error' });
  }
}
