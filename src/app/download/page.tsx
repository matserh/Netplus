'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    const link = document.createElement('a');
    link.href = '/NetPlus-Source.zip';
    link.download = 'NetPlus-Source.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-primary">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="text-xl font-black tracking-wider bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            NETPLUS
          </span>
        </Link>
        <Link
          href="/"
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          Retour au site
        </Link>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-4 pb-20 min-h-[calc(100vh-80px)]">
        <div className="max-w-lg w-full text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary via-amber-500 to-amber-700 flex items-center justify-center shadow-2xl shadow-primary/20">
              <span className="text-5xl font-black text-black">N</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
            <span className="text-white">NET</span>
            <span
              className="bg-clip-text text-transparent"
              style={{
                background: 'linear-gradient(135deg, #f0c14b 0%, #e5a00d 50%, #c78c00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              PLUS
            </span>
          </h1>

          <p className="text-white/40 text-sm mb-8 tracking-widest uppercase">
            Premium Cinema Streaming
          </p>

          {/* Download Card */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 sm:p-8 mb-6 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3 mb-4">
              <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>

            <h2 className="text-lg font-bold mb-1">Code Source Complet</h2>
            <p className="text-white/40 text-sm mb-6">
              Next.js 16 + TypeScript + Tailwind CSS 4 + Prisma + NextAuth
            </p>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-amber-500 text-black font-bold text-base hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {downloading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Téléchargement en cours...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Télécharger NetPlus-Source.zip
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="text-left bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Ce qui est inclus
            </h3>
            <ul className="text-xs text-white/40 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Code source complet (src/, components, pages, API routes)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Configuration Prisma + base de données SQLite
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Authentification NextAuth.js (credentials + Google)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Lecteur vidéo avec fallback automatique (6 serveurs)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Assistant IA Maître Netplus (z-ai-web-dev-sdk)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Système de profils (Jeunesse, Frénésie, Nocturne)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Shorts, sous-titres, système premium
              </li>
            </ul>
          </div>

          {/* Install instructions */}
          <div className="mt-6 text-left bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Installation rapide
            </h3>
            <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-white/50 space-y-1">
              <p><span className="text-primary">$</span> unzip NetPlus-Source.zip</p>
              <p><span className="text-primary">$</span> npm install</p>
              <p><span className="text-primary">$</span> npx prisma generate</p>
              <p><span className="text-primary">$</span> npm run dev</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-white/20 text-xs">
        Propulsé par NetPlus
      </footer>
    </div>
  );
}
