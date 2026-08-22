import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/beta-config';
import { createInvitationJWT, buildInvitationURL } from '@/lib/invitation';

// POST /api/admin/invitations — Auto-generate an invitation link
export async function POST(req: NextRequest) {
  try {
    const adminEmail = req.headers.get('x-admin-email');
    if (!adminEmail || !isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { forEmail, expiresInDays } = await req.json();

    const { token, jti } = await createInvitationJWT({
      forEmail: forEmail || undefined,
      expiresInDays: expiresInDays || 7,
    });

    const url = buildInvitationURL(token);

    return NextResponse.json({
      success: true,
      invitation: {
        jti,
        url,
        forEmail: forEmail || null,
        expiresInDays: expiresInDays || 7,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[admin/invitations] POST Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET /api/admin/invitations — Returns empty (no DB, invitations are stateless JWTs)
export async function GET() {
  return NextResponse.json({
    invitations: [],
    note: 'Les invitations sont des liens JWT autonomes. L\'historique est stocké localement dans votre navigateur.',
  });
}