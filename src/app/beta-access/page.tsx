'use client';

import { useState, useEffect, Suspense } from 'react';
import { useBeta } from '@/contexts/BetaContext';
import { useSession } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { Ticket, Link2, ArrowRight, Loader2, CheckCircle2, AlertTriangle, LogIn, ShieldCheck } from 'lucide-react';

function BetaAccessContent() {
  const { reason, refresh } = useBeta();
  const { data: session, status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const token = searchParams.get('t');

  const [status, setStatus] = useState<'idle' | 'redeeming' | 'success' | 'error' | 'need-login'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-redeem if token is present in URL
  useEffect(() => {
    if (!token) return;
    if (authStatus === 'loading') return;

    // If not logged in, redirect to login with return URL
    if (authStatus === 'unauthenticated') {
      setStatus('need-login');
      return;
    }

    // Already authenticated — redeem automatically
    if (authStatus === 'authenticated' && status === 'idle') {
      setStatus('redeeming');
      fetch('/api/beta/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus('success');
            refresh();
            // Redirect after 2 seconds
            setTimeout(() => { window.location.replace('/'); }, 2000);
          } else {
            setStatus('error');
            setErrorMsg(data.error || 'Erreur inconnue');
          }
        })
        .catch(() => {
          setStatus('error');
          setErrorMsg('Erreur de connexion au serveur');
        });
    }
  }, [token, authStatus, status, refresh]);

  // Already have access (no token in URL, redirected here by BetaGate)
  if (!token && reason !== 'no_access') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          {reason === 'banned' ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Compte Suspendu</h1>
              <p className="text-sm text-muted-foreground mt-2">Votre accès a été suspendu par un administrateur.</p>
            </>
          ) : reason === 'paused' ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Accès en Pause</h1>
              <p className="text-sm text-muted-foreground mt-2">Votre accès est temporairement mis en pause.</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
                <ShieldCheck className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Accès Bêta Actif</h1>
              <p className="text-sm text-muted-foreground mt-2">Vous avez déjà accès à NetPlus Bêta.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Need login to redeem invitation
  if (status === 'need-login') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Connexion Requise</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Connectez-vous pour utiliser votre invitation.
          </p>
          <a
            href={`/login?callbackUrl=${encodeURIComponent('/beta-access?t=' + (token || ''))}`}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  // Redeeming
  if (status === 'redeeming') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Activation en cours...</h1>
          <p className="text-sm text-muted-foreground mt-2">Vérification de votre invitation</p>
        </div>
      </div>
    );
  }

  // Success
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Accès Activé !</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Bienvenue sur NetPlus Bêta. Votre accès est permanent.
          </p>
          {session?.user?.email && (
            <p className="text-xs text-muted-foreground/60 mt-1">Connecté en tant que {session.user.email}</p>
          )}
          <div className="mt-4">
            <ArrowRight className="w-5 h-5 text-muted-foreground mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Invitation Invalide</h1>
          <p className="text-sm text-red-400/80 mt-2">{errorMsg}</p>
          <p className="text-xs text-muted-foreground/50 mt-4">
            Demandez un nouveau lien d'invitation à l'administrateur.
          </p>
        </div>
      </div>
    );
  }

  // Default: no token in URL, no access — show waiting state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Ticket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">NetPlus Bêta</h1>
          <p className="text-sm text-muted-foreground mt-2">
            NetPlus est en version bêta. Vous avez besoin d'un lien d'invitation pour y accéder.
          </p>
        </div>

        <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/30 p-6">
          <div className="text-center py-6">
            <Link2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Demandez un lien d'invitation à l'administrateur.
            </p>
            <p className="text-xs text-muted-foreground/50 mt-2">
              Une fois le lien reçu, cliquez dessus pour activer votre accès.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/40 mt-4">
          NetPlus Bêta · Accès sur invitation uniquement
        </p>
      </div>
    </div>
  );
}
export default function BetaAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BetaAccessContent />
    </Suspense>
  );
}
