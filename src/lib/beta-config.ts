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