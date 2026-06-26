'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Languages, Loader2, AlertCircle, ChevronUp, ChevronDown, Subtitles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-url';

// ─── Types ───
interface SubtitleLine {
  index: number;
  startTime: number; // seconds
  endTime: number;   // seconds
  text: string;
}

interface SubtitleOverlayProps {
  /** TMDB media ID */
  tmdbId: number;
  /** 'movie' or 'tv' */
  mediaType: 'movie' | 'tv';
  /** Season number for TV */
  season?: number;
  /** Episode number for TV */
  episode?: number;
  /** Current playback elapsed time in seconds */
  currentTime: number;
  /** Whether the subtitles are active */
  isActive: boolean;
  /** Callback to toggle subtitle visibility */
  onToggle: () => void;
  /** Compact mode for shorts */
  compact?: boolean;
  /**
   * When true, this instance ONLY renders the text overlay on the video.
   * No toggle button, no controls bar. Used for the video-area overlay
   * while the server section handles the toggle/controls.
   */
  overlayOnly?: boolean;
  /**
   * When true, skip rendering the text overlay (controls only).
   * Prevents duplicate text overlays when two SubtitleOverlay instances
   * share the same positioned ancestor.
   */
  hideTextOverlay?: boolean;
}

// ─── Module-level subtitle cache (prevents double-fetch) ───
interface CachedSubtitle {
  subtitles: SubtitleLine[];
  sourceInfo: { source: string; sourceLang: string; needsTranslation: boolean } | null;
}

const subtitleCache = new Map<string, CachedSubtitle>();

function getCacheKey(tmdbId: number, mediaType: string, season?: number, episode?: number): string {
  return `${tmdbId}-${mediaType}-${season ?? 'x'}-${episode ?? 'x'}`;
}

