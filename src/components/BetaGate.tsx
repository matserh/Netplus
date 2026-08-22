'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBeta } from '@/contexts/BetaContext';
import { useSession } from '@/contexts/AuthContext';

// Client-side admin emails ( definitive source for client-side checks)
const ADMIN_EMAILS = ['matserhkevin12@gmail.com', 'devmaestro@puter.com'];

function isClientAdmin(email?: string | null): boolean {
  if (!email) return false;
  const n = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(a => a.toLowerCase() === n);
}

/**
 * BetaGate — wraps pages that require beta access.
 * Admin ALWAYS passes — checked directly from session email, no API dependency.
 */
export function BetaGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hasAccess, isAdmin: betaIsAdmin, betaMode, betaLoading } = useBeta();
  const { status, data: session } = useSession();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (status === 'loading') return;

    // If not in beta mode, allow everyone
    if (!betaMode) {
      setChecked(true);
      return;
    }

    // Unauthenticated users are handled by login page (show content)
    if (status === 'unauthenticated') {
      setChecked(true);
      return;
    }

    // Authenticated — determine access
    if (status === 'authenticated') {
      // 1. Direct admin check from session (most reliable, zero API dependency)
      const directAdmin = isClientAdmin(session?.user?.email);

      // 2. API-based checks
      const apiAccess = hasAccess || betaIsAdmin;

      if (directAdmin || apiAccess) {
        setChecked(true);
      } else {
        // No beta access — redirect to beta access page
        router.replace('/beta-access');
      }
    }
  }, [status, hasAccess, betaIsAdmin, betaMode, betaLoading, session?.user?.email, router]);

  // Show loading while checking
  if (!checked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
