/**
 * CSRF token endpoint — returns a dummy token for next-auth client compatibility.
 * In our Puter-only auth flow, CSRF is not critical since we don't have cookie-based
 * form submissions (Puter popup handles the actual auth).
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Return a simple csrfToken — next-auth client expects this format
  return NextResponse.json({ csrfToken: 'puter-auth-no-csrf-needed' });
}
