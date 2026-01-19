'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { logger } from '@/lib/logger';

interface ColorThemeResult {
  gradientStyle: React.CSSProperties;
  dominantColor: [number, number, number] | null;
  palette: [number, number, number][];
  isLoading: boolean;
}

/**
 * Hook to extract dominant colors from an image and generate dynamic gradients
 * Uses ColorThief for color extraction
 */
export function useColorTheme(imageUrl: string | null): ColorThemeResult {
  const setDominantColor = useContentHubStore((s) => s.setDominantColor);
  const [gradientStyle, setGradientStyle] = useState<React.CSSProperties>({});
  const [localDominantColor, setLocalDominantColor] = useState<
    [number, number, number] | null
  >(null);
  const [palette, setPalette] = useState<[number, number, number][]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const extractColors = useCallback(async () => {
    if (!imageUrl) {
      setGradientStyle({});
      setLocalDominantColor(null);
      setPalette([]);
      setDominantColor(null);
      return;
    }

    setIsLoading(true);

    // Default fallback colors (purple theme)
    const fallbackColor: [number, number, number] = [139, 92, 246];
    const fallbackPalette: [number, number, number][] = [
      [139, 92, 246],
      [168, 85, 247],
      [192, 132, 252],
    ];

    // Set fallback gradient immediately
    const setFallbackGradient = () => {
      const [r, g, b] = fallbackColor;
      setGradientStyle({
        background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.4) 0%, rgba(${r}, ${g}, ${b}, 0.2) 50%, rgba(${r}, ${g}, ${b}, 0.1) 100%)`,
      });
      setLocalDominantColor(fallbackColor);
      setPalette(fallbackPalette);
      setDominantColor(fallbackColor);
      setIsLoading(false);
    };

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        setFallbackGradient();
        return;
      }

      // Dynamically import ColorThief (client-side only)
      const ColorThiefModule = await import('colorthief').catch(() => null);

      if (!ColorThiefModule) {
        logger.warn('ColorThief not available, using fallback colors');
        setFallbackGradient();
        return;
      }

      const colorThief = new ColorThiefModule.default();

      const img = new Image();
      img.crossOrigin = 'anonymous';

      // Use image proxy to avoid CORS issues
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      img.src = proxyUrl;

      img.onload = () => {
        try {
          const dominant = colorThief.getColor(img, 10) as [number, number, number];
          const colorPalette = colorThief.getPalette(img, 5, 10) as [number, number, number][];

          setLocalDominantColor(dominant);
          setPalette(colorPalette);
          setDominantColor(dominant);

          // Generate gradient from palette
          const [r, g, b] = dominant;
          const [r2, g2, b2] = colorPalette[1] ?? dominant;
          const [r3, g3, b3] = colorPalette[2] ?? colorPalette[1] ?? dominant;

          setGradientStyle({
            background: `
              linear-gradient(
                135deg,
                rgba(${r}, ${g}, ${b}, 0.4) 0%,
                rgba(${r2}, ${g2}, ${b2}, 0.2) 50%,
                rgba(${r3}, ${g3}, ${b3}, 0.1) 100%
              )
            `.trim(),
          });
        } catch (error) {
          logger.warn('Failed to extract colors, using fallback', { imageUrl, error });
          setFallbackGradient();
        } finally {
          setIsLoading(false);
        }
      };

      img.onerror = () => {
        logger.warn('Failed to load image, using fallback colors', { imageUrl });
        setFallbackGradient();
      };
    } catch (error) {
      logger.warn('ColorThief error, using fallback', { imageUrl, error });
      setFallbackGradient();
    }
  }, [imageUrl, setDominantColor]);

  useEffect(() => {
    extractColors();
  }, [extractColors]);

  return {
    gradientStyle,
    dominantColor: localDominantColor,
    palette,
    isLoading,
  };
}

/**
 * Generate a CSS gradient string from RGB colors
 */
export function generateGradient(
  colors: [number, number, number][],
  direction = '135deg',
  opacities = [0.4, 0.2, 0.1]
): string {
  if (colors.length === 0) return 'transparent';

  const stops = colors.map((color, index) => {
    const [r, g, b] = color;
    const opacity = opacities[index] ?? 0.1;
    const position = (index / (colors.length - 1)) * 100;
    return `rgba(${r}, ${g}, ${b}, ${opacity}) ${position}%`;
  });

  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}

/**
 * Calculate contrasting text color (black or white) based on background
 */
export function getContrastColor(
  rgb: [number, number, number]
): 'white' | 'black' {
  const [r, g, b] = rgb;
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Adjust color brightness
 */
export function adjustBrightness(
  rgb: [number, number, number],
  factor: number
): [number, number, number] {
  return [
    Math.min(255, Math.max(0, Math.round(rgb[0] * factor))),
    Math.min(255, Math.max(0, Math.round(rgb[1] * factor))),
    Math.min(255, Math.max(0, Math.round(rgb[2] * factor))),
  ];
}
