'use client';

import { useState, useEffect } from 'react';
import { Palette, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useDynamicTheme } from '@/contexts/ThemeContext';

interface DynamicThemeToggleProps {
  className?: string;
  variant?: 'default' | 'compact' | 'pill';
}

export function DynamicThemeToggle({ className, variant = 'default' }: DynamicThemeToggleProps) {
  const [isActive, setIsActive] = useState(false);
  const { currentColors } = useDynamicTheme();

  useEffect(() => {
    const saved = localStorage.getItem('netplus-dynamic-theme');
    if (saved === 'true') setIsActive(true);
  }, []);

  const handleToggle = (value: boolean) => {
    setIsActive(value);
    localStorage.setItem('netplus-dynamic-theme', String(value));
    window.dispatchEvent(new CustomEvent('dynamicThemeChange', { detail: { active: value } }));
  };

  // Compact pill — for inline use in headers/menus
  if (variant === 'pill') {
    return (
      <button
        onClick={() => handleToggle(!isActive)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer',
          isActive
            ? 'bg-primary/15 border-primary/30 text-primary'
            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8 hover:text-white/80',
          className
        )}
      >
        <Palette className="w-3.5 h-3.5" />
        <span>{isActive ? 'Thème auto' : 'Thème auto'}</span>
        {isActive && currentColors && (
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
      <div className={cn('flex items-center gap-2', className)}>
        <Palette className="w-3.5 h-3.5 text-primary" />
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    );
  }

  // Default full-width card
  return (
    <button
      className={cn(
        'w-full p-4 rounded-xl transition-all cursor-pointer border',
        isActive
          ? 'bg-primary/10 border-primary/30'
          : 'bg-white/5 border-white/10 hover:bg-white/8',
        className
      )}
      onClick={() => handleToggle(!isActive)}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-all',
          isActive ? 'bg-primary/20' : 'bg-white/5'
        )}>
          {isActive && currentColors ? (
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
              isActive ? 'text-primary' : 'text-white/80'
            )}>
              {isActive ? 'Thème Adaptatif' : 'Thème Dynamique'}
            </span>
            {isActive && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                <Sparkles className="w-2.5 h-2.5" />
                Actif
              </span>
            )}
          </div>
          <span className="text-xs text-white/50">
            {isActive
              ? currentColors
                ? `Couleurs extraites du contenu`
                : 'Les couleurs s\'adaptent au contenu visionné'
              : 'Les couleurs s\'adaptent aux films et séries'}
          </span>
        </div>

        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-primary pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </button>
  );
}
