'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      backgroundColor: '#0f0f23',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Erreur de chargement</h2>
      <button
        onClick={reset}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          backgroundColor: '#e5a00d',
          color: 'black',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Réessayer
      </button>
    </div>
  );
}
