'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft, Shield, Eye, Server, Cookie, Lock, Globe, Bell, Scale } from 'lucide-react';
import { useState } from 'react';

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function PrivacyPage() {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const sections = [
    {
      icon: Eye,
      title: '1. Informations que nous collectons',
      content: `Netplus adopte une approche minimaliste en matière de collecte de données. Nous ne collectons aucune information personnelle identifiable. Les seules données stockées sont votre progression dans les défis (nombre de scrolls, interactions avec l'assistant IA, temps de visionnage) et votre statut premium. Ces données sont stockées exclusivement dans le stockage local de votre navigateur (localStorage) et ne sont jamais transmises à nos serveurs. Nous n'utilisons pas de comptes utilisateurs, ce qui signifie que nous ne collectons ni adresses e-mail, ni noms, ni mots de passe, ni aucune autre information d'identification personnelle.`
    },
    {
      icon: Server,
      title: '2. Utilisation des données',
      content: `Les données stockées localement sont utilisées exclusivement pour : déterminer votre niveau d'accès (basique ou premium) ; suivre votre progression dans les défis proposés ; mémoriser vos préférences d'utilisation du Service. Ces données ne sont ni vendues, ni louées, ni partagées avec des tiers à des fins commerciales. Nous n'utilisons pas ces données pour créer des profils utilisateurs ou pour de la publicité ciblée. L'unique finalité est d'améliorer votre expérience sur la plateforme.`
    },
    {
      icon: Cookie,
      title: '3. Cookies et technologies similaires',
      content: `Netplus utilise le stockage local du navigateur (localStorage) pour sauvegarder vos préférences et votre progression. Contrairement aux cookies traditionnels, le localStorage ne transmet pas automatiquement de données à nos serveurs à chaque requête. Nous n'utilisons pas de cookies de suivi tiers, de pixels espions ou de technologies d'empreinte numérique (fingerprinting). Les seuls échanges réseau effectués concernent les appels API vers TMDB pour récupérer les métadonnées des films et séries, et les communications avec l'assistant IA pour les fonctionnalités de chat.`
    },
    {
      icon: Lock,
      title: '4. Sécurité des données',
      content: `Étant donné que nous ne collectons pas de données personnelles sur nos serveurs, les risques de violation de données sont considérablement réduits. Vos données de progression sont stockées localement sur votre appareil et sont protégées par les mécanismes de sécurité intégrés de votre navigateur. Cependant, nous vous recommandons de maintenir votre navigateur à jour et d'utiliser les fonctionnalités de sécurité de votre appareil. Notez que la suppression des données de navigation ou la réinitialisation de votre navigateur effacera votre progression et votre statut premium.`
    },
    {
      icon: Globe,
      title: '5. Services tiers',
      content: `Le Service utilise les API suivantes : TMDB (The Movie Database) pour les métadonnées de films et séries, soumises à leur propre politique de confidentialité ; des services d'hébergement vidéo tiers pour la lecture de contenu, chacun soumis à leurs propres conditions et politiques de confidentialité ; notre assistant IA pour les fonctionnalités de chat, qui traite les conversations en temps réel sans stockage permanent. Nous vous encourageons à consulter les politiques de confidentialité de ces services tiers lorsque vous interagissez avec eux.`
    },
    {
      icon: Bell,
      title: '6. Vos droits',
      content: `Conformément aux réglementations applicables en matière de protection des données (y compris le RGPD pour les utilisateurs européens), vous disposez des droits suivants : droit d'accès à vos données stockées localement ; droit de suppression de vos données via les paramètres de votre navigateur ; droit de rectification en modifiant directement les données stockées ; droit à la portabilité en exportant vos données via les outils de développement du navigateur. Pour exercer ces droits, il vous suffit d'utiliser les fonctionnalités intégrées de votre navigateur pour gérer le stockage local. Aucune demande formelle n'est nécessaire.`
    },
    {
      icon: Scale,
      title: '7. Modifications de cette politique',
      content: `Nous nous réservons le droit de mettre à jour cette Politique de Confidentialité à tout moment. Toute modification sera publiée sur cette page avec une date de mise à jour révisée. Nous vous encourageons à consulter périodiquement cette politique pour rester informé de la manière dont nous protégeons vos informations. L'utilisation continue du Service après la publication de modifications constitue votre acceptation de la politique mise à jour. En cas de changements significatifs, nous ferons de notre mieux pour vous en informer via le Service.`
    }
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
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <Logo size="sm" />
        </div>
        <div className="w-20" />
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Politique de Confidentialité</h1>
          <p className="text-muted-foreground text-sm">Dernière mise à jour : Juin 2026</p>
        </div>

        {/* Key Points */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
            <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground/90">Aucune donnée personnelle collectée</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
            <Server className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground/90">Stockage local uniquement</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
            <Eye className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground/90">Aucun tracking tiers</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/50 overflow-hidden transition-all duration-200 hover:border-border"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-card/50 transition-colors"
              >
                <section.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <h2 className="text-sm font-semibold text-foreground/90 flex-1">{section.title}</h2>
                <svg
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                    expandedSection === index && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                expandedSection === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}>
                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed pl-12">
                  {section.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-12 p-6 rounded-xl bg-card border border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            Des questions sur la confidentialité ?{' '}
            <Link href="/about" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Contactez-nous
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
