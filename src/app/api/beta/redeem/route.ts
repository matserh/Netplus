import { NextRequest, NextResponse } from 'next/server';
import { verifyPuterToken } from '@/lib/puter-jwt';
import { verifyInvitationJWT, createAccessJWT, ACCESS_COOKIE_NAME } from '@/lib/invitation';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Token d\'invitation requis' }, { status: 400 });
    }

    // 1. Verify the invitation JWT
    const invitation = await verifyInvitationJWT(token);
    if (!invitation) {
      return NextResponse.json({ error: 'Lien d\'invitation invalide ou expiré' }, { status: 400 });
    }

    // 2. Verify user session
    const sessionToken = req.cookies.get('next-auth.session-token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Vous devez être connecté pour utiliser cette invitation' }, { status: 401 });
    }

    const payload = await verifyPuterToken(sessionToken);
    if (!payload) {
      return NextResponse.json({ error: 'Session invalide. Déconnectez-vous et reconnectez-vous.' }, { status: 401 });
    }

    // 3. Check email restriction
    if (invitation.forEmail && invitation.forEmail !== payload.email.toLowerCase()) {
      return NextResponse.json({ error: 'Cette invitation n\'est pas destinée à votre adresse email' }, { status: 403 });
    }

    // 4. Check if user already has access (cookie already set)
    const existingAccess = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
    if (existingAccess) {
      const { verifyAccessJWT } = await import('@/lib/invitation');
      const access = await verifyAccessJWT(existingAccess);
      if (access) {
        return NextResponse.json({ success: true, alreadyHadAccess: true });
      }
    }

    // 5. Create access JWT and set as httpOnly cookie (1 year)
    const accessJWT = await createAccessJWT(payload.email, invitation.jti);
    const response = NextResponse.json({ success: true });
    response.cookies.set(ACCESS_COOKIE_NAME, accessJWT, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[beta/redeem] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}