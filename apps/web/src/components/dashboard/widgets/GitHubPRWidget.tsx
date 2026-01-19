'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Sparkles,
  RefreshCw,
  GitMerge,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface GitHubPR {
  id: string;
  number: number;
  title: string;
  author: string;
  avatarUrl: string;
  status: 'open' | 'closed' | 'merged';
  createdAt: string;
  updatedAt: string;
  repository: string;
  url: string;
  checksStatus: 'pending' | 'success' | 'failure';
  isDraft: boolean;
  baseBranch: string;
  headBranch: string;
}

interface GitHubPRWidgetProps {
  /**
   * Repository filter (e.g., "owner/repo")
   * Leave undefined to show all repos
   */
  repository?: string;

  /**
   * Maximum number of PRs to display
   * @default 5
   */
  maxItems?: number;

  /**
   * Bento grid column span
   * @default 2
   */
  colSpan?: 1 | 2 | 3 | 4;

  /**
   * Bento grid row span
   * @default 2
   */
  rowSpan?: 1 | 2 | 3 | 4;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * GitHub Pull Request Widget
 *
 * Displays open pull requests from GitHub with AI-generated summaries,
 * status indicators, and quick actions.
 *
 * Features:
 * - Real-time PR status and checks
 * - AI-powered PR summaries
 * - Expandable PR details
 * - Direct GitHub links
 * - Repository filtering
 *
 * @example
 * ```tsx
 * // All repositories
 * <GitHubPRWidget />
 *
 * // Specific repository
 * <GitHubPRWidget repository="anthropics/claude-code" />
 *
 * // Custom sizing
 * <GitHubPRWidget colSpan={3} rowSpan={2} maxItems={10} />
 * ```
 */
export function GitHubPRWidget({
  repository,
  maxItems = 5,
  colSpan = 2,
  rowSpan = 2,
  className,
}: GitHubPRWidgetProps) {
  const [prs, setPrs] = useState<GitHubPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPR, setExpandedPR] = useState<string | null>(null);

  // Fetch PRs from GitHub API
  const fetchPRs = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({ type: 'prs', state: 'open' });
      if (repository) {
        params.set('repo', repository);
      }

      const response = await fetch(`/api/github?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        throw new Error('Failed to fetch PRs');
      }

      const data = await response.json();
      setPrs((data.prs || []).slice(0, maxItems));
    } catch (err) {
      logger.error('GitHub fetch error', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to load PRs');
    } finally {
      setIsLoading(false);
    }
  }, [repository, maxItems]);

  useEffect(() => {
    fetchPRs();
    // Refresh every 2 minutes
    const interval = setInterval(fetchPRs, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPRs]);

  // Get status configuration
  const getStatusConfig = (status: GitHubPR['status']) => {
    switch (status) {
      case 'open':
        return { icon: GitPullRequest, color: 'text-neon-accent', bg: 'bg-neon-accent/10' };
      case 'merged':
        return { icon: GitMerge, color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case 'closed':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' };
    }
  };

  // Get checks status configuration
  const getChecksConfig = (checks: GitHubPR['checksStatus']) => {
    switch (checks) {
      case 'success':
        return { icon: CheckCircle2, color: 'text-green-500' };
      case 'failure':
        return { icon: XCircle, color: 'text-red-500' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500' };
      default:
        return { icon: Clock, color: 'text-gray-500' };
    }
  };

  // Map colSpan to Tailwind classes - full width on mobile, specified span on md+
  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

  // Map rowSpan to Tailwind classes
  const rowSpanClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'surface-matte p-3 flex flex-col overflow-hidden w-full',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Header */}
      <div className="widget-header mb-3">
        <div className="widget-header-title">
          <GitPullRequest className="h-4 w-4 text-neon-primary" />
          <h3 className="text-heading text-sm">Pull Requests</h3>
        </div>
        <div className="flex items-center gap-2">
          {prs.length > 0 && (
            <span className="text-caption">
              {prs.length} open
            </span>
          )}
          <button
            className="btn-icon btn-icon-sm focus-ring"
            onClick={fetchPRs}
            aria-label="Refresh PRs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && prs.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-neon-primary/50 border-t-neon-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="empty-state">
          <AlertCircle className="empty-state-icon text-warning" />
          <p className="empty-state-title">Unable to load PRs</p>
          <p className="empty-state-description">{error}</p>
          <button className="btn-ghost mt-2" onClick={fetchPRs}>
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && prs.length === 0 && (
        <div className="empty-state">
          <GitPullRequest className="empty-state-icon" />
          <p className="empty-state-title">No open pull requests</p>
        </div>
      )}

      {/* PR List */}
      {!isLoading && !error && prs.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
          <AnimatePresence>
            {prs.map((pr, index) => {
              const statusConfig = getStatusConfig(pr.status);
              const checksConfig = getChecksConfig(pr.checksStatus);
              const isExpanded = expandedPR === pr.id;

              return (
                <motion.div
                  key={pr.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card-item cursor-pointer"
                  onClick={() => setExpandedPR(isExpanded ? null : pr.id)}
                >
                  {/* PR Header */}
                  <div className="flex items-start gap-2">
                    {/* Author Avatar */}
                    <div className="relative h-7 w-7 flex-shrink-0">
                      <Image
                        src={pr.avatarUrl || 'https://github.com/identicons/default.png'}
                        alt={pr.author}
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>

                    {/* PR Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h4 className="text-body text-xs font-medium truncate leading-tight">
                          {pr.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {statusConfig && (
                            <statusConfig.icon className={cn('h-3 w-3', statusConfig.color)} />
                          )}
                          {checksConfig && (
                            <checksConfig.icon className={cn('h-3 w-3', checksConfig.color)} />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-text-muted">
                        <span>#{pr.number}</span>
                        <span>•</span>
                        <span className="truncate">{pr.repository}</span>
                        <span>•</span>
                        <span>{formatDate(pr.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pt-2 border-t border-border-subtle space-y-2"
                      >
                        {/* Branch info */}
                        <div className="text-xs text-text-muted">
                          <code className="bg-surface-3 px-1 rounded">{pr.headBranch}</code>
                          <span className="mx-1">→</span>
                          <code className="bg-surface-3 px-1 rounded">{pr.baseBranch}</code>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-surface-3 rounded-md hover:bg-surface-4 text-xs text-text-secondary hover:text-text-primary transition-colors focus-ring"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on GitHub
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

GitHubPRWidget.displayName = 'GitHubPRWidget';

// Helper: Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
