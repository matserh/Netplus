/**
 * Magic Link Authentication API
 *
 * Flow:
 * 1. User enters email → POST { email } → sends 6-digit code
 * 2. User enters code → POST { email, code, action: 'verify' } → verifies & creates/finds user
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory code store: email → { code, expires, attempts }
const codeStore = new Map<string, { code: string; expires: number; attempts: number }>();

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of codeStore.entries()) {
    if (entry.expires < now) codeStore.delete(email);
  }
}, 5 * 60 * 1000);

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, action } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ACTION: Send verification code
    if (!action || action === 'send') {
      const verificationCode = generateCode();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      codeStore.set(normalizedEmail, { code: verificationCode, expires, attempts: 0 });

      console.log(`[magic-link] Code for ${normalizedEmail}: ${verificationCode}`);

      // Try to send via Resend email service
      const resendKey = process.env.RESEND_API_KEY;
      let emailSent = false;

      if (resendKey) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'NetPlus <noreply@netplus.app>',
              to: normalizedEmail,
              subject: 'Votre code de vérification NetPlus',
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px; text-align: center;">
                  <div style="font-size: 32px; font-weight: 900; margin-bottom: 8px; background: linear-gradient(135deg, #f59e0b, #d97706); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">NETPLUS</div>
                  <p style="color: #666; font-size: 14px; margin-bottom: 30px;">Votre destination premium pour le streaming</p>
                  <div style="background: #f8f9fa; border-radius: 16px; padding: 30px; margin-bottom: 20px;">
                    <p style="color: #333; font-size: 14px; margin: 0 0 12px 0;">Votre code de vérification est :</p>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #d97706; font-family: monospace;">${verificationCode}</div>
                  </div>
                  <p style="color: #999; font-size: 12px;">Ce code expire dans 10 minutes.</p>
                  <p style="color: #ccc; font-size: 11px; margin-top: 20px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
                </div>
              `,
            }),
          });
          emailSent = emailResponse.ok;
        } catch (err) {
          console.error('[magic-link] Failed to send email:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Code de vérification envoyé',
        ...(process.env.NODE_ENV === 'development' && { devCode: verificationCode }),
        emailSent,
      });
    }

    // ACTION: Verify code
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ error: 'Code de vérification requis' }, { status: 400 });
      }

      const stored = codeStore.get(normalizedEmail);

      if (!stored) {
        return NextResponse.json({ error: 'Aucun code trouvé pour cet email. Demandez un nouveau code.' }, { status: 400 });
      }

      if (stored.expires < Date.now()) {
        codeStore.delete(normalizedEmail);
        return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 });
      }

      if (stored.attempts >= 5) {
        codeStore.delete(normalizedEmail);
        return NextResponse.json({ error: 'Trop de tentatives. Demandez un nouveau code.' }, { status: 429 });
      }

      stored.attempts++;

      if (stored.code !== code.toString()) {
        return NextResponse.json({ error: 'Code incorrect', attemptsLeft: 5 - stored.attempts }, { status: 400 });
      }

      codeStore.delete(normalizedEmail);

      try {
        const prisma = (await import('@/lib/prisma')).default;
        const bcrypt = await import('bcryptjs');

        let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
          const randomPassword = await bcrypt.default.hash(
            Math.random().toString(36).slice(2) + Date.now().toString(), 10
          );
          user = await prisma.user.create({
            data: { email: normalizedEmail, name: normalizedEmail.split('@')[0], password: randomPassword },
          });
          await prisma.profile.createMany({
            data: [
              { name: 'Jeunesse', type: 'JEUNESSE', avatar: 'kids', isDefault: true, userId: user.id },
              { name: 'Frénésie', type: 'FRENESIE', avatar: 'flame', isDefault: false, userId: user.id },
              { name: 'Nocturne', type: 'NOCTURNE', avatar: 'moon', isDefault: false, userId: user.id },
            ],
          });
        }

        return NextResponse.json({
          success: true,
          user: { id: user.id, email: user.email, name: user.name },
        });
      } catch (dbError) {
        console.error('[magic-link] Database error:', dbError);
        return NextResponse.json({ error: 'Erreur de base de données. Veuillez réessayer.' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('[magic-link] Error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
