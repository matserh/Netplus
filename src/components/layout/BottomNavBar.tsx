'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/contexts/ProfileContext';
import { SmallProfileAvatar } from '@/app/profiles/page';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Accueil',
    Icon: Home,
  },
  {
    href: '/search',
    label: 'Recherche',
    Icon: Search,
  },
  {
    href: '/shorts',
    label: 'Shorts',
    Icon: Zap,
  },
  {
    href: '/history',
    label: 'Mon NetPlus',
    Icon: null, // Uses profile avatar instead
  },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const { profile } = useProfile();

  // Hide on certain pages
  const hiddenPaths = ['/login', '/profiles', '/watch', '/shorts'];
  if (hiddenPaths.some(p => pathname.startsWith(p))) return null;

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom pointer-events-none">
      <div className="flex justify-center px-6 pb-2 pointer-events-auto">
        <div className="flex items-center justify-around h-[52px] w-full max-w-[360px] rounded-2xl bg-[#12120f]/80 backdrop-blur-xl border border-white/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-[2px] flex-1 h-full relative transition-colors duration-200',
                  active ? 'text-primary' : 'text-white/30'
                )}
              >
                {item.Icon ? (
                  <item.Icon
                    className={cn('transition-all', active ? 'w-[21px] h-[21px]' : 'w-[18px] h-[18px]')}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                ) : (
                  <div className={cn(
                    'overflow-hidden rounded-md transition-all',
                    active ? 'w-[21px] h-[21px] ring-[1.5px] ring-primary' : 'w-[18px] h-[18px]'
                  )}>
                    {profile ? (
                      <SmallProfileAvatar type={profile.type} className="w-full h-full" />
                    ) : (
                      <Clock className="w-[18px] h-[18px]" />
                    )}
                  </div>
                )}
                <span className={cn(
                  'text-[9px] leading-none transition-all',
                  active ? 'font-semibold text-primary' : 'font-normal text-white/30'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