// ─── SubtitleOverlay Component ───
export function SubtitleOverlay({
  tmdbId,
  mediaType,
  season,
  episode,
  currentTime,
  isActive,
  onToggle,
  compact = false,
  overlayOnly = false,
  hideTextOverlay = false,
}: SubtitleOverlayProps) {
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState<SubtitleLine | null>(null);
  const [offset, setOffset] = useState(0); // seconds offset for manual sync
  const [showControls, setShowControls] = useState(false);
  const [sourceInfo, setSourceInfo] = useState<{ source: string; sourceLang: string; needsTranslation: boolean } | null>(null);
  const loadedRef = useRef(false);

  // Reset loaded ref when media changes to allow re-fetching
  useEffect(() => {
    loadedRef.current = false;
  }, [tmdbId, mediaType, season, episode]);

  // Fetch subtitles when component becomes active
  useEffect(() => {
    if (!isActive || loadedRef.current) return;
    
    const fetchSubtitles = async () => {
      const cacheKey = getCacheKey(tmdbId, mediaType, season, episode);
      
      // Check cache first to avoid double-fetching
      const cached = subtitleCache.get(cacheKey);
      if (cached) {
        setSubtitles(cached.subtitles);
        setSourceInfo(cached.sourceInfo);
        loadedRef.current = true;
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          tmdbId: String(tmdbId),
          mediaType,
          lang: 'fr',
        });
        if (season) params.set('season', String(season));
        if (episode) params.set('episode', String(episode));

        const res = await apiFetch(`/api/subtitles?${params}`);
        const data = await res.json();

        if (data.error && data.subtitles?.length === 0) {
          setError(data.error);
          setLoading(false);
          return;
        }

        if (data.needsTranslation && data.subtitles?.length > 0) {
          // Need to translate from English to French
          setSourceInfo({ source: data.source, sourceLang: data.sourceLang, needsTranslation: true });
          setTranslating(true);
          
          try {
            const translateRes = await apiFetch('/api/subtitles/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lines: data.subtitles,
                targetLang: 'fr',
              }),
            });
            
            const translated = await translateRes.json();
            
            if (translated.translated?.length > 0) {
              const finalSubtitles = translated.translated;
              const finalSourceInfo = { source: data.source, sourceLang: 'fr (traduit IA)', needsTranslation: false };
              setSubtitles(finalSubtitles);
              setSourceInfo(finalSourceInfo);
              // Cache the translated subtitles
              subtitleCache.set(cacheKey, { subtitles: finalSubtitles, sourceInfo: finalSourceInfo });
            } else {
              // Fallback: use original English subtitles
              const finalSourceInfo = { source: data.source, sourceLang: data.sourceLang, needsTranslation: false };
              setSubtitles(data.subtitles);
              setSourceInfo(finalSourceInfo);
              subtitleCache.set(cacheKey, { subtitles: data.subtitles, sourceInfo: finalSourceInfo });
            }
          } catch {
            // Fallback: use original English subtitles
            const finalSourceInfo = { source: data.source, sourceLang: data.sourceLang, needsTranslation: false };
            setSubtitles(data.subtitles);
            setSourceInfo(finalSourceInfo);
            subtitleCache.set(cacheKey, { subtitles: data.subtitles, sourceInfo: finalSourceInfo });
          }
          
          setTranslating(false);
        } else if (data.subtitles?.length > 0) {
          const finalSourceInfo = { source: data.source, sourceLang: data.sourceLang || 'fr', needsTranslation: false };
          setSubtitles(data.subtitles);
          setSourceInfo(finalSourceInfo);
          subtitleCache.set(cacheKey, { subtitles: data.subtitles, sourceInfo: finalSourceInfo });
        } else {
          setError('Aucun sous-titre trouvé');
        }
      } catch {
        setError('Erreur lors du chargement des sous-titres');
      }
      
      setLoading(false);
      loadedRef.current = true;
    };

    fetchSubtitles();
  }, [isActive, tmdbId, mediaType, season, episode]);

  // Find current subtitle line based on playback time
  useEffect(() => {
    if (!isActive || subtitles.length === 0) {
      setCurrentLine(null);
      return;
    }

    const adjustedTime = currentTime + offset;
    
    const line = subtitles.find(
      sub => adjustedTime >= sub.startTime && adjustedTime <= sub.endTime
    ) || null;
    
    setCurrentLine(line);
  }, [currentTime, offset, subtitles, isActive]);

  // ─── overlayOnly mode: only render text overlay, no toggle/controls ───
  if (overlayOnly) {
    if (!isActive) return null;
    if (hideTextOverlay) return null; // shouldn't happen but safety check

    return (
      <>
        {/* Subtitle text overlay — displayed on top of video */}
        {currentLine && (
          <div className="absolute bottom-16 sm:bottom-24 left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
            <div className={cn(
              "px-4 py-2 rounded-lg max-w-[90%] text-center",
              "bg-black/75 backdrop-blur-sm border border-white/10"
            )}>
              <p className={cn(
                "text-white font-medium leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
                compact ? "text-xs" : "text-sm sm:text-base"
              )}>
                {currentLine.text}
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── Full mode (default): toggle button + text overlay + controls ───

  // Toggle button — shown when not active
  if (!isActive && !loading) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all active:scale-95",
          compact
            ? "bg-white/10 text-white/70 text-[10px] px-2 py-1.5"
            : "bg-white/5 text-white/60 hover:bg-primary/20 hover:text-primary text-xs border border-white/10 hover:border-primary/30"
        )}
      >
        <Languages className={cn("w-4 h-4", compact && "w-3 h-3")} />
        <span>Sous-titres IA</span>
      </button>
    );
  }

  return (
    <>
      {/* Subtitle text overlay — displayed on top of video */}
      {isActive && currentLine && !hideTextOverlay && (
        <div className="absolute bottom-16 sm:bottom-24 left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
          <div className={cn(
            "px-4 py-2 rounded-lg max-w-[90%] text-center",
            "bg-black/75 backdrop-blur-sm border border-white/10"
          )}>
            <p className={cn(
              "text-white font-medium leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
              compact ? "text-xs" : "text-sm sm:text-base"
            )}>
              {currentLine.text}
            </p>
          </div>
        </div>
      )}

      {/* Subtitle controls bar */}
      {isActive && (
        <div className="relative">
          {/* Status pill */}
          <div className={cn(
            "flex items-center gap-2 rounded-lg border transition-all",
            compact
              ? "px-2 py-1 text-[9px] bg-primary/20 border-primary/30 text-primary"
              : "px-3 py-2 text-xs bg-primary/10 border-primary/20"
          )}>
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Chargement...</span>
              </>
            ) : translating ? (
              <>
                <Languages className="w-3.5 h-3.5 animate-pulse" />
                <span>Traduction en cours...</span>
              </>
            ) : error ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">{error}</span>
              </>
            ) : (
              <>
                <Subtitles className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-medium">
                  {sourceInfo?.sourceLang === 'fr (traduit IA)' ? 'VF traduits par IA' : 'Sous-titres FR'}
                </span>
                <span className="text-white/30">·</span>
                <span className="text-white/40">{subtitles.length} lignes</span>
              </>
            )}

            {/* Controls */}
            {!loading && !translating && !error && (
              <>
                <button
                  onClick={() => setShowControls(!showControls)}
                  className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors"
                  title="Réglages"
                >
                  <ChevronUp className={cn("w-3 h-3 text-white/40 transition-transform", showControls && "rotate-180")} />
                </button>
                <button
                  onClick={onToggle}
                  className="ml-1 p-0.5 rounded hover:bg-white/10 transition-colors"
                  title="Fermer"
                >
                  <X className="w-3 h-3 text-white/40" />
                </button>
              </>
            )}
          </div>

          {/* Expanded controls — sync adjustment */}
          {showControls && !loading && !translating && (
            <div className="absolute bottom-full mb-2 left-0 right-0 p-3 rounded-lg bg-black/90 backdrop-blur-sm border border-white/10 z-40">
              <p className="text-[10px] text-white/40 mb-2 font-medium">Synchronisation</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffset(o => o - 1)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 text-[10px] transition-colors"
                >
                  <ChevronDown className="w-3 h-3" /> -1s
                </button>
                <button
                  onClick={() => setOffset(o => o - 0.5)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 text-[10px] transition-colors"
                >
                  -0.5s
                </button>
                <span className="text-[11px] text-white/50 font-mono flex-1 text-center">
                  {offset >= 0 ? '+' : ''}{offset.toFixed(1)}s
                </span>
                <button
                  onClick={() => setOffset(o => o + 0.5)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 text-[10px] transition-colors"
                >
                  +0.5s <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setOffset(o => o + 1)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 text-[10px] transition-colors"
                >
                  +1s <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setOffset(0)}
                  className="px-2 py-1 rounded bg-primary/20 text-primary text-[10px] font-medium hover:bg-primary/30 transition-colors"
                >
                  Reset
                </button>
              </div>
              <p className="text-[9px] text-white/20 mt-2">
                Si les sous-titres sont décalés, ajustez avec les boutons ci-dessus
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
