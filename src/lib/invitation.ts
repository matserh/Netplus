/**
 * JWT-based invitation system for NetPlus.
 * 
 * No database needed — works on Vercel serverless.
 * - Invitations are signed JWTs (self-contained, verifiable)
 * - User access is stored in a long-lived httpOnly cookie (another JWT)
 * - Admin generates links with one click
 * - Access persists per user (1 year cookie), even after disconnect
 */

import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'crypto';

// ---- Secret ----
function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'netplus-puter-fallback-secret-change-me-2026';
  return new TextEncoder().encode(secret);
}

// ---- Types ----
export interface InvitationPayload {
  type: 'np-invitation';
  jti: string;          // unique invitation ID
  forEmail?: string;    // optional: restrict to this email
  exp: number;
  iat: number;
}

export interface AccessPayload {
  type: 'np-beta-access';
  email: string;
  invJti: string;       // which invitation was used
  iat: number;
  exp: number;
}

// ---- Cookie name ----
export const ACCESS_COOKIE_NAME = 'np-beta-access';

// ---- Invitation creation ----
export async function createInvitationJWT(options?: {
  forEmail?: string;
  expiresInDays?: number;
}): Promise<{ token: string; jti: string }> {
  const jti = randomUUID();
  const expiresInDays = options?.expiresInDays || 7;
  
  const token = await new SignJWT({
    type: 'np-invitation',
    jti,
    ...(options?.forEmail ? { forEmail: options.forEmail.toLowerCase() } : {}),
  } as Omit<InvitationPayload, 'exp' | 'iat'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInDays}d`)
    .sign(getSecret());

  return { token, jti };
}

// ---- Invitation verification ----
export async function verifyInvitationJWT(token: string): Promise<InvitationPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.type !== 'np-invitation') return null;
    return {
      type: payload.type as 'np-invitation',
      jti: payload.jti as string,
      forEmail: payload.forEmail as string | undefined,
      exp: payload.exp as number,
      iat: payload.iat as number,
    };
  } catch {
    return null;
  }
}

// ---- Access token creation ----
export async function createAccessJWT(email: string, invJti: string): Promise<string> {
  return new SignJWT({
    type: 'np-beta-access',
    email: email.toLowerCase(),
    invJti,
  } as Omit<AccessPayload, 'exp' | 'iat'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(getSecret());
}

// ---- Access token verification ----
export async function verifyAccessJWT(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.type !== 'np-beta-access') return null;
    return {
      type: payload.type as 'np-beta-access',
      email: payload.email as string,
      invJti: payload.invJti as string,
      exp: payload.exp as number,
      iat: payload.iat as number,
    };
  } catch {
    return null;
  }
}

// ---- Build invitation URL ----
export function buildInvitationURL(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || '';
  return `${base}/beta-access?t=${encodeURIComponent(token)}`;
}