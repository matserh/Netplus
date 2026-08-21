'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBeta } from '@/contexts/BetaContext';
import { useSession } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * BetaGate — wraps pages that require beta access.
 * - Admin always passes
 * - Active beta users pass
 * - Others get redirected to /beta-access
 * - Unauthenticated users are not blocked here (login handles that)
 */
export function BetaGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hasAccess, isAdmin, betaMode, reason } = useBeta();
  const { status } = useSession();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Wait for beta check to complete
    if (status === 'loading') return;

    // If not in beta mode, allow everyone
    if (!betaMode) {
      setChecked(true);
      return;
    }

    // Unauthenticated users are handled by login page
    if (status === 'unauthenticated') {
      setChecked(true);
      return;
    }

    // Authenticated — check beta access
    if (status === 'authenticated') {
      if (hasAccess || isAdmin) {
        setChecked(true);
      } else {
        // No beta access — redirect to beta access page
        router.replace('/beta-access');
      }
    }
  }, [status, hasAccess, isAdmin, betaMode, reason, router]);

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
