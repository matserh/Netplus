'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft, Home, Film, Tv, Star, Crown, FileText, Shield, User, Sparkles, Mail } from 'lucide-react';

export default function FooterPage() {
  const quickLinks = [
    { icon: Home, label: 'Accueil', href: '/' },
    { icon: Film, label: 'Films', href: '/?type=movies' },
    { icon: Tv, label: 'Séries', href: '/?type=tv' },
    { icon: Star, label: 'Top', href: '/?type=top' },
    { icon: Crown, label: 'Premium', href: '/pricing' },
  ];

  const legalLinks = [
    { icon: FileText, label: 'Conditions d\'utilisation', href: '/terms' },
    { icon: Shield, label: 'Politique de confidentialité', href: '/privacy' },
    { icon: User, label: 'À propos', href: '/about' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-6 border-b border-border/50 bg-background/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </Link>
        </div>
        <Logo size="sm" />
        <div className="w-20" />
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        {/* Brand Section */}
        <div className="flex flex-col items-center text-center mb-16">
          <Logo size="lg" />
          <p className="mt-4 text-muted-foreground max-w-md">
            Votre destination premium pour les films et séries en streaming. Gratuit, sans compromis.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Sparkles className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-xs text-muted-foreground/60">Propulsé par <span className="text-primary/80 font-semibold">Netplus</span></span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Navigation rapide</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
              >
                <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Legal Links */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Informations légales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {legalLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
              >
                <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Contact</h2>
          <a
            href="mailto:aeronscriptlabs@gmail.com"
            className="flex items-center gap-3 px-5 py-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90 group-hover:text-foreground transition-colors">Email professionnel</p>
              <p className="text-xs text-muted-foreground group-hover:text-primary/80 transition-colors">aeronscriptlabs@gmail.com</p>
            </div>
          </a>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-border/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
              <Link href="/terms" className="hover:text-foreground transition-colors">Conditions</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
              <Link href="/about" className="hover:text-foreground transition-colors">À propos</Link>
              <a href="mailto:aeronscriptlabs@gmail.com" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-[11px] text-muted-foreground/40">
              © 2026 Netplus · <Link href="/about" className="hover:text-primary/60 transition-colors">Aeronlabs</Link> + <span className="text-primary/40">IAgen</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
