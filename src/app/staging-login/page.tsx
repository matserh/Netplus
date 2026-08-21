'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function StagingLoginPage() {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/staging-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.replace('/');
      } else {
        setError('Mot de passe incorrect');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Accès Restreint</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Ceci est un environnement de staging. Entrez le mot de passe pour continuer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/30 p-6">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full h-11 pl-10 pr-10 bg-muted/30 border border-white/[0.06] rounded-xl text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-amber-500/40 transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground/60"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm hover:shadow-lg hover:shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Vérification...' : 'Accéder au Staging'}
          </button>

          <p className="text-center text-[11px] text-muted-foreground/40 mt-4">
            NetPlus Staging · Environnement de test
          </p>
        </form>
      </div>
    </div>
  );
}