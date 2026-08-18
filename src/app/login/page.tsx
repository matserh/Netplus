'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Logo } from '@/components/ui/Logo';
import { useGuest } from '@/contexts/GuestContext';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, Film, Shield, Sparkles, ArrowLeft, KeyRound, Ghost, MessageSquareCode } from 'lucide-react';

type AuthMode = 'magic-link' | 'credentials';

export default function LoginPage() {
  const router = useRouter();
  const { enterGuestMode } = useGuest();
  const [authMode, setAuthMode] = useState<AuthMode>('magic-link');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Magic link state
  const [magicEmail, setMagicEmail] = useState('');
  const [magicCode, setMagicCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Credentials state
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Magic link: Send code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!magicEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(magicEmail)) { setError('Adresse email invalide'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail, action: 'send' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur lors de l'envoi du code"); return; }
      setCodeSent(true); setResendCooldown(60);
      if (data.emailSent) {
        setSuccess('Code envoyé à votre adresse email !');
      } else if (data.code) {
        setSuccess(`Code de vérification : ${data.code} (email non disponible, utilisez ce code)`);
      } else {
        setSuccess('Code généré. Vérifiez votre email ou contactez le support.');
      }
    } catch { setError('Erreur de connexion au serveur'); } finally { setLoading(false); }
  };

  // Magic link: Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setVerifying(true);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail, code: magicCode, action: 'verify' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Code invalide'); setVerifying(false); return; }
      if (data.success && data.user) {
        try {
          const sessionRes = await fetch('/api/auth/magic-link-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id }),
          });
          if (sessionRes.ok) { window.location.href = '/profiles'; return; }
        } catch {}
        router.push('/profiles');
      }
    } catch { setError('Erreur de connexion au serveur'); } finally { setVerifying(false); }
  };

  // Guest mode
  const handleGuestMode = () => { enterGuestMode(); router.push('/'); };

  // Credentials form submit
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (isLogin) {
        const result = await signIn('credentials', { email: formData.email, password: formData.password, redirect: false });
        if (result?.error) setError('Email ou mot de passe incorrect'); else router.push('/profiles');
      } else {
        if (formData.password !== formData.confirmPassword) { setError('Les mots de passe ne correspondent pas'); setLoading(false); return; }
        if (formData.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); setLoading(false); return; }
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Erreur lors de l'inscription"); return; }
        const result = await signIn('credentials', { email: formData.email, password: formData.password, redirect: false });
        if (result?.ok) router.push('/profiles'); else { setIsLogin(true); setError('Compte créé ! Connectez-vous maintenant.'); }
      }
    } catch { setError('Une erreur est survenue'); } finally { setLoading(false); }
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
              <Sparkles className="w-3.5 h-3.5 text-primary/60" />
              <p className="text-sm text-muted-foreground/60">Votre destination premium pour le streaming</p>
              <Sparkles className="w-3.5 h-3.5 text-primary/60" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/30 p-6 sm:p-8">

          {/* MAGIC LINK MODE */}
          {authMode === 'magic-link' && (<>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3"><MessageSquareCode className="w-6 h-6 text-primary" /></div>
              <h2 className="text-lg font-bold text-foreground">Connexion par code</h2>
              <p className="text-xs text-muted-foreground/60 mt-1">Recevez un code de vérification sur votre email</p>
            </div>

            {error && (<div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-shake"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span></div>)}
            {success && (<div className="flex items-start gap-2 px-4 py-3 mb-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm"><KeyRound className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{success}</span></div>)}

            {!codeSent ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                  <input type="email" placeholder="Votre adresse email" value={magicEmail} onChange={e => setMagicEmail(e.target.value)} className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all" required autoFocus />
                </div>
                <button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Envoi en cours...</span></>) : (<><Mail className="w-4 h-4" /><span>Recevoir le code</span></>)}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <p className="text-xs text-muted-foreground/70 text-center">Code envoyé à <span className="text-foreground font-medium">{magicEmail}</span></p>
                <div className="flex justify-center gap-2">
                  {[0,1,2,3,4,5].map((i) => (
                    <input key={i} type="text" inputMode="numeric" maxLength={1} value={magicCode[i] || ''} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); const nc = magicCode.split(''); nc[i] = val; setMagicCode(nc.join('')); if (val && i < 5) { (e.target.parentElement?.children[i+1] as HTMLInputElement)?.focus(); } }} onKeyDown={(e) => { if (e.key === 'Backspace' && !magicCode[i] && i > 0) { (e.target.parentElement?.children[i-1] as HTMLInputElement)?.focus(); } }} className="w-11 h-14 text-center text-xl font-bold rounded-xl bg-muted/50 border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all" />
                  ))}
                </div>
                <button type="submit" disabled={verifying || magicCode.length < 6} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {verifying ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Vérification...</span></>) : (<><KeyRound className="w-4 h-4" /><span>Vérifier le code</span></>)}
                </button>
                <div className="text-center">
                  <button type="button" onClick={() => { if (resendCooldown <= 0) { setCodeSent(false); setMagicCode(''); setError(''); setSuccess(''); } }} disabled={resendCooldown > 0} className="text-xs text-muted-foreground/50 hover:text-primary transition-colors disabled:opacity-30">
                    {resendCooldown > 0 ? `Renvoyer le code dans ${resendCooldown}s` : 'Renvoyer le code'}
                  </button>
                </div>
                <button type="button" onClick={() => { setCodeSent(false); setMagicCode(''); setError(''); setSuccess(''); }} className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors">
                  <ArrowLeft className="w-3 h-3" /> Changer d&apos;email
                </button>
              </form>
            )}

            <div className="flex items-center gap-3 my-5"><div className="flex-1 h-px bg-border/30" /><span className="text-[10px] text-muted-foreground/30">ou</span><div className="flex-1 h-px bg-border/30" /></div>

            <button onClick={handleGuestMode} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 mb-3">
              <Ghost className="w-4 h-4" /> Continuer en mode invité
            </button>
            <p className="text-[10px] text-muted-foreground/30 text-center mb-3">Mode invité : 10 contenus gratuits, sans compte requis</p>
            <button onClick={() => { setAuthMode('credentials'); setError(''); setSuccess(''); }} className="w-full text-center text-xs text-muted-foreground/50 hover:text-primary transition-colors">Connexion avec mot de passe →</button>
          </>)}

          {/* CREDENTIALS MODE */}
          {authMode === 'credentials' && (<>
            <div className="flex rounded-xl bg-muted/50 p-1 mb-6">
              <button onClick={() => { setIsLogin(true); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${isLogin ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}>Connexion</button>
              <button onClick={() => { setIsLogin(false); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${!isLogin ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}>Inscription</button>
            </div>

            {error && (<div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-shake"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span></div>)}

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {!isLogin && (<div className="relative group"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" /><input type="text" placeholder="Nom complet" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all" required={!isLogin} /></div>)}
              <div className="relative group"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" /><input type="email" placeholder="Adresse email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all" required /></div>
              <div className="relative group"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" /><input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full h-11 pl-10 pr-11 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all" required minLength={6} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              {!isLogin && (<div className="relative group"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" /><input type={showPassword ? 'text' : 'password'} placeholder="Confirmer le mot de passe" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all" required={!isLogin} minLength={6} /></div>)}
              <button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black font-bold text-sm hover:shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>{isLogin ? 'Connexion...' : 'Inscription...'}</span></>) : (<span>{isLogin ? 'Se connecter' : "S'inscrire"}</span>)}
              </button>
            </form>

            {!isLogin && (<p className="text-center text-[11px] text-muted-foreground/30 mt-4 leading-relaxed">En créant un compte, vous acceptez nos <a href="/terms" className="text-primary/50 hover:text-primary/80 transition-colors">Conditions d&apos;Utilisation</a> et notre <a href="/privacy" className="text-primary/50 hover:text-primary/80 transition-colors">Politique de Confidentialité</a>.</p>)}

            <p className="text-center text-xs text-muted-foreground/50 mt-5">{isLogin ? "Pas encore de compte ?" : 'Déjà un compte ?'}{' '}<button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-primary hover:text-primary/80 font-semibold transition-colors">{isLogin ? "S'inscrire" : 'Se connecter'}</button></p>

            <div className="flex items-center gap-3 my-5"><div className="flex-1 h-px bg-border/30" /><span className="text-[10px] text-muted-foreground/30">ou</span><div className="flex-1 h-px bg-border/30" /></div>
            <button onClick={() => { setAuthMode('magic-link'); setError(''); setSuccess(''); }} className="w-full text-center text-xs text-muted-foreground/50 hover:text-primary transition-colors mb-3">← Connexion par code email</button>
            <button onClick={handleGuestMode} className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"><Ghost className="w-4 h-4" /> Mode invité</button>
          </>)}
        </div>

        <div className="flex items-center justify-center gap-2 mt-5"><Shield className="w-3.5 h-3.5 text-muted-foreground/20" /><p className="text-[11px] text-muted-foreground/20">Connexion sécurisée · Données stockées localement</p></div>
        <p className="text-center text-[10px] text-muted-foreground/15 mt-3">© 2026 Netplus · Aeronlabs + IAgen</p>
      </div>
    </div>
  );
}
