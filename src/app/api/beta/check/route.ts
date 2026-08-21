import { NextRequest, NextResponse } from 'next/server';
import { verifyPuterToken } from '@/lib/puter-jwt';
import { db } from '@/lib/db';
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

    // Admin always has access
    if (isAdmin(payload.email)) {
      const { createHash } = await import('crypto');
      const userId = createHash('sha256').update(`puter:${payload.email.toLowerCase()}`).digest('hex').slice(0, 24);

      try {
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
      } catch { /* race condition ok */ }

      return NextResponse.json({ hasAccess: true, isAdmin: true, betaMode: true });
    }

    // Check beta access for regular users
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
  } catch (error) {
    console.error('[beta/check] Error:', error);
    return NextResponse.json({ hasAccess: false, isAdmin: false, betaMode: true, reason: 'error' });
  }
}
