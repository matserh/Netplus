'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, RefreshCw, SkipForward, Tv, Wifi, WifiOff, ChevronRight } from 'lucide-react';
import { API_CONFIG } from '@/types/media';
import { cn } from '@/lib/utils';

interface SmartVideoPlayerProps {
  /** Current video URL */
  src: string;
  /** Title for accessibility */
  title: string;
  /** Server index currently active */
  serverIndex: number;
  /** Total number of servers available */
  totalServers: number;
  /** Callback to switch to next server */
  onNextServer: () => void;
  /** Callback when user wants to retry current server */
  onRetry: () => void;
  /** Aspect ratio class — defaults to 16/9 */
  aspectClass?: string;
  /** Extra class names for the container */
  className?: string;
  /** If true, use compact error UI (for short mode) */
  compact?: boolean;
}

type PlayerState = 'loading' | 'ready' | 'error' | 'timeout';

interface ServerStatus {
  index: number;
  state: 'unknown' | 'loading' | 'working' | 'failed';
  lastChecked: number;
}

/**
 * SmartVideoPlayer — wraps an iframe with intelligent health detection.
 *
 * Detection strategy:
 * 1. Start a 15s timer after iframe loads its src
 * 2. If the iframe fires `load` event → state = ready (player loaded)
 * 3. If 15s pass without `load` → state = timeout (server likely down)
 * 4. If iframe fires `error` event → state = error
 * 5. On error/timeout, auto-attempts next available server
 * 6. Shows detailed error overlay with all server statuses
 * 7. Proposes alternative servers and content suggestions
 */
