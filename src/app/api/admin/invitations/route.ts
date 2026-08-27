import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/beta-config';
import { createInvitationJWT, buildInvitationURL } from '@/lib/invitation';

async function requireAdmin(req: NextRequest): Promise<string | NextResponse> {
  const result = await verifyAdminRequest(req);
  if (!result.authorized) {
    const data = await result.response.json();
    return NextResponse.json(data, { status: result.response.status });
  }
  return result.email;
}

// POST /api/admin/invitations — Auto-generate an invitation link
export async function POST(req: NextRequest) {
  try {
    const adminEmail = await requireAdmin(req);
    if (typeof adminEmail !== 'string') return adminEmail;

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