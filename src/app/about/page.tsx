'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft, Code2, Layers, Sparkles, Palette, Rocket, Cpu, Heart, Zap, Globe, Mail, Send } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

// Bilingual text pairs: [French, English]
const bilingualContent = [
  {
    fr: "Aeronlabs, alias Mohamed A, est un développeur architecte modulaire passionné.",
    en: "Aeronlabs, alias Mohamed A, is a passionate modular architect developer."
  },
  {
    fr: "Solo builder, il construit des expériences numériques avec l'aide de son IAgen.",
    en: "Solo builder, he crafts digital experiences with the help of his IAgen."
  },
  {
    fr: "Il aime tout ce qui touche à la création de produit, du concept au déploiement.",
    en: "He loves everything related to product creation, from concept to deployment."
  },
  {
    fr: "Motion design, interfaces immersives, architectures scalables — c'est son terrain de jeu.",
    en: "Motion design, immersive interfaces, scalable architectures — that's his playground."
  },
  {
    fr: "Chaque projet est une opportunité de repousser les limites du possible.",
    en: "Every project is an opportunity to push the boundaries of what's possible."
  },
  {
    fr: "Avec IAgen, l'IA devient un partenaire créatif, pas un simple outil.",
    en: "With IAgen, AI becomes a creative partner, not just a simple tool."
  }
];

const skills = [
  { icon: Code2, label: 'Architecture Modulaire', color: 'text-blue-400' },
  { icon: Layers, label: 'Design Système', color: 'text-purple-400' },
  { icon: Sparkles, label: 'IAgen Integration', color: 'text-primary' },
  { icon: Palette, label: 'Motion Design', color: 'text-pink-400' },
  { icon: Rocket, label: 'Product Launch', color: 'text-orange-400' },
  { icon: Cpu, label: 'Full-Stack Dev', color: 'text-green-400' },
];