export function SmartVideoPlayer({
  src,
  title,
  serverIndex,
  totalServers,
  onNextServer,
  onRetry,
  aspectClass = 'aspect-video',
  className,
  compact = false,
}: SmartVideoPlayerProps) {
  const [state, setState] = useState<PlayerState>('loading');
  const [failedServers, setFailedServers] = useState<Set<number>>(new Set());
  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>([]);
  const [autoFallbackAttempted, setAutoFallbackAttempted] = useState(false);
  const [allServersFailed, setAllServersFailed] = useState(false);
  const [showServerList, setShowServerList] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize server statuses
  useEffect(() => {
    const statuses: ServerStatus[] = Array.from({ length: totalServers }, (_, i) => ({
      index: i,
      state: i === serverIndex ? 'loading' as const : 'unknown' as const,
      lastChecked: 0,
    }));
    setServerStatuses(statuses);
  }, [totalServers]);

  // Progress bar animation during loading
  useEffect(() => {
    if (state === 'loading') {
      setLoadProgress(0);
      progressTimerRef.current = setInterval(() => {
        setLoadProgress(prev => {
          if (prev >= 90) return prev; // Slow down near 90%, only 100% on actual load
          return prev + Math.random() * 8;
        });
      }, 500);
    } else {
      if (state === 'ready') setLoadProgress(100);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [state, src]);

  // Reset state when src changes (new server or new content)
  useEffect(() => {
    setState('loading');
    setAutoFallbackAttempted(false);
    setShowServerList(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    // Update server status for current server
    setServerStatuses(prev => prev.map(s => 
      s.index === serverIndex 
        ? { ...s, state: 'loading' as const, lastChecked: Date.now() }
        : s
    ));

    // Set timeout — if iframe doesn't load within 15s, assume server is down
    timerRef.current = setTimeout(() => {
      setState(prev => prev === 'loading' ? 'timeout' : prev);
      setFailedServers(prev => new Set(prev).add(serverIndex));
      setServerStatuses(prev => prev.map(s =>
        s.index === serverIndex
          ? { ...s, state: 'failed' as const, lastChecked: Date.now() }
          : s
      ));
    }, 15000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [src, serverIndex]);

  // Auto-fallback: when a server fails, automatically try the next one
  useEffect(() => {
    if ((state === 'error' || state === 'timeout') && !autoFallbackAttempted) {
      setAutoFallbackAttempted(true);
      
      // Check if all servers have failed
      const newFailed = new Set(failedServers);
      newFailed.add(serverIndex);
      
      if (newFailed.size >= totalServers) {
        setAllServersFailed(true);
        return;
      }

      // Auto-switch to next server after a brief delay
      const fallbackTimer = setTimeout(() => {
        onNextServer();
      }, 2000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [state, autoFallbackAttempted, failedServers, serverIndex, totalServers, onNextServer]);

  const handleLoad = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('ready');
    setFailedServers(prev => {
      const next = new Set(prev);
      next.delete(serverIndex);
      return next;
    });
    setServerStatuses(prev => prev.map(s =>
      s.index === serverIndex
        ? { ...s, state: 'working' as const, lastChecked: Date.now() }
        : s
    ));
  }, [serverIndex]);

  const handleError = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('error');
    setFailedServers(prev => new Set(prev).add(serverIndex));
    setServerStatuses(prev => prev.map(s =>
      s.index === serverIndex
        ? { ...s, state: 'failed' as const, lastChecked: Date.now() }
        : s
    ));
  }, [serverIndex]);

  const handleNextServer = () => {
    // Find next server that hasn't failed
    let next = (serverIndex + 1) % totalServers;
    let attempts = 0;
    while (failedServers.has(next) && attempts < totalServers) {
      next = (next + 1) % totalServers;
      attempts++;
    }
    onNextServer();
  };

  const handleRetry = () => {
    setState('loading');
    // Remove current server from failed list on retry
    setFailedServers(prev => {
      const next = new Set(prev);
      next.delete(serverIndex);
      return next;
    });
    setServerStatuses(prev => prev.map(s =>
      s.index === serverIndex
        ? { ...s, state: 'loading' as const, lastChecked: Date.now() }
        : s
    ));
    setAutoFallbackAttempted(false);
    onRetry();
  };

  const showOverlay = state === 'error' || state === 'timeout';
  const serverName = Object.values(API_CONFIG.videoServers)[serverIndex]?.name || `Serveur ${serverIndex + 1}`;
  const availableServers = totalServers - failedServers.size;
  const isAutoFallingBack = (state === 'error' || state === 'timeout') && !allServersFailed && !autoFallbackAttempted;

  return (
    <div className={cn('relative bg-black', aspectClass, className)}>
      {/* Iframe — always rendered so it can load in background */}
      <iframe
        ref={iframeRef}
        src={src}
        className={cn(
          'absolute inset-0 w-full h-full transition-opacity duration-500',
          showOverlay ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
        referrerPolicy="origin"
        title={title}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Loading indicator with progress */}
      {state === 'loading' && !showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60">
          <div className="flex flex-col items-center gap-3 w-48">
            <div className="relative w-10 h-10">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              {loadProgress > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] text-primary/70 font-bold">
                  {Math.round(loadProgress)}%
                </span>
              )}
            </div>
            <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Tv className="w-3.5 h-3.5" />
              <span>Chargement de {serverName}...</span>
            </div>
          </div>
        </div>
      )}

      {/* Auto-fallback transition overlay */}
      {isAutoFallingBack && (
        <div className="absolute inset-0 flex items-center justify-center z-15 bg-black/80">
          <div className="flex flex-col items-center gap-3 animate-pulse">
            <Wifi className="w-8 h-8 text-primary" />
            <p className="text-sm text-white/60 font-medium">Recherche d&apos;un serveur disponible...</p>
            <p className="text-[11px] text-white/30">{availableServers} serveur{availableServers > 1 ? 's' : ''} restant{availableServers > 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Error/Timeout overlay — all servers failed */}
      {showOverlay && allServersFailed && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-gradient-to-b from-black/90 via-black/95 to-black/90">
          <div className={cn(
            'flex flex-col items-center text-center px-6',
            compact ? 'gap-3 max-w-[240px]' : 'gap-4 max-w-md'
          )}>
            {/* Icon */}
            <div className={cn(
              'rounded-full flex items-center justify-center',
              compact ? 'w-12 h-12 bg-red-500/10' : 'w-16 h-16 bg-red-500/10'
            )}>
              <WifiOff className={cn(
                'text-red-400',
                compact ? 'w-6 h-6' : 'w-8 h-8'
              )} />
            </div>

            {/* Message */}
            <div>
              <h3 className={cn(
                'font-bold text-white mb-1',
                compact ? 'text-sm' : 'text-base'
              )}>
                Contenu indisponible
              </h3>
              <p className={cn(
                'text-white/40 leading-relaxed',
                compact ? 'text-[11px]' : 'text-xs'
              )}>
                Malheureusement, aucun serveur ne parvient à charger ce contenu pour le moment. 
                Veuillez réessayer dans quelques minutes ou choisir un autre contenu.
              </p>
            </div>

            {/* Actions */}
            <div className={cn(
              'flex items-center gap-2',
              compact ? 'flex-col w-full' : ''
            )}>
              <button
                onClick={handleRetry}
                className={cn(
                  'flex items-center gap-2 font-bold transition-all active:scale-95',
                  compact
                    ? 'w-full justify-center px-4 py-2.5 rounded-full bg-primary text-black text-xs'
                    : 'px-5 py-2.5 rounded-full bg-primary text-black text-sm hover:bg-primary/90 shadow-lg shadow-primary/20'
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer tous les serveurs
              </button>
            </div>

            {/* Server status summary */}
            <div className="w-full mt-2">
              <div className="flex flex-wrap gap-1 justify-center">
                {Object.values(API_CONFIG.videoServers).map((server, idx) => (
                  <span key={server.name} className={cn(
                    'px-2 py-0.5 rounded text-[9px] font-medium',
                    failedServers.has(idx)
                      ? 'bg-red-500/10 text-red-400/60'
                      : 'bg-white/5 text-white/30'
                  )}>
                    {server.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error/Timeout overlay — some servers still available */}
      {showOverlay && !allServersFailed && !isAutoFallingBack && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-gradient-to-b from-black/90 via-black/95 to-black/90">
          <div className={cn(
            'flex flex-col items-center text-center px-6',
            compact ? 'gap-3 max-w-[260px]' : 'gap-4 max-w-sm'
          )}>
            {/* Icon */}
            <div className={cn(
              'rounded-full flex items-center justify-center',
              compact ? 'w-12 h-12 bg-amber-500/10' : 'w-16 h-16 bg-amber-500/10'
            )}>
              <AlertTriangle className={cn(
                'text-amber-400',
                compact ? 'w-6 h-6' : 'w-8 h-8'
              )} />
            </div>

            {/* Message */}
            <div>
              <h3 className={cn(
                'font-bold text-white mb-1',
                compact ? 'text-sm' : 'text-base'
              )}>
                Serveur indisponible
              </h3>
              <p className={cn(
                'text-white/40 leading-relaxed',
                compact ? 'text-[11px]' : 'text-xs'
              )}>
                {state === 'timeout'
                  ? `${serverName} ne répond pas. Le serveur est peut-être hors ligne.`
                  : `${serverName} a rencontré une erreur.`
                }
              </p>
              {availableServers > 0 && (
                <p className={cn('text-primary/60 mt-1', compact ? 'text-[10px]' : 'text-xs')}>
                  {availableServers} serveur{availableServers > 1 ? 's alternatif' : ' alternatif'} disponible{availableServers > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className={cn(
              'flex items-center gap-2',
              compact ? 'flex-col w-full' : ''
            )}>
              <button
                onClick={handleNextServer}
                className={cn(
                  'flex items-center gap-2 font-bold transition-all active:scale-95',
                  compact
                    ? 'w-full justify-center px-4 py-2.5 rounded-full bg-primary text-black text-xs'
                    : 'px-5 py-2.5 rounded-full bg-primary text-black text-sm hover:bg-primary/90 shadow-lg shadow-primary/20'
                )}
              >
                <SkipForward className="w-4 h-4" />
                Serveur suivant
              </button>
              <button
                onClick={() => setShowServerList(!showServerList)}
                className={cn(
                  'flex items-center gap-2 font-medium text-white/50 hover:text-white/70 transition-colors',
                  compact
                    ? 'w-full justify-center px-4 py-2 rounded-full bg-white/5 text-xs'
                    : 'px-4 py-2.5 rounded-full bg-white/5 text-xs hover:bg-white/10'
                )}
              >
                <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', showServerList && 'rotate-90')} />
                Voir les serveurs
              </button>
              <button
                onClick={handleRetry}
                className={cn(
                  'flex items-center gap-2 font-medium text-white/50 hover:text-white/70 transition-colors',
                  compact
                    ? 'w-full justify-center px-4 py-2 rounded-full bg-white/5 text-xs'
                    : 'px-4 py-2.5 rounded-full bg-white/5 text-xs hover:bg-white/10'
                )}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Réessayer
              </button>
            </div>

            {/* Expandable server list */}
            {showServerList && !compact && (
              <div className="w-full mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <p className="text-[10px] text-white/30 mb-2 font-medium">État des serveurs</p>
                <div className="space-y-1.5">
                  {Object.values(API_CONFIG.videoServers).map((server, idx) => {
                    const status = serverStatuses.find(s => s.index === idx);
                    const isFailed = failedServers.has(idx);
                    const isCurrent = idx === serverIndex;
                    const lang = (server as { lang?: string }).lang || 'VO';
                    
                    return (
                      <div key={server.name} className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px]',
                        isCurrent ? 'bg-primary/10 border border-primary/20' : 'bg-white/[0.02]',
                        isFailed && 'opacity-50'
                      )}>
                        {/* Status indicator */}
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full flex-shrink-0',
                          isFailed ? 'bg-red-400' : isCurrent && state === 'ready' ? 'bg-green-400' : 'bg-white/20'
                        )} />
                        
                        <span className={cn(
                          'font-medium flex-1',
                          isCurrent ? 'text-white/90' : 'text-white/50'
                        )}>
                          {server.name}
                        </span>
                        
                        <span className={cn(
                          'px-1 py-0.5 rounded text-[8px] font-bold',
                          lang === 'VF' ? 'bg-blue-500/20 text-blue-400/70' : 'bg-amber-500/20 text-amber-400/70'
                        )}>
                          {lang}
                        </span>
                        
                        {isCurrent && (
                          <span className="text-[9px] text-primary font-bold">ACTIF</span>
                        )}
                        {isFailed && (
                          <span className="text-[9px] text-red-400/60">ÉCHEC</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Server info */}
            <p className="text-[10px] text-white/20">
              Serveur {serverIndex + 1} / {totalServers} · {failedServers.size} échoué{failedServers.size > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
