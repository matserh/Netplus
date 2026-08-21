'use client';

import { useState } from 'react';
import { useBeta } from '@/contexts/BetaContext';
import { useSession } from '@/contexts/AuthContext';
import { Ticket, KeyRound, ShieldBan, Clock, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

export default function BetaAccessPage() {
  const { reason, refresh } = useBeta();
  const { data: session } = useSession();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !password.trim()) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/beta/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        await refresh();
        window.location.replace('/');
      } else {
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Banned
  if (reason === 'banned') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
            <ShieldBan className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Compte Suspendu</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Votre accès à NetPlus Bêta a été suspendu par un administrateur.
          </p>
        </div>
      </div>
    );
  }

  // Paused
  if (reason === 'paused') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Accès en Pause</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Votre accès est temporairement mis en pause. Contactez l'administrateur pour plus d'informations.
          </p>
        </div>
      </div>
    );
  }

  // No access — show redeem form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Ticket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">NetPlus Bêta</h1>
          <p className="text-sm text-muted-foreground mt-2">
            NetPlus est en version bêta. Entrez votre code d'invitation et le mot de passe fournis par l'administrateur.
          </p>
          {session?.user?.email && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              Connecté en tant que {session.user.email}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/30 p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
                <ArrowRight className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm font-medium text-green-400">Accès bêta activé !</p>
              <p className="text-xs text-muted-foreground mt-1">Redirection en cours...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleRedeem}>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Code d'invitation</label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="NP-XXXX-XXXX"
                      className="w-full h-11 pl-10 pr-3 bg-muted/30 border border-white/[0.06] rounded-xl text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors uppercase"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mot de passe de l'invitation"
                      className="w-full h-11 pl-10 pr-3 bg-muted/30 border border-white/[0.06] rounded-xl text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !code.trim() || !password.trim()}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</> : 'Activer l\'accès Bêta'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/40 mt-4">
          NetPlus Bêta · Accès sur invitation uniquement
        </p>
      </div>
    </div>
  );
}