'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useChallenge } from '@/contexts/ChallengeContext';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

function ConfettiEffect() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number; size: number }>>([]);

  useEffect(() => {
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF4500', '#FFD700', '#DAA520'];
    const p = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      size: 4 + Math.random() * 8,
    }));
    setParticles(p);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function PricingPage() {
  const {
    hasChattedWithAI,
    hasWatchedContent,
    hasScrolledEnough,
    chatMessageCount,
    watchSeconds,
    scrollCount,
    isPremium,
    watchCount,
    BASIC_LIMIT,
    getProgress,
    resetChallenges,
  } = useChallenge();

  const [showConfetti, setShowConfetti] = useState(false);
  const progress = getProgress();

  useEffect(() => {
    if (isPremium && !showConfetti) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isPremium, showConfetti]);

  const tasks = [
    {
      id: 1,
      title: 'Parler avec Maître Netplus',
      description: 'Lancez une conversation avec notre assistant IA cinématographique. Posez-lui une question, demandez une recommandation ou dites simplement bonjour !',
      icon: '🤖',
      completed: hasChattedWithAI,
      progress: chatMessageCount,
      target: 1,
      actionText: 'Discuter avec l\'assistant',
      actionHref: '/',
      hint: 'Cliquez sur le bouton Assistant IA (étoile) dans la barre latérale ou le menu',
    },
    {
      id: 2,
      title: 'Regarder un contenu quelques secondes',
      description: 'Regardez n\'importe quel film ou série pendant au moins 5 secondes. C\'est tout ! Laissez simplement la vidéo se lancer et profitez.',
      icon: '🎬',
      completed: hasWatchedContent,
      progress: Math.min(watchSeconds, 5),
      target: 5,
      progressLabel: 'sec',
      actionText: 'Regarder un contenu',
      actionHref: '/',
      hint: 'Cliquez sur n\'importe quel film/série puis appuyez sur "Regarder"',
    },
    {
      id: 3,
      title: 'Scroller 5 fois sur l\'accueil',
      description: 'Faites défiler la page d\'accueil 5 fois pour explorer notre catalogue. Découvrez de nouveaux films et séries en scrollant !',
      icon: '📱',
      completed: hasScrolledEnough,
      progress: Math.min(scrollCount, 5),
      target: 5,
      actionText: 'Aller à l\'accueil',
      actionHref: '/',
      hint: 'Scrollez vers le bas sur la page d\'accueil, chaque scroll compte !',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {showConfetti && <ConfettiEffect />}

      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-6 sm:pt-12 sm:pb-8">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour à l&apos;accueil
          </Link>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <SparkleIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">100% Gratuit</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-3">
              NetPlus <span className="text-primary">Premium</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Tout est absolument gratuit sur NetPlus ! Accomplissez ces 3 tâches simples pour débloquer l&apos;accès illimité. Sans ça, vous êtes limité à {BASIC_LIMIT} contenus.
            </p>
          </div>
        </div>
      </div>

      {/* Premium Status Banner */}
      <div className="max-w-4xl mx-auto px-4 mb-6 sm:mb-8">
        {isPremium ? (
          <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/20 via-amber-500/20 to-primary/20 border border-primary/30 p-4 sm:p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/20">
                <CrownIcon className="w-6 h-6 sm:w-7 sm:h-7 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-primary">Accès Premium Illimité !</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Vous avez accompli tous les défis. Profitez de tout le catalogue sans aucune limite !
                </p>
              </div>
              <div className="flex-shrink-0 hidden sm:flex items-center gap-1 px-4 py-2 rounded-lg bg-primary/20">
                <SparkleIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">VIP</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/10 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Progression</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                  {progress}/3
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {watchCount}/{BASIC_LIMIT} contenus vus (version basique)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-700 ease-out"
                style={{ width: `${(progress / 3) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {progress === 0 && 'Commencez par le premier défi pour débloquer l\'accès illimité !'}
              {progress === 1 && 'Bien joué ! Encore 2 défis pour l\'accès illimité.'}
              {progress === 2 && 'Presque ! Plus qu\'un défi et c\'est l\'accès total !'}
            </p>
          </div>
        )}
      </div>

      {/* Challenge Cards */}
      <div className="max-w-4xl mx-auto px-4 pb-8 sm:pb-12">
        <div className="grid gap-4 sm:gap-6">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={`relative overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-500 ${
                task.completed
                  ? 'bg-primary/5 border-primary/30 shadow-lg shadow-primary/5'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              {/* Completed shine effect */}
              {task.completed && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
              )}

              <div className="relative p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Step number / check */}
                  <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl transition-all duration-500 ${
                    task.completed
                      ? 'bg-gradient-to-br from-primary to-amber-500 shadow-md shadow-primary/20'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    {task.completed ? (
                      <CheckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                    ) : (
                      <span className="font-bold text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg sm:text-xl">{task.icon}</span>
                      <h3 className={`text-base sm:text-lg font-bold ${task.completed ? 'text-primary' : 'text-foreground'}`}>
                        {task.title}
                      </h3>
                      {task.completed && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] sm:text-xs font-bold">
                          Complété
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3">
                      {task.description}
                    </p>

                    {/* Progress bar for incomplete tasks */}
                    {!task.completed && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            Progression
                          </span>
                          <span className="text-[10px] sm:text-xs font-semibold text-primary">
                            {task.progress}/{task.target} {task.progressLabel || ''}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-500"
                            style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Hint */}
                    {!task.completed && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                        <svg className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[10px] sm:text-xs text-primary/80">{task.hint}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Section */}
        <div className="mt-8 sm:mt-12">
          <h2 className="text-xl sm:text-2xl font-black text-center text-foreground mb-6 sm:mb-8">
            Comparez les offres
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Basic Plan */}
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground mb-1">Basique</h3>
                <p className="text-xs text-muted-foreground">Accès limité sans compléter les défis</p>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-foreground mb-4">
                Gratuit<span className="text-sm font-normal text-muted-foreground"></span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{BASIC_LIMIT} contenus gratuits</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">Accès au catalogue</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">Assistant Maître Netplus</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-red-400/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-muted-foreground/50">Accès illimité bloqué</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-red-400/50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-muted-foreground/50">Badge VIP</span>
                </li>
              </ul>
              <div className="px-4 py-2.5 rounded-lg bg-white/5 text-center">
                <span className="text-sm text-muted-foreground">Votre plan actuel</span>
              </div>
            </div>

            {/* Premium Plan */}
            <div className={`relative rounded-xl sm:rounded-2xl border p-5 sm:p-6 transition-all duration-500 ${
              isPremium
                ? 'border-primary/50 bg-primary/5 shadow-xl shadow-primary/10'
                : 'border-primary/30 bg-gradient-to-b from-primary/10 to-transparent'
            }`}>
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-amber-500 text-[10px] sm:text-xs font-bold text-black">
                Recommandé
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <CrownIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-primary">Premium</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Accès illimité - 3 défis simples</p>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-primary mb-1">
                Gratuit<span className="text-sm font-normal text-primary/60"></span>
              </div>
              <p className="text-[10px] sm:text-xs text-primary/60 mb-4">3 tâches rapides = accès total</p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">Contenus illimités</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">Tout le catalogue</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">Assistant Maître Netplus</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">5 serveurs de streaming</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">Badge VIP</span>
                </li>
              </ul>
              {isPremium ? (
                <div className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-amber-500 text-center">
                  <span className="text-sm font-bold text-black">Accès débloqué !</span>
                </div>
              ) : (
                <Link
                  href="/"
                  className="block px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-center transition-colors"
                >
                  <span className="text-sm font-bold text-black">Commencer les défis</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 sm:mt-12 max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-center text-foreground mb-4 sm:mb-6">
            Questions fréquentes
          </h2>
          <div className="space-y-3">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <h4 className="font-semibold text-sm text-foreground mb-1">Est-ce vraiment gratuit ?</h4>
              <p className="text-xs text-muted-foreground">Oui, à 100% ! NetPlus est entièrement gratuit. Les 3 défis sont juste une façon fun de découvrir la plateforme. Aucune carte bancaire, aucun abonnement.</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <h4 className="font-semibold text-sm text-foreground mb-1">Que se passe-t-il après 10 contenus en version basique ?</h4>
              <p className="text-xs text-muted-foreground">Vous ne pourrez plus lancer de nouveaux contenus. Mais vous pouvez compléter les défis à tout moment pour débloquer l&apos;accès illimité immédiatement.</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <h4 className="font-semibold text-sm text-foreground mb-1">Les défis sont-ils difficiles ?</h4>
              <p className="text-xs text-muted-foreground">Pas du tout ! Il suffit de parler à l&apos;assistant, regarder quelques secondes de contenu, et scroller sur l&apos;accueil. Ça prend moins de 2 minutes !</p>
            </div>
          </div>
        </div>

        {/* Debug Reset */}
        <div className="mt-8 text-center">
          <button
            onClick={resetChallenges}
            className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
          >
            Réinitialiser les défis (debug)
          </button>
        </div>
      </div>
    </div>
  );
}
