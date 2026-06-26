'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft, FileText } from 'lucide-react';
import { useState } from 'react';

export default function TermsPage() {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const sections = [
    {
      title: '1. Acceptation des conditions',
      content: `En accédant et en utilisant Netplus (le "Service"), vous acceptez d'être lié par les présentes Conditions d'Utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le Service. Netplus se réserve le droit de modifier ces conditions à tout moment. L'utilisation continue du Service après toute modification constitue votre acceptation des nouvelles conditions. Il est de votre responsabilité de consulter régulièrement ces conditions pour prendre connaissance des éventuelles modifications.`
    },
    {
      title: '2. Description du service',
      content: `Netplus est une plateforme de streaming gratuite qui permet aux utilisateurs de découvrir et de regarder des films et séries télévisées. Le Service propose un accès basique gratuit limité à 10 contenus et un accès premium gratuit offrant un accès illimité. L'accès premium peut être obtenu en complétant les défis proposés sur la page Premium. Le Service est fourni "en l'état" et "selon la disponibilité". Nous ne garantissons pas que le Service sera ininterrompu, opportun, sécurisé ou exempt d'erreur.`
    },
    {
      title: '3. Inscription et compte',
      content: `L'utilisation du Service ne nécessite pas de création de compte. Votre progression et vos préférences sont stockées localement sur votre appareil via les mécanismes de stockage du navigateur. Vous êtes responsable de la sécurité de votre appareil et de l'accès à vos données stockées localement. La suppression des données de navigation ou du stockage local peut entraîner la perte de votre progression, y compris votre statut premium. Netplus ne peut pas être tenu responsable de la perte de données stockées localement.`
    },
    {
      title: '4. Contenu et propriété intellectuelle',
      content: `Le Service fournit des liens vers du contenu tiers hébergé par des fournisseurs externes. Netplus ne héberge pas, ne stocke pas et ne distribue pas de contenu protégé par le droit d'auteur. Les affiches, descriptions et métadonnées des films et séries sont obtenues via l'API TMDB (The Movie Database) conformément à leurs conditions d'utilisation. Les marques commerciales, logos et noms de marque affichés sur le Service appartiennent à leurs propriétaires respectifs. Toute reproduction non autorisée du contenu du Service est strictement interdite.`
    },
    {
      title: '5. Limitation de responsabilité',
      content: `Dans la mesure maximale permise par la loi applicable, Netplus et ses créateurs (Aeronlabs) ne pourront en aucun cas être tenus responsables de tout dommage indirect, incident, spécial, consécutif ou punitif, y compris, sans s'y limiter, la perte de profits, de données, d'utilisation ou de réputation, découlant de ou lié à votre utilisation du Service. Netplus ne garantit pas la disponibilité, l'exactitude ou la qualité du contenu tiers accessible via le Service. L'utilisation du Service se fait à vos propres risques.`
    },
    {
      title: '6. Conduite de l\'utilisateur',
      content: `En utilisant le Service, vous vous engagez à : ne pas utiliser le Service à des fins illégales ou non autorisées ; ne pas tenter d'accéder de manière non autorisée à des systèmes ou réseaux liés au Service ; ne pas interférer ou perturber le fonctionnement du Service ; ne pas utiliser de robots, scrapers ou autres moyens automatisés pour accéder au Service ; ne pas contourner les mesures de sécurité ou les limitations d'accès du Service ; ne pas utiliser le Service d'une manière qui pourrait endommager, désactiver ou surcharger les serveurs du Service.`
    },
    {
      title: '7. Disponibilité du service',
      content: `Netplus s'efforce de fournir un Service disponible 24 heures sur 24, 7 jours sur 7, mais ne garantit pas que le Service sera disponible à tout moment. Nous pouvons suspendre ou interrompre le Service pour maintenance, mises à jour ou autres raisons à tout moment, sans préavis. Les sources de contenu tierces peuvent être temporairement ou définitivement indisponibles, ce qui peut affecter la lecture de certains titres. Netplus ne peut pas garantir la disponibilité continue des sources de contenu tierces.`
    },
    {
      title: '8. Loi applicable',
      content: `Les présentes Conditions d'Utilisation sont régies et interprétées conformément aux lois applicables. Tout litige découlant de ou lié à ces conditions sera soumis à la compétence exclusive des tribunaux compétents. Si une disposition de ces conditions est jugée inapplicable ou invalide, cette disposition sera modifiée dans la mesure nécessaire pour la rendre applicable, et les autres dispositions resteront en pleine vigueur et effect.`
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
          <FileText className="w-4 h-4 text-primary" />
          <Logo size="sm" />
        </div>
        <div className="w-20" />
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Conditions d'Utilisation</h1>
          <p className="text-muted-foreground text-sm">Dernière mise à jour : Juin 2026</p>
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
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-card/50 transition-colors"
              >
                <h2 className="text-sm font-semibold text-foreground/90">{section.title}</h2>
                <svg
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-3",
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
                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-12 p-6 rounded-xl bg-card border border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            Des questions concernant ces conditions ?{' '}
            <Link href="/about" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Contactez-nous
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