function TranslationLine({ fr, en, index, activeLine }: { fr: string; en: string; index: number; activeLine: number }) {
  const [phase, setPhase] = useState<'fr' | 'transition' | 'en'>('fr');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (index <= activeLine) {
      const showTimer = setTimeout(() => setVisible(true), index * 200);
      return () => clearTimeout(showTimer);
    }
  }, [activeLine, index]);

  useEffect(() => {
    if (index === activeLine && visible) {
      const t1 = setTimeout(() => setPhase('transition'), 2000);
      const t2 = setTimeout(() => setPhase('en'), 2500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [index, activeLine, visible]);

  if (!visible) return null;

  return (
    <div className="overflow-hidden">
      <div
        className={`transition-all duration-500 ${
          phase === 'fr'
            ? 'opacity-100 translate-y-0'
            : phase === 'transition'
            ? 'opacity-0 -translate-y-2'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <p className={`text-sm sm:text-base leading-relaxed ${
          phase === 'en' ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {phase === 'en' ? en : fr}
        </p>
      </div>
      {phase === 'en' && (
        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary/60 bg-primary/5 rounded">
          EN
        </span>
      )}
    </div>
  );
}

function ContactCard() {
  const [hovered, setHovered] = useState(false);
  const [typed, setTyped] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [sent, setSent] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Reveal on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Typing animation
  useEffect(() => {
    if (!visible) return;
    const email = 'aeronscriptlabs@gmail.com';
    let i = 0;
    const timer = setInterval(() => {
      if (i <= email.length) {
        setTyped(email.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
        setTimeout(() => setShowEnvelope(true), 300);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [visible]);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    setSent(true);
    setTimeout(() => setSent(false), 2000);
    window.location.href = 'mailto:aeronscriptlabs@gmail.com';
  };

  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      {/* Terminal-style header */}
      <div className="rounded-2xl overflow-hidden border border-border/60 shadow-xl shadow-black/20">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-card/80 border-b border-border/40">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-[10px] text-muted-foreground/50 font-mono ml-2 tracking-wider">contact.sh</span>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-card/40 via-background to-card/30 space-y-4">
          {/* Command lines */}
          <div className="font-mono text-xs sm:text-sm space-y-1.5">
            <p className="text-muted-foreground/60">
              <span className="text-green-400/80">$</span> <span className="text-muted-foreground/40">echo "Envie de collaborer ?"</span>
            </p>
            <p className={`transition-all duration-500 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}>
              <span className="text-primary/70 font-semibold">{"› "}</span>
              <span className="text-foreground/80 italic">"Let's build something together."</span>
            </p>
          </div>

          {/* Email typing area */}
          <div className="rounded-xl bg-black/40 border border-border/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40 uppercase tracking-widest font-mono">
              <Mail className="w-3 h-3" />
              <span>destinataire</span>
            </div>
            <div className="font-mono text-sm sm:text-base text-primary/90 min-h-[1.5em]">
              <span>{typed}</span>
              <span className={`inline-block w-[2px] h-[1.1em] bg-primary/80 align-middle ml-0.5 transition-opacity duration-100 ${cursorVisible && !typed.endsWith('m') ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>

          {/* Send button */}
          <div className={`flex items-center justify-between transition-all duration-500 ${showEnvelope ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
            <p className="text-[11px] text-muted-foreground/50 font-mono">
              <span className="text-green-400/60">$</span> ready to send
            </p>
            <button
              onClick={handleClick}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-black text-sm font-bold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.03] active:scale-95 group"
            >
              <span className="relative z-10 flex items-center gap-2">
                {sent ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Envoyé !</span>
                  </>
                ) : (
                  <>
                    <Send className={`w-4 h-4 transition-transform duration-300 ${hovered ? 'translate-x-0.5 -translate-y-0.5' : ''}`} />
                    <span>Écrire</span>
                  </>
                )}
              </span>
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const [activeLine, setActiveLine] = useState(-1);
  const [animationStarted, setAnimationStarted] = useState(false);

  const startAnimation = useCallback(() => {
    if (animationStarted) return;
    setAnimationStarted(true);
    setActiveLine(0);

    const interval = setInterval(() => {
      setActiveLine(prev => {
        if (prev >= bilingualContent.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [animationStarted]);

  useEffect(() => {
    const timer = setTimeout(startAnimation, 800);
    return () => clearTimeout(timer);
  }, [startAnimation]);

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

      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-600/20 border border-primary/20 mb-6 relative">
            <span className="text-3xl font-black text-gradient-gold">A</span>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="w-3 h-3 text-black" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-2">
            <span className="text-gradient-gold">Aeronlabs</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-1">alias Mohamed A</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
            <span className="text-xs text-primary/80 font-semibold uppercase tracking-[0.2em]">Modular Architect</span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
        </div>

        {/* Translation Animation Section */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Auto-Translation FR → EN</h2>
          </div>
          <div className="p-6 sm:p-8 rounded-2xl bg-card/50 border border-border/50 space-y-4 relative overflow-hidden">
            {/* Subtle background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent pointer-events-none" />

            <div className="relative space-y-4">
              {bilingualContent.map((item, index) => (
                <TranslationLine
                  key={index}
                  fr={item.fr}
                  en={item.en}
                  index={index}
                  activeLine={activeLine}
                />
              ))}
            </div>

            {/* Progress indicator */}
            <div className="relative flex items-center gap-2 mt-6 pt-4 border-t border-border/30">
              <div className="flex gap-1">
                {bilingualContent.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      i <= activeLine ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground/50 ml-auto">
                {activeLine >= bilingualContent.length - 1 ? 'Translation complete' : 'Translating...'}
              </span>
            </div>
          </div>
        </div>

        {/* Skills Grid */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Compétences</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {skills.map((skill) => (
              <div
                key={skill.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/50 hover:border-primary/20 hover:bg-primary/5 transition-all duration-200 group"
              >
                <skill.icon className={`w-4 h-4 ${skill.color} group-hover:scale-110 transition-transform`} />
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{skill.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* IAgen Section */}
        <div className="mb-16">
          <div className="p-6 sm:p-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-amber-600/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">IAgen</h3>
                  <p className="text-xs text-primary/60">AI Creative Partner</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                IAgen is not just an AI tool — it's a creative partner that collaborates with Aeronlabs to build, design, and iterate on projects. From generating code to brainstorming architectures, IAgen accelerates the creative process while preserving the human touch that makes each project unique.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Together, Aeronlabs and IAgen represent the future of solo development: one vision, amplified by artificial intelligence. Every line of code, every pixel, every interaction is crafted with intention and precision.
              </p>
            </div>
          </div>
        </div>

        {/* Philosophy */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <Heart className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Philosophy</h2>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4 items-start p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Rocket className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Build First, Perfect Later</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Ship fast, iterate faster. Every product starts as an idea that becomes reality through relentless execution and continuous improvement.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Modular by Design</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Every system should be composed of independent, interchangeable modules. This approach enables flexibility, scalability, and maintainability across all projects.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">AI as Creative Partner</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">IAgen represents the synergy between human creativity and artificial intelligence. Together, they achieve what neither could alone — faster iteration, deeper exploration, and more innovative solutions.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact — Let's Talk */}
        <div className="mb-16">
          <ContactCard />
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/30 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Built with <Heart className="w-3 h-3 inline text-primary" /> by <span className="text-primary font-semibold">Aeronlabs</span> + <span className="text-primary/80 font-semibold">IAgen</span>
          </p>
          <p className="text-xs text-muted-foreground/50">© 2026 Netplus</p>
        </div>
      </div>
    </div>
  );
}
