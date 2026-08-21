'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { useBeta } from '@/contexts/BetaContext';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/beta-config';
import {
  Shield, Users, Ticket, Ban, Pause, Play, Send, Copy, Check, Loader2,
  Plus, RefreshCw, Crown, Clock, AlertTriangle, UserX, Eye, Trash2, KeyRound
} from 'lucide-react';

// ---- Types ----
interface BetaUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  profiles: { name: string; type: string; isDefault: boolean }[];
  betaAccess: { status: string; grantedAt: string; grantedBy: string | null } | null;
}

interface Invitation {
  id: string;
  code: string;
  email: string | null;
  maxUses: number;
  useCount: number;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  creator: { name: string | null; email: string } | null;
  userUsed: { name: string | null; email: string } | null;
}

interface Stats {
  totalInvitations: number;
  activeInvitations: number;
  activeBetaUsers: number;
  bannedUsers: number;
  pausedUsers: number;
}

// ---- Helper ----
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/20',
    banned: 'bg-red-500/10 text-red-400 border-red-500/20',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    used: 'bg-muted/20 text-muted-foreground border-muted/30',
    revoked: 'bg-red-500/5 text-red-300/60 border-red-500/10',
  };
  const labels: Record<string, string> = {
    active: 'Actif', banned: 'Banni', paused: 'En pause', used: 'Utilisé', revoked: 'Révoqué',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status] || styles.active}`}>
      {labels[status] || status}
    </span>
  );
}

// ---- Admin Panel ----
export default function AdminPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { isAdmin: betaIsAdmin } = useBeta();

  const [tab, setTab] = useState<'users' | 'invitations' | 'create-inv'>('users');
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invitation creation form
  const [invEmail, setInvEmail] = useState('');
  const [invPassword, setInvPassword] = useState('');
  const [invExpiry, setInvExpiry] = useState('7');
  const [createdInv, setCreatedInv] = useState<{ code: string; password: string } | null>(null);
  const [copyCode, setCopyCode] = useState(false);
  const [copyPw, setCopyPw] = useState(false);
  const [createError, setCreateError] = useState('');

  // Auth check
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (authStatus === 'authenticated' && session) {
      if (!isAdmin(session.user.email)) {
        router.push('/');
      }
    }
  }, [authStatus, session, router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, invRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Content-Type': 'application/json' } }),
        fetch('/api/admin/invitations', { headers: { 'Content-Type': 'application/json' } }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
        setStats(data.stats);
      }
      if (invRes.ok) {
        const data = await invRes.json();
        setInvitations(data.invitations);
      }
    } catch (err) {
      console.error('[admin] Fetch error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session && isAdmin(session.user.email)) {
      fetchData();
    }
  }, [session, fetchData]);

  // User actions
  const handleUserAction = async (userId: string, action: string) => {
    setActionLoading(`${userId}-${action}`);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  // Create invitation
  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setActionLoading('create-inv');
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invEmail || undefined, password: invPassword, expiresInDays: parseInt(invExpiry) || 7 }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedInv({ code: data.plainCode, password: data.plainPassword });
        setInvEmail('');
        setInvPassword('');
        fetchData();
      } else {
        setCreateError(data.error || 'Erreur');
      }
    } catch {
      setCreateError('Erreur serveur');
    } finally {
      setActionLoading(null);
    }
  };

  // Revoke invitation
  const handleRevokeInv = async (id: string) => {
    setActionLoading(`revoke-${id}`);
    try {
      await fetch('/api/admin/invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: id, action: 'revoke' }),
      });
      fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'pw') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') { setCopyCode(true); setTimeout(() => setCopyCode(false), 2000); }
    else { setCopyPw(true); setTimeout(() => setCopyPw(false), 2000); }
  };

  // Loading state
  if (authStatus === 'loading' || !session || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement du panneau admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin(session.user.email)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Panneau Admin</h1>
              <p className="text-[10px] text-muted-foreground">NetPlus Bêta</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/30">
              Retour au site
            </button>
            <button onClick={fetchData} disabled={loading} className="p-2 rounded-lg hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Utilisateurs Bêta', value: stats.activeBetaUsers, icon: Users, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Bannis', value: stats.bannedUsers, icon: UserX, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'En Pause', value: stats.pausedUsers, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Invitations', value: stats.totalInvitations, icon: Ticket, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Invitations Actives', value: stats.activeInvitations, icon: Send, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-card/60 border border-white/[0.04] p-4">
                <div className={`inline-flex p-1.5 rounded-lg ${s.bg} mb-2`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-muted/20 rounded-xl p-1 w-fit">
          {[
            { id: 'users' as const, label: 'Utilisateurs', icon: Users },
            { id: 'invitations' as const, label: 'Invitations', icon: Ticket },
            { id: 'create-inv' as const, label: 'Créer Invitation', icon: Plus },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="rounded-2xl bg-card/60 border border-white/[0.04] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Accès Bêta</th>
                    <th className="hidden md:table-cell px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Inscrit le</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">Aucun utilisateur</td></tr>
                  )}
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            {user.name || user.email}
                            {isAdmin(user.email) && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.betaAccess?.status || user.status} />
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        {user.betaAccess ? (
                          <div>
                            <p className="text-[11px] text-muted-foreground">Accordé par {user.betaAccess.grantedBy || 'système'}</p>
                            <p className="text-[10px] text-muted-foreground/60">{formatDate(user.betaAccess.grantedAt)}</p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">Aucun accès</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-[11px] text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {!isAdmin(user.email) && (
                          <div className="flex items-center justify-end gap-1">
                            {user.betaAccess?.status !== 'active' && user.status !== 'active' && (
                              <button
                                onClick={() => handleUserAction(user.id, 'activate')}
                                disabled={!!actionLoading}
                                title="Activer"
                                className="p-1.5 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors"
                              >
                                {actionLoading === `${user.id}-activate` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {user.betaAccess?.status === 'active' && (
                              <button
                                onClick={() => handleUserAction(user.id, 'pause')}
                                disabled={!!actionLoading}
                                title="Mettre en pause"
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors"
                              >
                                {actionLoading === `${user.id}-pause` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {user.status !== 'banned' && (
                              <button
                                onClick={() => handleUserAction(user.id, 'ban')}
                                disabled={!!actionLoading}
                                title="Bannir"
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                {actionLoading === `${user.id}-ban` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {!user.betaAccess && (
                              <button
                                onClick={() => handleUserAction(user.id, 'grant_beta')}
                                disabled={!!actionLoading}
                                title="Accorder accès bêta"
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              >
                                {actionLoading === `${user.id}-grant_beta` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invitations Tab */}
        {tab === 'invitations' && (
          <div className="rounded-2xl bg-card/60 border border-white/[0.04] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pour</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="hidden md:table-cell px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Créé le</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {invitations.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">Aucune invitation</td></tr>
                  )}
                  {invitations.map(inv => (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-primary bg-primary/5 px-2 py-1 rounded">{inv.code}</code>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-[11px] text-muted-foreground">
                        {inv.email || <span className="text-muted-foreground/40">N'importe qui</span>}
                        {inv.userUsed && (
                          <p className="text-[10px] text-green-400/70">Utilisé par {inv.userUsed.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="hidden md:table-cell px-4 py-3 text-[11px] text-muted-foreground">
                        {formatDate(inv.createdAt)}
                        {inv.expiresAt && (
                          <p className="text-[10px] text-muted-foreground/50">Expire: {formatDate(inv.expiresAt)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.status === 'active' && (
                          <button
                            onClick={() => handleRevokeInv(inv.id)}
                            disabled={!!actionLoading}
                            title="Révoquer"
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors ml-auto"
                          >
                            {actionLoading === `revoke-${inv.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Invitation Tab */}
        {tab === 'create-inv' && (
          <div className="max-w-md">
            <div className="rounded-2xl bg-card/60 border border-white/[0.04] p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Send className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Nouvelle Invitation</h2>
                  <p className="text-[11px] text-muted-foreground">Créez un code d'accès pour un utilisateur bêta</p>
                </div>
              </div>

              {createdInv ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
                    <p className="text-xs font-medium text-green-400 mb-3">Invitation créée avec succès ! Partagez ces informations :</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 bg-muted/20 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Code</p>
                          <code className="text-sm font-mono font-bold text-primary">{createdInv.code}</code>
                        </div>
                        <button onClick={() => copyToClipboard(createdInv.code, 'code')} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground">
                          {copyCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-muted/20 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Mot de passe</p>
                          <code className="text-sm font-mono font-bold text-foreground">{createdInv.password}</code>
                        </div>
                        <button onClick={() => copyToClipboard(createdInv.password, 'pw')} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground">
                          {copyPw ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCreatedInv(null)}
                    className="w-full h-10 rounded-xl bg-muted/30 text-foreground text-xs font-medium hover:bg-muted/50 transition-colors"
                  >
                    Créer une autre invitation
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateInvitation} className="space-y-3">
                  {createError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {createError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Email du destinataire (optionnel)</label>
                    <input
                      type="email"
                      value={invEmail}
                      onChange={e => setInvEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full h-10 px-3 bg-muted/30 border border-white/[0.06] rounded-xl text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Mot de passe de l'invitation</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                      <input
                        type="text"
                        value={invPassword}
                        onChange={e => setInvPassword(e.target.value)}
                        placeholder="Ex: Bienvenue2026"
                        required
                        className="w-full h-10 pl-9 pr-3 bg-muted/30 border border-white/[0.06] rounded-xl text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Expiration (jours)</label>
                    <select
                      value={invExpiry}
                      onChange={e => setInvExpiry(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/30 border border-white/[0.06] rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                    >
                      <option value="1">1 jour</option>
                      <option value="3">3 jours</option>
                      <option value="7">7 jours</option>
                      <option value="14">14 jours</option>
                      <option value="30">30 jours</option>
                      <option value="90">90 jours</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading === 'create-inv' || !invPassword.trim()}
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black font-bold text-xs hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'create-inv' ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Création...</>
                    ) : (
                      <><Send className="w-3.5 h-3.5" /> Créer l'invitation</>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}