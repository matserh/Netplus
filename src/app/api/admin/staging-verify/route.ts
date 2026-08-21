import { NextRequest, NextResponse } from 'next/server';

const STAGING_PASSWORD = process.env.STAGING_PASSWORD || 'NetPlus2026Staging';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password === STAGING_PASSWORD) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('np-staging-auth', password, {
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
