'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, Zap, Clock, Film, Tv, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/contexts/ProfileContext';
import { useChallenge } from '@/contexts/ChallengeContext';
import { useWatchHistory } from '@/contexts/WatchHistoryContext';
import { SmallProfileAvatar, ProfileLogo } from '@/components/ui/ProfileAvatar';
import { useState, useEffect } from 'react';

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
  const { isPremium } = useChallenge();
  const { history } = useWatchHistory();
  const [mounted, setMounted] = useState(false);
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Hide on certain pages
  const hiddenPaths = ['/login', '/profiles', '/watch', '/shorts'];
  if (hiddenPaths.some(p => pathname.startsWith(p))) return null;

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom pointer-events-none">
      <div className="flex justify-center px-4 sm:px-6 pb-2 pointer-events-auto">
        <div className={cn(
          "flex items-center justify-around h-[56px] sm:h-[60px] w-full max-w-[400px] sm:max-w-[420px]",
          "rounded-2xl sm:rounded-[22px]",
          // Glass morphism background
          "bg-[#0a0a0f]/85 backdrop-blur-2xl",
          // Premium border glow
          isPremium
            ? "border border-primary/20 shadow-[0_4px_32px_rgba(234,179,8,0.08),0_0_0_1px_rgba(234,179,8,0.06)]"
            : "border border-white/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.6)]",
          // Subtle inner glow
          "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-white/[0.01] before:to-transparent before:pointer-events-none",
          "relative overflow-hidden"
        )}>
          {/* Premium shimmer effect */}
          {isPremium && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-r from-transparent via-primary/[0.03] to-transparent animate-[shimmer_6s_linear_infinite]" />
            </div>
          )}

          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const isPressed = pressedItem === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onPointerDown={() => setPressedItem(item.href)}
                onPointerUp={() => setPressedItem(null)}
                onPointerLeave={() => setPressedItem(null)}
                className={cn(
                  'flex flex-col items-center justify-center gap-[2px] flex-1 h-full relative transition-all duration-200',
                  active ? 'text-primary' : 'text-white/25 hover:text-white/50',
                  isPressed && 'scale-90'
                )}
              >
                {/* Active background glow */}
                {active && (
                  <div className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl transition-all duration-300",
                    isPremium
                      ? "bg-primary/10 w-10 h-8"
                      : "bg-primary/8 w-9 h-7"
                  )} />
                )}

                {/* Icon */}
                <div className="relative z-10">
                  {item.Icon ? (
                    <item.Icon
                      className={cn(
                        'transition-all duration-200',
                        active ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]',
                        active && isPremium && 'drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]'
                      )}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                  ) : (
                    <div className={cn(
                      'overflow-hidden rounded-md transition-all',
                      active ? 'w-[22px] h-[22px] ring-[1.5px] ring-primary' : 'w-[18px] h-[18px]'
                    )}>
                      <ProfileLogo
                        profileType={profile?.type}
                        className="w-full h-full"
                        fallback={<Clock className="w-[18px] h-[18px]" />}
                      />
                    </div>
                  )}

                  {/* Active dot indicator */}
                  {active && (
                    <div className={cn(
                      "absolute -bottom-[5px] left-1/2 -translate-x-1/2 rounded-full",
                      isPremium ? "w-1 h-1 bg-primary shadow-[0_0_4px_rgba(234,179,8,0.6)]" : "w-1 h-1 bg-primary"
                    )} />
                  )}
                </div>

                {/* Label */}
                <span className={cn(
                  'text-[9px] leading-none transition-all duration-200 relative z-10',
                  active ? 'font-semibold text-primary' : 'font-normal text-white/25'
                )}>
                  {item.label}
                </span>

                {/* History count badge */}
                {item.href === '/history' && history.length > 0 && !active && (
                  <div className="absolute top-1.5 right-1/2 translate-x-3 min-w-[14px] h-[14px] rounded-full bg-primary/80 text-[7px] text-black font-bold flex items-center justify-center px-0.5">
                    {history.length > 9 ? '9+' : history.length}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
