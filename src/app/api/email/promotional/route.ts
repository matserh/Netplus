/**
 * Promotional Email API
 *
 * Sends promotional/marketing emails using Resend.
 * Supports different email templates: welcome, promotion, newsletter, etc.
 *
 * POST { to, type, subject?, customHtml? }
 * - type: 'welcome' | 'promotion' | 'newsletter' | 'custom'
 */

import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

interface EmailTemplate {
  subject: string;
  html: string;
}

function getWelcomeTemplate(): EmailTemplate {
  return {
    subject: 'Bienvenue sur NetPlus !',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="font-size: 42px; font-weight: 900; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">NETPLUS</div>
          <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 8px 0 0 0;">Votre destination premium pour le streaming</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px 30px; background: #111111;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0 0 20px 0;">Bienvenue !</h1>
          <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Merci de rejoindre la communaute NetPlus ! Vous venez d'acceder a une experience de streaming revolutionnaire avec des milliers de films et series.
          </p>

          <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #2a2a2a;">
            <h3 style="color: #f59e0b; font-size: 18px; margin: 0 0 16px 0;">Ce qui vous attend :</h3>
            <ul style="color: #cccccc; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
              <li>Catalogue illimite de films et series HD</li>
              <li>Maitre Netplus, votre assistant IA cinematographique</li>
              <li>Streaming multi-appareils</li>
              <li>Recommandations personnalisees</li>
              <li>Lecteur video intelligent avec 6 serveurs de fallback</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ntplus.pages.dev" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; display: inline-block;">
              Commencer a regarder
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 30px; text-align: center; background: #0a0a0a; border-radius: 0 0 16px 16px;">
          <p style="color: #666; font-size: 12px; margin: 0;">&copy; 2026 NetPlus. Tous droits reserves.</p>
          <p style="color: #555; font-size: 11px; margin: 8px 0 0 0;">Vous recevez cet email car vous vous etes inscrit sur NetPlus.</p>
        </div>
      </div>
    `,
  };
}

function getPromotionTemplate(): EmailTemplate {
  return {
    subject: 'Offre exclusive NetPlus - Streaming illimite !',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff;">
        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #f59e0b 50%, #dc2626 100%); padding: 50px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="font-size: 42px; font-weight: 900; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 20px rgba(0,0,0,0.4);">NETPLUS</div>
          <p style="color: rgba(255,255,255,0.95); font-size: 20px; margin: 12px 0 0 0; font-weight: 600;">OFFRE EXCLUSIVE</p>
        </div>

        <!-- Promo Body -->
        <div style="padding: 40px 30px; background: #111111;">
          <h1 style="color: #f59e0b; font-size: 26px; margin: 0 0 16px 0; text-align: center;">Streaming illimite vous attend !</h1>
          <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
            Decouvrez des milliers de films et series en qualite HD avec notre plateforme de streaming nouvelle generation.
          </p>

          <!-- Feature cards -->
          <div style="margin: 24px 0;">
            <div style="background: #1a1a1a; border-radius: 12px; padding: 20px; margin-bottom: 12px; border: 1px solid #2a2a2a; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 4px;">&#127909;</div>
              <h4 style="color: #f59e0b; margin: 0 0 4px 0; font-size: 14px;">Catalogue Premium</h4>
              <p style="color: #999; font-size: 12px; margin: 0;">Films &amp; series illimites</p>
            </div>
            <div style="background: #1a1a1a; border-radius: 12px; padding: 20px; margin-bottom: 12px; border: 1px solid #2a2a2a; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 4px;">&#129302;</div>
              <h4 style="color: #f59e0b; margin: 0 0 4px 0; font-size: 14px;">Maitre Netplus</h4>
              <p style="color: #999; font-size: 12px; margin: 0;">Assistant IA cinematographique</p>
            </div>
            <div style="background: #1a1a1a; border-radius: 12px; padding: 20px; border: 1px solid #2a2a2a; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 4px;">&#9889;</div>
              <h4 style="color: #f59e0b; margin: 0 0 4px 0; font-size: 14px;">6 Serveurs</h4>
              <p style="color: #999; font-size: 12px; margin: 0;">Fallback automatique</p>
            </div>
          </div>

          <!-- CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ntplus.pages.dev" style="background: linear-gradient(135deg, #dc2626, #f59e0b); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 8px; font-size: 18px; font-weight: 800; display: inline-block;">
              Profiter de l'offre
            </a>
          </div>

          <p style="color: #888; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
            Rejoignez des milliers d'utilisateurs qui profitent deja de NetPlus.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 30px; text-align: center; background: #0a0a0a; border-radius: 0 0 16px 16px;">
          <p style="color: #666; font-size: 12px; margin: 0;">&copy; 2026 NetPlus. Tous droits reserves.</p>
          <p style="color: #555; font-size: 11px; margin: 8px 0 0 0;">Vous recevez cet email car vous etes inscrit sur NetPlus.</p>
        </div>
      </div>
    `,
  };
}

function getNewsletterTemplate(): EmailTemplate {
  return {
    subject: 'Newsletter NetPlus - Les nouveautes de la semaine',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="font-size: 32px; font-weight: 900; letter-spacing: 3px; color: #ffffff;">NETPLUS</div>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 4px 0 0 0;">Newsletter hebdomadaire</p>
        </div>

        <div style="padding: 40px 30px; background: #111111;">
          <h1 style="color: #f59e0b; font-size: 24px; margin: 0 0 20px 0;">Les nouveautes de la semaine</h1>
          <p style="color: #e5e5e5; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            Restez informe des dernieres sorties, des recommandations de Maitre Netplus et des fonctionnalites exclusives de NetPlus.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ntplus.pages.dev" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 700; display: inline-block;">
              Explorer sur NetPlus
            </a>
          </div>
        </div>

        <div style="padding: 20px 30px; text-align: center; background: #0a0a0a; border-radius: 0 0 16px 16px;">
          <p style="color: #666; font-size: 12px; margin: 0;">&copy; 2026 NetPlus. Tous droits reserves.</p>
        </div>
      </div>
    `,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Check API key first
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY non configuree. Ajoutez-la dans les variables d\'environnement Cloudflare.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { to, type = 'promotion', subject: customSubject, customHtml } = body;

    if (!to) {
      return NextResponse.json({ error: 'Adresse email destinataire requise (champ "to")' }, { status: 400 });
    }

    // Validate email
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
    if (!isValidEmail) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 });
    }

    // Get template
    let template: EmailTemplate;

    if (type === 'custom' && customHtml) {
      template = {
        subject: customSubject || 'Message de NetPlus',
        html: customHtml,
      };
    } else {
      switch (type) {
        case 'welcome':
          template = getWelcomeTemplate();
          break;
        case 'promotion':
          template = getPromotionTemplate();
          break;
        case 'newsletter':
          template = getNewsletterTemplate();
          break;
        default:
          template = getPromotionTemplate();
      }
    }

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NetPlus <noreply@netplus.app>',
        to,
        subject: customSubject || template.subject,
        html: template.html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[email/promotional] Resend error:', result);
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email', details: result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email promotionnel (${type}) envoye a ${to}`,
      emailId: result.id,
    });
  } catch (error) {
    console.error('[email/promotional] Error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
