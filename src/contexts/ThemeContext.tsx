'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';

// RGB color type
interface RGB {
  r: number;
  g: number;
  b: number;
}

// HSL color type
interface HSL {
  h: number;
  s: number;
  l: number;
}

// Theme color data
export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  backdropGlow: string;
}

// Context type
interface DynamicThemeContextType {
  isActive: boolean;
  currentColors: ThemeColors | null;
  currentImageUrl: string | null;
  isExtracting: boolean;
  /** Extract + apply in one call — the main API for content-based theming */
  setContentTheme: (imageUrl: string) => Promise<void>;
  /** Reset to default gold palette */
  resetTheme: () => void;
  /** Extract colors without applying */
  extractColorsFromImage: (imageUrl: string) => Promise<ThemeColors | null>;
  /** Manually apply pre-computed colors */
  applyTheme: (colors: ThemeColors) => void;
}

// Default Netplus gold colors
const DEFAULT_COLORS: ThemeColors = {
  primary: '#e5a00d',
  primaryForeground: '#000000',
  accent: '#f0c14b',
  accentForeground: '#000000',
  backdropGlow: 'rgba(229, 160, 13, 0.06)',
};

// Create context
const DynamicThemeContext = createContext<DynamicThemeContextType | undefined>(undefined);

// Provider props
interface DynamicThemeProviderProps {
  children: ReactNode;
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert hex to rgba string
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Check if color is light or dark
function isLightColor(r: number, g: number, b: number): boolean {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Generate theme colors from a dominant color
function generateThemeColors(dominantRgb: RGB): ThemeColors {
  const hsl = rgbToHsl(dominantRgb.r, dominantRgb.g, dominantRgb.b);
  
  // Boost saturation for more vivid primary
  const primaryS = Math.min(85, Math.max(55, hsl.s + 10));
  const primaryL = Math.min(55, Math.max(42, hsl.l));
  const primary = hslToHex(hsl.h, primaryS, primaryL);
  
  // Accent: shift hue slightly, make lighter
  const accentH = (hsl.h + 25) % 360;
  const accentS = Math.min(75, primaryS);
  const accentL = Math.min(62, primaryL + 12);
  const accent = hslToHex(accentH, accentS, accentL);
  
  // Foreground based on primary brightness
  const foreground = isLightColor(dominantRgb.r, dominantRgb.g, dominantRgb.b) ? '#000000' : '#ffffff';
  
  // Subtle backdrop glow color for ambient effect
  const backdropGlow = hexToRgba(primary, 0.06);
  
  return { primary, primaryForeground: foreground, accent, accentForeground: foreground, backdropGlow };
}

// Dynamic Theme Provider component
export function DynamicThemeProvider({ children }: DynamicThemeProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentColors, setCurrentColors] = useState<ThemeColors | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const previousColorsRef = useRef<ThemeColors | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastExtractedUrlRef = useRef<string | null>(null);

  // Load state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('netplus-dynamic-theme');
    if (saved === 'true') {
      setIsActive(true);
    }
  }, []);

  // Listen for changes from the toggle component
  useEffect(() => {
    const handleChange = (e: CustomEvent<{ active: boolean }>) => {
      setIsActive(e.detail.active);
    };
    window.addEventListener('dynamicThemeChange', handleChange as EventListener);
    return () => window.removeEventListener('dynamicThemeChange', handleChange as EventListener);
  }, []);

  // Create canvas for color extraction
  useEffect(() => {
    if (typeof window !== 'undefined') {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 100;
      canvasRef.current.height = 100;
    }
  }, []);

  // Extract dominant colors from an image
  const extractColorsFromImage = useCallback(async (imageUrl: string): Promise<ThemeColors | null> => {
    if (!canvasRef.current) return null;
    
    // Skip if we already extracted from this exact URL
    if (lastExtractedUrlRef.current === imageUrl) {
      return previousColorsRef.current;
    }
    
    setIsExtracting(true);
    
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        img.onload = () => { clearTimeout(timeout); resolve(); };
        img.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load image')); };
        img.src = imageUrl;
      });
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      // Draw at small size for performance
      const size = 50;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      
      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;
      
      // Color quantization
      const colorCounts: Map<string, { count: number; r: number; g: number; b: number }> = new Map();
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        
        if (a < 128) continue;
        
        const brightness = (r + g + b) / 3;
        if (brightness < 25 || brightness > 230) continue;
        
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        
        const key = `${qr},${qg},${qb}`;
        const existing = colorCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          colorCounts.set(key, { count: 1, r: qr, g: qg, b: qb });
        }
      }
      
      // Find the most vibrant dominant color
      let dominantColor: RGB | null = null;
      let maxScore = 0;
      
      colorCounts.forEach((color) => {
        const hsl = rgbToHsl(color.r, color.g, color.b);
        const saturationScore = hsl.s;
        const lightnessScore = 100 - Math.abs(hsl.l - 50) * 2;
        const countScore = Math.log(color.count + 1) * 10;
        const score = saturationScore * 0.4 + lightnessScore * 0.3 + countScore * 0.3;
        
        if (score > maxScore) {
          maxScore = score;
          dominantColor = { r: color.r, g: color.g, b: color.b };
        }
      });
      
      if (!dominantColor) {
        let maxCount = 0;
        colorCounts.forEach((color) => {
          if (color.count > maxCount) {
            maxCount = color.count;
            dominantColor = { r: color.r, g: color.g, b: color.b };
          }
        });
      }
      
      if (!dominantColor) return null;
      
      const themeColors = generateThemeColors(dominantColor);
      lastExtractedUrlRef.current = imageUrl;
      setCurrentColors(themeColors);
      setCurrentImageUrl(imageUrl);
      
      return themeColors;
    } catch (error) {
      // Silent fail — don't break UX if image can't be loaded
      return null;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  // Apply theme colors to CSS variables with smooth transitions
  const applyTheme = useCallback((colors: ThemeColors) => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Enable transition class, apply colors, then remove after transition
    root.classList.add('theme-transitioning');
    
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-foreground', colors.primaryForeground);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', colors.accentForeground);
    root.style.setProperty('--ring', colors.primary);
    root.style.setProperty('--sidebar-primary', colors.primary);
    root.style.setProperty('--sidebar-ring', colors.primary);
    root.style.setProperty('--dynamic-glow', colors.backdropGlow);
    
    previousColorsRef.current = colors;
    
    // Remove transition class after the animation completes
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 900);
  }, []);

  // Reset to default theme
  const resetTheme = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    
    root.style.setProperty('--primary', DEFAULT_COLORS.primary);
    root.style.setProperty('--primary-foreground', DEFAULT_COLORS.primaryForeground);
    root.style.setProperty('--accent', DEFAULT_COLORS.accent);
    root.style.setProperty('--accent-foreground', DEFAULT_COLORS.accentForeground);
    root.style.setProperty('--ring', DEFAULT_COLORS.primary);
    root.style.setProperty('--sidebar-primary', DEFAULT_COLORS.primary);
    root.style.setProperty('--sidebar-ring', DEFAULT_COLORS.primary);
    root.style.setProperty('--dynamic-glow', DEFAULT_COLORS.backdropGlow);
    
    setCurrentColors(null);
    setCurrentImageUrl(null);
    lastExtractedUrlRef.current = null;
    
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 900);
  }, []);

  // **Main API**: extract colors from image + apply them in one call
  const setContentTheme = useCallback(async (imageUrl: string) => {
    if (!isActive || !imageUrl) return;
    const colors = await extractColorsFromImage(imageUrl);
    if (colors) {
      applyTheme(colors);
    }
  }, [isActive, extractColorsFromImage, applyTheme]);

  // Handle dynamic theme active state changes
  useEffect(() => {
    if (!isActive && previousColorsRef.current) {
      resetTheme();
    }
  }, [isActive, resetTheme]);

  const value: DynamicThemeContextType = useMemo(() => ({
    isActive,
    currentColors,
    currentImageUrl,
    isExtracting,
    setContentTheme,
    resetTheme,
    extractColorsFromImage,
    applyTheme,
  }), [isActive, currentColors, currentImageUrl, isExtracting, setContentTheme, resetTheme, extractColorsFromImage, applyTheme]);

  return (
    <DynamicThemeContext.Provider value={value}>
      {children}
    </DynamicThemeContext.Provider>
  );
}

// Hook to use dynamic theme context
export function useDynamicTheme(): DynamicThemeContextType {
  const context = useContext(DynamicThemeContext);
  
  if (context === undefined) {
    throw new Error('useDynamicTheme must be used within a DynamicThemeProvider');
  }
  
  return context;
}

// Export the context for advanced usage
export { DynamicThemeContext };
