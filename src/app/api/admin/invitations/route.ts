import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ADMIN_EMAIL } from '@/lib/beta-config';
import { createHash, randomBytes } from 'crypto';

function generateCode(): string {
  const bytes = randomBytes(4).toString('hex').toUpperCase();
  return `NP-${bytes.slice(0, 4)}-${bytes.slice(4)}`;
}

// GET /api/admin/invitations — List all invitations
export async function GET(req: NextRequest) {
  try {
    const adminEmail = req.headers.get('x-admin-email');
    if (!adminEmail || adminEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const invitations = await db.betaInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { name: true, email: true } },
        userUsed: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('[admin/invitations] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/admin/invitations — Create a new invitation
export async function POST(req: NextRequest) {
  try {
    const adminEmail = req.headers.get('x-admin-email');
    if (!adminEmail || adminEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { email, password, expiresInDays } = await req.json();
    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Mot de passe invalide (min 4 car.)' }, { status: 400 });
    }

    // Generate a unique code
    let code = generateCode();
    let exists = await db.betaInvitation.findUnique({ where: { code } });
    while (exists) {
      code = generateCode();
      exists = await db.betaInvitation.findUnique({ where: { code } });
    }

    // Hash the password for storage
    const hashedPw = createHash('sha256').update(`netplus-beta:${password}`).digest('hex');

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const invitation = await db.betaInvitation.create({
      data: {
        code,
        password: hashedPw,
        email: email || null,
        maxUses: 1,
        status: 'active',
        createdBy: req.headers.get('x-admin-id'),
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      invitation: { ...invitation, password: undefined }, // never send hash back
      plainCode: code,
      plainPassword: password, // return plain password so admin can share it
    });
  } catch (error) {
    console.error('[admin/invitations] POST Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/admin/invitations — Revoke an invitation
export async function PATCH(req: NextRequest) {
  try {
    const adminEmail = req.headers.get('x-admin-email');
    if (!adminEmail || adminEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { invitationId, action } = await req.json();
    if (!invitationId || !action) {
      return NextResponse.json({ error: 'invitationId et action requis' }, { status: 400 });
    }

    if (action === 'revoke') {
      await db.betaInvitation.update({
        where: { id: invitationId },
        data: { status: 'revoked' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/invitations] PATCH Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
