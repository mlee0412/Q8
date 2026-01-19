/**
 * QuickNotesWidget Utilities
 */

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getQuickSummary(content: string): string {
  const cleaned = content
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/- \[ \]/g, '☐')
    .replace(/- \[x\]/g, '☑')
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 3)
    .join(' ');

  return cleaned.length > 120 ? cleaned.slice(0, 120) + '...' : cleaned || 'No content';
}
