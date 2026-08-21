import { NextRequest, NextResponse } from 'next/server';
import { verifyPuterToken } from '@/lib/puter-jwt';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { code, password } = await req.json();
    if (!code || !password) {
      return NextResponse.json({ error: 'Code et mot de passe requis' }, { status: 400 });
    }

    const token = req.cookies.get('next-auth.session-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Vous devez être connecté' }, { status: 401 });
    }

    const payload = await verifyPuterToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    const userId = createHash('sha256').update(`puter:${payload.email.toLowerCase()}`).digest('hex').slice(0, 24);

    // Find invitation
    const invitation = await db.betaInvitation.findUnique({ where: { code: code.toUpperCase() } });
    if (!invitation) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 404 });
    }
    if (invitation.status !== 'active') {
      return NextResponse.json({ error: 'Ce code a été utilisé ou révoqué' }, { status: 410 });
    }
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Ce code a expiré' }, { status: 410 });
    }
    if (invitation.email && invitation.email.toLowerCase() !== payload.email.toLowerCase()) {
      return NextResponse.json({ error: "Ce code n'est pas pour votre adresse email" }, { status: 403 });
    }

    // Verify password
    const hashedInput = createHash('sha256').update(`netplus-beta:${password}`).digest('hex');
    if (hashedInput !== invitation.password) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 403 });
    }

    // Create user + beta access
    await db.user.upsert({
      where: { id: userId },
      create: { id: userId, email: payload.email, name: payload.name },
      update: { name: payload.name, status: 'active' },
    });

    await db.betaAccess.upsert({
      where: { userId },
      create: { userId, status: 'active' },
      update: { status: 'active' },
    });

    // Mark invitation as used
    await db.betaInvitation.update({
      where: { id: invitation.id },
      data: {
        useCount: { increment: 1 },
        status: invitation.useCount + 1 >= invitation.maxUses ? 'used' : 'active',
        usedBy: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[beta/redeem] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
