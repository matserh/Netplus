'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Info, Sparkles, Film, Check } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'welcome' | 'update' | 'recommendation' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Bienvenue sur NetPlus !',
    message: 'Explorez des milliers de films et séries adaptés à votre profil.',
    time: 'Maintenant',
    read: false,
  },
  {
    id: 'ai-assistant',
    type: 'update',
    title: 'Maître NetPlus disponible',
    message: 'Votre assistant IA peut vous recommander des contenus personnalisés.',
    time: 'Récent',
    read: false,
  },
  {
    id: 'profiles',
    type: 'system',
    title: 'Profils personnalisés',
    message: 'Choisissez un profil pour filtrer le contenu selon vos préférences.',
    time: 'Info',
    read: false,
  },
];

const STORAGE_KEY = 'netplus-notifications';

function getNotifications(): Notification[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults — add any new default notifications
      const existingIds = new Set(parsed.map((n: Notification) => n.id));
      const merged = [...parsed];
      for (const def of DEFAULT_NOTIFICATIONS) {
        if (!existingIds.has(def.id)) {
          merged.unshift(def);
        }
      }
      return merged;
    }
  } catch {}
  return DEFAULT_NOTIFICATIONS;
}

function saveNotifications(notifications: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  welcome: <Sparkles className="w-4 h-4 text-amber-400" />,
  update: <Info className="w-4 h-4 text-blue-400" />,
  recommendation: <Film className="w-4 h-4 text-emerald-400" />,
  system: <Info className="w-4 h-4 text-violet-400" />,
};

const TYPE_BG: Record<string, string> = {
  welcome: 'bg-amber-500/10',
  update: 'bg-blue-500/10',
  recommendation: 'bg-emerald-500/10',
  system: 'bg-violet-500/10',
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(getNotifications());
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const dismissNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  if (!mounted) {
    return (
      <button className="h-8 w-8 rounded-full hover:bg-white/[0.06] flex items-center justify-center transition-colors relative">
        <Bell className="w-4 h-4 text-white/70" />
      </button>
    );
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 rounded-full hover:bg-white/[0.06] flex items-center justify-center transition-colors relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-white/80 hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-primary text-[8px] text-black font-bold flex items-center justify-center px-0.5 animate-scale-in">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-bold text-white">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/10 transition-all"
                >
                  <Check className="w-3 h-3" />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-white/50">
                <Bell className="w-6 h-6" />
                <p className="text-xs">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border/20 transition-colors ${
                    notif.read ? 'opacity-50' : 'hover:bg-muted/30'
                  }`}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_BG[notif.type] || 'bg-muted/30'}`}>
                    {TYPE_ICON[notif.type] || <Info className="w-4 h-4 text-white/60" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{notif.title}</p>
                    <p className="text-[10px] text-white/60 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[9px] text-white/40 mt-1">{notif.time}</p>
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={() => dismissNotification(notif.id)}
                    className="flex-shrink-0 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center transition-colors mt-0.5"
                  >
                    <X className="w-2.5 h-2.5 text-white/40 hover:text-white/70" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/30 bg-muted/10">
            <p className="text-[9px] text-white/40 text-center">
              Les alertes de mises à jour et recommandations apparaîtront ici
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
