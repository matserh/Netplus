/**
 * Magic Link Authentication API
 *
 * Flow:
 * 1. User enters email → POST { email, action: 'send' } → sends 6-digit code via email
 * 2. User enters code → POST { email, code, action: 'verify' } → verifies & creates/finds user
 *
 * SECURITY: The verification code is NEVER returned to the client.
 * It is stored in the VerificationToken DB table (survives cold starts).
 * Email delivery is MANDATORY — if Resend is not configured or fails, the request fails.
 */

import { NextRequest, NextResponse } from 'next/server';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Block disposable email domains — common fake email providers
const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'throwaway.email', 'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'pokemail.net', 'spam4.me', 'yopmail.com',
  'getnada.com', 'mohmal.com', 'emailondeck.com', 'tempmailo.com',
  'trashmail.com', 'maildrop.cc', 'dispostable.com', 'mailcatch.com',
];

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, action } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Les adresses email temporaires ne sont pas autorisées. Utilisez une adresse email réelle.' },
        { status: 400 }
      );
    }

    const prisma = (await import('@/lib/prisma')).default;

    // ACTION: Send verification code
    if (!action || action === 'send') {
      const verificationCode = generateCode();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Persist the code in DB — survives cold starts (unlike in-memory Map)
      // Delete any previous code for this email first
      await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
      await prisma.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token: verificationCode,
          expires,
        },
      });

      // Email delivery is MANDATORY
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        console.error('[magic-link] RESEND_API_KEY is not configured');
        return NextResponse.json(
          { error: 'Service email non configuré. Contactez le support.' },
          { status: 503 }
        );
      }

      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'NetPlus <on@resend.dev>',
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

        if (!emailResponse.ok) {
          console.error('[magic-link] Resend API error:', await emailResponse.text());
          return NextResponse.json(
            { error: "Impossible d'envoyer l'email. Vérifiez votre adresse ou réessayez." },
            { status: 502 }
          );
        }
      } catch (err) {
        console.error('[magic-link] Failed to send email:', err);
        return NextResponse.json(
          { error: "Erreur d'envoi de l'email. Réessayez." },
          { status: 502 }
        );
      }

      // NEVER return the code to the client
      return NextResponse.json({
        success: true,
        message: 'Code de vérification envoyé à votre email',
        emailSent: true,
      });
    }

    // ACTION: Verify code
    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ error: 'Code de vérification requis' }, { status: 400 });
      }

      const stored = await prisma.verificationToken.findFirst({
        where: { identifier: normalizedEmail },
        orderBy: { expires: 'desc' },
      });

      if (!stored) {
        return NextResponse.json(
          { error: 'Aucun code trouvé pour cet email. Demandez un nouveau code.' },
          { status: 400 }
        );
      }

      if (stored.expires < new Date()) {
        await prisma.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
        return NextResponse.json(
          { error: 'Code expiré. Demandez un nouveau code.' },
          { status: 400 }
        );
      }

      if (stored.token !== code.toString()) {
        return NextResponse.json(
          { error: 'Code incorrect' },
          { status: 400 }
        );
      }

      // Code is valid — delete it so it can't be reused
      await prisma.verificationToken.deleteMany({
        where: { identifier: normalizedEmail, token: code.toString() },
      });

      try {
        let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: normalizedEmail.split('@')[0],
              // No random password — magic-link users cannot use credentials login
            },
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
        return NextResponse.json(
          { error: 'Erreur de base de données. Veuillez réessayer.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('[magic-link] Error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
