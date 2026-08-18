'use client';

import { useState, useEffect } from 'react';
import { ProfileType } from '@/contexts/ProfileContext';

// Profile image mapping — shared across navbar, sidebar, bottom nav, etc.
export const PROFILE_IMAGES: Record<ProfileType, string> = {
  JEUNESSE: '/profiles/jeunesse.png',
  FRENESIE: '/profiles/frenesie.png',
  NOCTURNE: '/profiles/nocturne.png',
};

// Official logos list — must match profiles/page.tsx OFFICIAL_LOGOS
const OFFICIAL_LOGO_MAP: Record<string, string> = {
  'netplus-gold': '/logos/gold.png',
  'netplus-fire': '/logos/fire.png',
  'netplus-ocean': '/logos/ocean.png',
  'netplus-forest': '/logos/forest.png',
  'netplus-night': '/logos/night.png',
  'netplus-sunset': '/logos/sunset.png',
  'netplus-ice': '/logos/ice.png',
  'netplus-royal': '/logos/royal.png',
  'netplus-emerald': '/logos/emerald.png',
  'netplus-ruby': '/logos/ruby.png',
  'netplus-amber': '/logos/amber.png',
  'netplus-violet': '/logos/violet.png',
  'netplus-copper': '/logos/copper.png',
  'netplus-silver': '/logos/silver.png',
  'netplus-platinum': '/logos/platinum.png',
  'netplus-crimson': '/logos/crimson.png',
  'netplus-teal': '/logos/teal.png',
  'netplus-rose': '/logos/rose.png',
  'netplus-indigo': '/logos/indigo.png',
  'netplus-graphite': '/logos/graphite.png',
};

// Small avatar component for sidebar/header reuse
export function SmallProfileAvatar({ type, className }: { type: ProfileType; className?: string }) {
  const imgSrc = PROFILE_IMAGES[type];
  return (
    <div className={`relative overflow-hidden rounded-lg ${className || 'w-7 h-7'}`}>
      <img src={imgSrc} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

/**
 * ProfileLogo — Resolves the correct logo to display based on priority:
 * 1. Custom uploaded logo (netplus-custom-logo in localStorage)
 * 2. Official logo (netplus-official-logo in localStorage)
 * 3. Profile type default avatar
 * Falls back to children or default gradient if no profile.
 */
export function ProfileLogo({ 
  profileType, 
  className,
  fallback,
}: { 
  profileType?: ProfileType; 
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    // Priority: custom logo > official logo > profile type default
    const customLogo = localStorage.getItem('netplus-custom-logo');
    if (customLogo) {
      setLogoSrc(customLogo);
      return;
    }
    const officialLogoId = localStorage.getItem('netplus-official-logo');
    if (officialLogoId && OFFICIAL_LOGO_MAP[officialLogoId]) {
      setLogoSrc(OFFICIAL_LOGO_MAP[officialLogoId]);
      return;
    }
    // No custom/official logo — use profile type default
    if (profileType) {
      setLogoSrc(PROFILE_IMAGES[profileType]);
    } else {
      setLogoSrc(null);
    }
  }, [profileType]);

  if (!logoSrc && !fallback) {
    return null;
  }

  if (!logoSrc) {
    return <>{fallback}</>;
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className || 'w-8 h-8'}`}>
      <img src={logoSrc} alt="Profil" className="w-full h-full object-cover" />
    </div>
  );
}
