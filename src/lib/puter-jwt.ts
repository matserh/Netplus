/**
 * Puter JWT helpers — pure JS, Cloudflare Workers compatible.
 * Uses jose (no native deps) to sign/verify session tokens.
 */

import { SignJWT, jwtVerify } from 'jose';

// Secret key — uses NEXTAUTH_SECRET if available, otherwise a fallback.
// MUST be set as a Cloudflare Pages secret for production.
function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'netplus-puter-fallback-secret-change-me-2026';
  return new TextEncoder().encode(secret);
}

export interface PuterSessionPayload {
  id: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign a Puter session payload into a JWT string.
 */
export async function signPuterToken(payload: PuterSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

/**
 * Verify and decode a Puter session JWT.
 * Returns null if invalid/expired.
 */
export async function verifyPuterToken(token: string): Promise<PuterSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}
