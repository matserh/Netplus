'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/beta-config';
import {
  Shield, Link2, Copy, Check, Loader2, Plus,
  Send, Clock, Trash2, Gift, AlertTriangle
} from 'lucide-react';

// ---- Types ----
interface StoredInvitation {
  jti: string;
  url: string;
  forEmail: string | null;
  expiresInDays: number;
  createdAt: string;
}

// ---- LocalStorage helpers ----
const LS_KEY = 'np-admin-invitations';
function loadLocalInvitations(): StoredInvitation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveLocalInvitations(inv: StoredInvitation[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(inv));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(d: string): string {
  const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (seconds < 60) return 'À l\'instant';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

function isExpired(createdAt: string, expiresInDays: number): boolean {
  const exp = new Date(createdAt).getTime() + expiresInDays * 24 * 60 * 60 * 1000;
  return Date.now() > exp;
}

// ---- Admin Panel ----
export default function AdminPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [tab, setTab] = useState<'generate' | 'history'>('generate');
  const [invitations, setInvitations] = useState<StoredInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate form
  const [forEmail, setForEmail] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Auth check
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (authStatus === 'authenticated' && session && !isAdmin(session.user.email)) {
      router.push('/');
    }
  }, [authStatus, session, router]);

  // Load local invitations from localStorage
  const loadInvitations = useCallback(() => {
    setInvitations(loadLocalInvitations());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session && isAdmin(session.user.email)) {
      loadInvitations();
    }
  }, [session, loadInvitations]);

  // Generate invitation link
  const handleGenerate = async () => {
    setGenerateError('');
    setGenerateLoading(true);
    setGeneratedUrl('');
    setCopied(false);

    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forEmail: forEmail.trim() || undefined,
          expiresInDays: parseInt(expiryDays) || 7,
        }),
      });
      const data = await res.json();

      if (data.success && data.invitation) {
        setGeneratedUrl(data.invitation.url);

        // Save to localStorage
        const newInv: StoredInvitation = {
          jti: data.invitation.jti,
          url: data.invitation.url,
          forEmail: data.invitation.forEmail,
          expiresInDays: data.invitation.expiresInDays,
          createdAt: data.invitation.createdAt,
        };
        const updated = [newInv, ...loadLocalInvitations()];
        saveLocalInvitations(updated);
        setInvitations(updated);
        setForEmail('');
      } else {
        setGenerateError(data.error || 'Erreur lors de la création');
      }
    } catch {
      setGenerateError('Erreur de connexion au serveur');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Copy URL
  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Delete from history
  const handleDelete = (jti: string) => {
    const updated = invitations.filter(i => i.jti !== jti);
    saveLocalInvitations(updated);
    setInvitations(updated);
  };

  // Loading
  if (authStatus === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin(session.user.email)) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Administration</h1>
              <p className="text-[10px] text-muted-foreground">NetPlus Bêta</p>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/30">
            Retour au site
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-muted/20 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('generate')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'generate' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Gift className="w-3.5 h-3.5" />
            Générer un Lien
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Clock className="w-3.5 h-3.5" />
            Historique ({invitations.length})
          </button>
        </div>

        {/* Generate Tab */}
        {tab === 'generate' && (
          <div className="max-w-lg space-y-4">
            {/* How it works */}
            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Comment ça marche ?</h3>
                  <ul className="text-xs text-muted-foreground mt-1.5 space-y-1">
                    <li>1. Cliquez sur <b>"Générer le lien"</b></li>
                    <li>2. Copiez le lien et envoyez-le à la personne invitée</li>
                    <li>3. La personne clique sur le lien, se connecte, et obtient l\'accès</li>
                    <li>4. L\'accès est <b>permanent</b> (même après déconnexion)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Generated URL display */}
            {generatedUrl && (
              <div className="rounded-2xl bg-green-500/5 border border-green-500/20 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <p className="text-sm font-semibold text-green-400">Lien d\'invitation créé !</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/30 rounded-xl px-4 py-3 min-w-0">
                    <p className="text-xs font-mono text-foreground truncate">{generatedUrl}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(generatedUrl)}
                    className="flex-shrink-0 h-11 px-4 rounded-xl bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-3">
                  Envoyez ce lien à la personne invitée. Le lien expire dans {expiryDays} jours.
                </p>
                <button
                  onClick={() => { setGeneratedUrl(''); setCopied(false); }}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Générer un autre lien
                </button>
              </div>
            )}

            {/* Form */}
            {!generatedUrl && (
              <div className="rounded-2xl bg-card/60 border border-white/[0.04] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Send className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Nouveau Lien d\'Invitation</h2>
                    <p className="text-[11px] text-muted-foreground">Un clic pour générer, un lien à partager</p>
                  </div>
                </div>

                {generateError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {generateError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Email du destinataire <span className="text-muted-foreground/40">(optionnel)</span>
                    </label>
                    <input
                      type="email"
                      value={forEmail}
                      onChange={e => setForEmail(e.target.value)}
                      placeholder="personne@example.com"
                      className="w-full h-10 px-3 bg-muted/30 border border-white/[0.06] rounded-xl text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                    <p className="text-[10px] text-muted-foreground/40 mt-1">
                      Si renseigné, seul cet email pourra utiliser le lien.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Durée de validité</label>
                    <select
                      value={expiryDays}
                      onChange={e => setExpiryDays(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/30 border border-white/[0.06] rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                    >
                      <option value="1">1 jour</option>
                      <option value="3">3 jours</option>
                      <option value="7">7 jours</option>
                      <option value="14">14 jours</option>
                      <option value="30">30 jours</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={generateLoading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generateLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Générer le Lien</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <div className="space-y-3">
            {invitations.length === 0 ? (
              <div className="rounded-2xl bg-card/60 border border-white/[0.04] p-12 text-center">
                <Link2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucun lien généré</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Les liens que vous générez apparaîtront ici.</p>
              </div>
            ) : (
              invitations.map(inv => {
                const expired = isExpired(inv.createdAt, inv.expiresInDays);
                return (
                  <div
                    key={inv.jti}
                    className={`rounded-2xl border p-4 transition-colors ${expired ? 'bg-muted/10 border-white/[0.02] opacity-60' : 'bg-card/60 border-white/[0.04]'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link2 className={`w-3.5 h-3.5 flex-shrink-0 ${expired ? 'text-muted-foreground/40' : 'text-primary'}`} />
                          <span className={`text-[11px] font-medium ${expired ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                            {inv.forEmail || 'N\'importe qui'}
                          </span>
                          {expired && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-500/10 text-red-400/60 border border-red-500/10">
                              Expiré
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-foreground/80 truncate mb-1.5">{inv.url}</p>
                        <p className="text-[10px] text-muted-foreground/50">
                          {timeAgo(inv.createdAt)} · Expire dans {inv.expiresInDays}j
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!expired && (
                          <button
                            onClick={() => handleCopy(inv.url)}
                            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                            title="Copier"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(inv.jti)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {invitations.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Supprimer tout l\'historique ?')) {
                    saveLocalInvitations([]);
                    setInvitations([]);
                  }
                }}
                className="text-[11px] text-red-400/50 hover:text-red-400 transition-colors"
              >
                Effacer tout l\'historique
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
