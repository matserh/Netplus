'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { useGuest } from '@/contexts/GuestContext';
import { Loader2, Film, Shield, Sparkles, Ghost } from 'lucide-react';

// TypeScript declaration for the global puter object
declare global {
  interface Window {
    puter?: {
      auth: {
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
        isSignedIn: () => boolean;
        getUser: () => Promise<{ username: string; email?: string }>;
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { enterGuestMode } = useGuest();
  const [puterLoading, setPuterLoading] = useState(false);
  const [puterAvailable, setPuterAvailable] = useState(false);
  const [error, setError] = useState('');

  // Check if Puter.js is loaded
  useEffect(() => {
    const checkPuter = () => {
      if (typeof window !== 'undefined' && window.puter && window.puter.auth) {
        setPuterAvailable(true);
        return true;
      }
      return false;
    };
    if (checkPuter()) return;
    const interval = setInterval(() => {
      if (checkPuter()) clearInterval(interval);
    }, 300);
    setTimeout(() => clearInterval(interval), 10000);
    return () => clearInterval(interval);
  }, []);

  // Sign in with Puter
  const handlePuterSignIn = async () => {
    setError('');
    setPuterLoading(true);
    try {
      if (!window.puter || !window.puter.auth) {
        setError('Puter non disponible. Réessayez.');
        return;
      }
      await window.puter.auth.signIn();
      const user = await window.puter.auth.getUser();
      if (!user || !user.username) {
        setError('Impossible de récupérer votre profil');
        return;
      }
      const email = user.email || `${user.username}@puter.com`;
      const res = await fetch('/api/auth/puter-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username: user.username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur de connexion');
        return;
      }
      window.location.href = '/profiles';
    } catch (err) {
      console.error('[puter] Sign-in error:', err);
      setError('Connexion annulée');
    } finally {
      setPuterLoading(false);
    }
  };

  const handleGuestMode = () => {
    enterGuestMode();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-900/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-amber-500/2 rounded-full blur-[120px]" />
        <div className="absolute top-20 left-10 opacity-5 animate-float-slow"><Film className="w-24 h-24 text-primary" /></div>
        <div className="absolute bottom-32 right-16 opacity-5 animate-float-slow-reverse"><Shield className="w-20 h-20 text-amber-500" /></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3">
            <Logo size="lg" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-sm text-white">Votre destination premium pour le streaming</p>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/30 p-6 sm:p-8">

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* PUTER — primary, gold NetPlus color */}
          <button
            onClick={handlePuterSignIn}
            disabled={puterLoading || !puterAvailable}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mb-3"
          >
            {puterLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Connexion...</span></>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <span>Se connecter avec Puter</span>
              </>
            )}
          </button>

          {/* INVITÉ — secondary */}
          <button
            onClick={handleGuestMode}
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2.5"
          >
            <Ghost className="w-4 h-4" />
            Continuer en mode invité
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-5">
          <Shield className="w-3.5 h-3.5 text-white/30" />
          <p className="text-[11px] text-white/50">Connexion sécurisée</p>
        </div>
        <p className="text-center text-[10px] text-white/30 mt-3">© 2026 Netplus · Aeronlabs + IAgen</p>
      </div>
    </div>
  );
}
