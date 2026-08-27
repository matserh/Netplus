import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// The staging password is hashed with SHA-256.
// To generate a new hash: node -e "console.log(require('crypto').createHash('sha256').update('np-staging:' + 'YOUR_PASSWORD').digest('hex'))"
// Default: "Np$4g!7kQz#9mX"  →  hash stored below
const STAGING_PW_HASH = process.env.STAGING_PASSWORD_HASH ||
  'f8316ec907e8315a38904e124c3b115d4bf48139706fbe23d04caafd54816528';

function hashPassword(pw: string): string {
  return createHash('sha256').update(`np-staging:${pw}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Mot de passe requis' }, { status: 400 });
    }

    const hashed = hashPassword(password);
    if (hashed === STAGING_PW_HASH) {
      const response = NextResponse.json({ success: true });
      // Store the hash as the cookie value (never store plaintext)
      response.cookies.set('np-staging-auth', hashed, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      return response;
    }
    return NextResponse.json({ success: false, error: 'Mot de passe incorrect' }, { status: 403 });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur' }, { status: 500 });
  }
}
