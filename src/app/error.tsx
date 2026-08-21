'use client';

import { Logo } from '@/components/ui/Logo';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging
    console.error('[NetPlus Error Boundary]', error.message, error.stack);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0f0f23',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
    }}>
      {/* NetPlus Logo */}
      <div style={{ marginBottom: '2rem' }}>
        <Logo size="sm" />
      </div>

      {/* Error icon */}
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(229, 160, 13, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e5a00d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Oups, une erreur
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem', textAlign: 'center', maxWidth: '400px' }}>
        Quelque chose s'est mal passé. Réessayez ou revenez à l'accueil.
      </p>
      {/* Show error detail for debugging */}
      <p style={{ fontSize: '0.75rem', color: 'rgba(229, 160, 13, 0.6)', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px', wordBreak: 'break-all' }}>
        {error.message}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            backgroundColor: '#e5a00d',
            color: 'black',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Réessayer
        </button>
        <button
          onClick={() => window.location.href = '/' }
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: 'white',
            fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Accueil
        </button>
      </div>
    </div>
  );
}
