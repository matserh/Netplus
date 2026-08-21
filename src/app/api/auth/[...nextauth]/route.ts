/**
 * NextAuth catch-all route — kept for compatibility but NOT used for Puter auth.
 * Puter auth uses /api/auth/session, /api/auth/signout, and /api/auth/puter-session
 * which are all Workers-compatible (no Prisma).
 *
 * This route is only reached if someone hits an auth path we don't handle.
 * We return empty responses to avoid Prisma crashes in Workers.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({});
}

export async function POST() {
  return NextResponse.json({});
}