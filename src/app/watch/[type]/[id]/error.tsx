'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function WatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Watch page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-destructive/20 to-amber-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.736-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.766 1.333.196 3 1.736 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Erreur de chargement</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Impossible de charger ce contenu. Le serveur peut être temporairement indisponible.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
