/**
 * Beta & Admin configuration for NetPlus.
 * 
 * ADMIN_EMAIL: The email that gets admin privileges.
 * STAGING_PASSWORD: Password required to access the Vercel staging site.
 * BETA_MODE: When true, non-admin users need beta access to use the app.
 */

// Admin identification
export const ADMIN_EMAILS = ['matserhkevin12@gmail.com', 'devmaestro@puter.com'];

// Staging password protection (only used on Vercel staging)
export const STAGING_PASSWORD = process.env.STAGING_PASSWORD || 'NetPlus2026Staging';

// Beta mode toggle
export const BETA_MODE = process.env.BETA_MODE !== 'false'; // default: true

// Check if an email is the admin
export function isAdmin(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(a => a.toLowerCase() === normalized);
}

/**
 * Verify admin access from a request directly (no middleware dependency).
 * Used by admin API routes when proxy/middleware is not available.
 * Returns { authorized: true, email } or { authorized: false, response }.
 */
export async function verifyAdminRequest(req: Request): Promise<
  { authorized: true; email: string } |
  { authorized: false; response: Response }
> {
  try {
    const { verifyPuterToken } = await import('@/lib/puter-jwt');
    const token = req.headers.get('cookie')
      ? new URLSearchParams(req.headers.get('cookie')!.split('; ').join('&')).get('next-auth.session-token')
      : null;

    // Also check Authorization header as fallback
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const tokenValue = token || bearerToken;

    if (!tokenValue) {
      return { authorized: false, response: new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
    }

    const payload = await verifyPuterToken(tokenValue);
    if (!payload) {
      return { authorized: false, response: new Response(JSON.stringify({ error: 'Session invalide' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
    }

    if (!isAdmin(payload.email)) {
      return { authorized: false, response: new Response(JSON.stringify({ error: 'Accès refusé' }), { status: 403, headers: { 'Content-Type': 'application/json' } }) };
    }

    return { authorized: true, email: payload.email };
  } catch {
    return { authorized: false, response: new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500, headers: { 'Content-Type': 'application/json' } }) };
  }
}