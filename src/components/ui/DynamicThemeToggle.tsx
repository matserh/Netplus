'use client';

import { useState, useEffect } from 'react';
import { Palette, Sparkles, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useDynamicTheme } from '@/contexts/ThemeContext';
import { useSession } from '@/contexts/AuthContext';

interface DynamicThemeToggleProps {
  className?: string;
  variant?: 'default' | 'compact' | 'pill';
}

export function DynamicThemeToggle({ className, variant = 'default' }: DynamicThemeToggleProps) {
  const [isActive, setIsActive] = useState(false);
  const { currentColors } = useDynamicTheme();
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    const saved = localStorage.getItem('netplus-dynamic-theme');
    if (saved === 'true') setIsActive(true);
  }, []);

  const handleToggle = (value: boolean) => {
    if (!isAuthenticated) return;
    setIsActive(value);
    localStorage.setItem('netplus-dynamic-theme', String(value));
    window.dispatchEvent(new CustomEvent('dynamicThemeChange', { detail: { active: value } }));
  };

  // Compact pill — for inline use in headers/menus
  if (variant === 'pill') {
    return (
      <button
        onClick={() => handleToggle(!isActive)}
        disabled={!isAuthenticated}
        title={!isAuthenticated ? 'Connectez-vous pour activer le thème dynamique' : undefined}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer',
          !isAuthenticated
            ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/10 text-white/30'
            : isActive
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8 hover:text-white/80',
          className
        )}
      >
        {!isAuthenticated ? <Lock className="w-3.5 h-3.5" /> : <Palette className="w-3.5 h-3.5" />}
        <span>{isActive ? 'Thème auto' : 'Thème auto'}</span>
        {isActive && currentColors && isAuthenticated && (
          <span
            className="w-3 h-3 rounded-full ring-1 ring-white/20"
            style={{ backgroundColor: currentColors.primary }}
          />
        )}
      </button>
    );
  }

  // Compact — for tight spaces
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', !isAuthenticated && 'opacity-40', className)}>
        {!isAuthenticated ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Palette className="w-3.5 h-3.5 text-primary" />}
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={!isAuthenticated}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    );
  }

  // Default full-width card
  return (
    <button
      disabled={!isAuthenticated}
      title={!isAuthenticated ? 'Connectez-vous pour activer le thème dynamique' : undefined}
      className={cn(
        'w-full p-4 rounded-xl transition-all border',
        !isAuthenticated
          ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/10'
          : isActive
            ? 'bg-primary/10 border-primary/30 cursor-pointer'
            : 'bg-white/5 border-white/10 hover:bg-white/8 cursor-pointer',
        className
      )}
      onClick={() => handleToggle(!isActive)}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-all',
          !isAuthenticated ? 'bg-white/5' : isActive ? 'bg-primary/20' : 'bg-white/5'
        )}>
          {!isAuthenticated ? (
            <Lock className="w-5 h-5 text-white/30" />
          ) : isActive && currentColors ? (
            <span
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: currentColors.primary }}
            />
          ) : (
            <Palette className={cn(
              'w-5 h-5 transition-colors',
              isActive ? 'text-primary' : 'text-white/60'
            )} />
          )}
        </div>

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-medium transition-colors',
              !isAuthenticated ? 'text-white/30' : isActive ? 'text-primary' : 'text-white/80'
            )}>
              {isActive ? 'Thème Adaptatif' : 'Thème Dynamique'}
            </span>
            {isActive && isAuthenticated && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                <Sparkles className="w-2.5 h-2.5" />
                Actif
              </span>
            )}
          </div>
          <span className="text-xs text-white/50">
            {!isAuthenticated
              ? 'Connectez-vous pour débloquer'
              : isActive
                ? currentColors
                  ? `Couleurs extraites du contenu`
                  : 'Les couleurs s\'adaptent au contenu visionné'
                : 'Les couleurs s\'adaptent aux films et séries'}
          </span>
        </div>

        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          disabled={!isAuthenticated}
          className="data-[state=checked]:bg-primary pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </button>
  );
}
