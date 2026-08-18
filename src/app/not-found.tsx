import Link from 'next/link';

export default function NotFound() {
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #e5a00d, #ff6b35)',
        marginBottom: '2rem',
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#0f0f23',
      }}>
        N
      </div>
      <h1 style={{
        fontSize: '6rem',
        fontWeight: 700,
        margin: 0,
        background: 'linear-gradient(135deg, #e5a00d, #ff6b35)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        lineHeight: 1,
      }}>
        404
      </h1>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 500,
        margin: '1rem 0 0.5rem',
        color: '#ffffff',
      }}>
        Page introuvable
      </h2>
      <p style={{
        fontSize: '1rem',
        color: '#94a3b8',
        marginBottom: '2rem',
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        La page que vous recherchez n&apos;existe pas ou a &eacute;t&eacute; d&eacute;plac&eacute;e.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '0.75rem 2rem',
          borderRadius: '0.5rem',
          background: 'linear-gradient(135deg, #e5a00d, #ff6b35)',
          color: '#0f0f23',
          fontWeight: 'bold',
          textDecoration: 'none',
          fontSize: '1rem',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
      >
        Retour &agrave; l&apos;accueil
      </Link>
    </div>
  );
}
