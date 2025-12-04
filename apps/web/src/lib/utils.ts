import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with proper precedence
 *
 * @param inputs - Class names to merge
 * @returns Merged class string
 *
 * @example
 * ```tsx
 * cn('bg-red-500', 'bg-blue-500') // 'bg-blue-500'
 * cn('px-2 py-1', props.className) // Merges with conditional classes
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a timestamp for display
 *
 * @param date - Date to format
 * @returns Relative time string (e.g., "2m ago", "3h ago")
 */
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}
