/**
 * URL Validation Utilities
 * Secure handling of external URLs to prevent XSS and injection attacks
 */

// Allowed image URL protocols
const ALLOWED_IMAGE_PROTOCOLS = ['https:', 'http:'];

// Allowed image domains (Spotify, YouTube, etc.)
const ALLOWED_IMAGE_DOMAINS = [
  // Spotify
  'i.scdn.co',
  'mosaic.scdn.co',
  'blend-playlist-covers.spotifycdn.com',
  'seeded-session-images.scdn.co',
  'image-cdn-ak.spotifycdn.com',
  'image-cdn-fa.spotifycdn.com',
  'lineup-images.scdn.co',
  'thisis-images.scdn.co',
  'dailymix-images.scdn.co',
  'seed-mix-image.spotifycdn.com',
  // YouTube
  'i.ytimg.com',
  'img.youtube.com',
  'i9.ytimg.com',
  'yt3.ggpht.com',
  'yt3.googleusercontent.com',
  // Google
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  // Netflix
  'occ-0-2219-2218.1.nflxso.net',
  // Instagram
  'scontent.cdninstagram.com',
  'instagram.com',
  // Podcast platforms
  'megaphone.imgix.net',
  'pbcdn1.podbean.com',
  'assets.pippa.io',
  // Generic CDNs
  'images.unsplash.com',
  'cdn.jsdelivr.net',
];

// Fallback placeholder image
const FALLBACK_IMAGE = '/images/placeholder-album.svg';

/**
 * Validates if a URL is safe for use as an image source
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is safe
 */
export function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Check protocol
    if (!ALLOWED_IMAGE_PROTOCOLS.includes(parsed.protocol)) {
      return false;
    }

    // Check domain against allowlist
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_IMAGE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    return isAllowed;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Returns a safe image URL or fallback
 * @param url - The URL to validate
 * @param fallback - Optional custom fallback URL
 * @returns Safe URL or fallback
 */
export function getSafeImageUrl(
  url: string | undefined | null,
  fallback: string = FALLBACK_IMAGE
): string {
  if (isValidImageUrl(url)) {
    return url as string;
  }
  return fallback;
}

/**
 * Validates if a URL is safe for external links
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is safe
 */
export function isValidExternalUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Only allow https for external links
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Block javascript: and data: URLs
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
    if (dangerousProtocols.some((p) => url.toLowerCase().startsWith(p))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a URL for use in CSS (background-image)
 * @param url - The URL to sanitize
 * @returns Safe CSS url() value or 'none'
 */
export function getSafeCssUrl(url: string | undefined | null): string {
  if (!isValidImageUrl(url)) {
    return 'none';
  }
  // Escape any special characters that could break CSS
  const escapedUrl = (url as string).replace(/[()'"\\]/g, '\\$&');
  return `url(${escapedUrl})`;
}

/**
 * Type guard for ContentItem with safe thumbnail
 */
export interface SafeImageProps {
  src: string;
  isValid: boolean;
}

/**
 * Get safe image props for use in components
 * @param url - The URL to validate
 * @returns Object with src and validity status
 */
export function getSafeImageProps(url: string | undefined | null): SafeImageProps {
  const isValid = isValidImageUrl(url);
  return {
    src: isValid ? (url as string) : FALLBACK_IMAGE,
    isValid,
  };
}

export default {
  isValidImageUrl,
  getSafeImageUrl,
  isValidExternalUrl,
  getSafeCssUrl,
  getSafeImageProps,
  FALLBACK_IMAGE,
};
