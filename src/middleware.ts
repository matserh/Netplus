// Middleware is disabled for static export (output: 'export')
// Auth protection is handled client-side in ClientProviders.tsx
// via the AuthGuard component which checks useSession() status
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
