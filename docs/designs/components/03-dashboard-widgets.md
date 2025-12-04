# Dashboard Widgets Design Specification

**Category**: Dashboard Widgets (Phase 2 - Glass/Bento UI)
**Priority**: High - Core user-facing features
**Design Date**: 2025-01-20

---

## Overview

Domain-specific dashboard widgets for the Bento Grid layout, displaying real-time data from MCP tool integrations (GitHub, Google Calendar, Spotify, Weather, Tasks). All widgets follow the glassmorphism design system and integrate with RxDB for local-first data access.

---

## 1. GitHubPRWidget Component

### Purpose
Displays open pull requests from GitHub with AI-generated summaries, status indicators, and quick actions.

### File Location
`apps/web/src/components/dashboard/widgets/GitHubPRWidget.tsx`

### Component Code

```typescript
'use client';

import { useState } from 'react';
import { useRxData } from 'rxdb-hooks';
import { motion } from 'framer-motion';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIButton } from '@/components/shared/AIButton';

interface GitHubPR {
  id: string;
  number: number;
  title: string;
  author: string;
  avatar_url: string;
  status: 'open' | 'closed' | 'merged';
  created_at: string;
  repository: string;
  url: string;
  checks_status: 'pending' | 'success' | 'failure';
  ai_summary?: string;
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

export function GitHubPRWidget({
  repository,
  maxItems = 5,
  colSpan = 2,
  rowSpan = 2,
  className,
}: GitHubPRWidgetProps) {
  const [expandedPR, setExpandedPR] = useState<string | null>(null);

  // Fetch PRs from RxDB
  const { result: prs, isFetching } = useRxData<GitHubPR>(
    'github_prs',
    (collection) => {
      let query = collection.find().where('status').eq('open');

      if (repository) {
        query = query.where('repository').eq(repository);
      }

      return query.limit(maxItems).sort({ created_at: 'desc' });
    }
  );

  // Get status configuration
  const getStatusConfig = (status: GitHubPR['status']) => {
    switch (status) {
      case 'open':
        return { icon: GitPullRequest, color: 'text-neon-accent', bg: 'bg-neon-accent/10' };
      case 'merged':
        return { icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case 'closed':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' };
    }
  };

  // Get checks status configuration
  const getChecksConfig = (checks: GitHubPR['checks_status']) => {
    switch (checks) {
      case 'success':
        return { icon: CheckCircle2, color: 'text-green-500' };
      case 'failure':
        return { icon: XCircle, color: 'text-red-500' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        'glass-panel rounded-xl p-6 flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-5 w-5 text-neon-primary" />
          <h3 className="font-semibold">Pull Requests</h3>
        </div>
        {prs && prs.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {prs.length} open
          </span>
        )}
      </div>

      {/* Loading State */}
      {isFetching && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading PRs...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isFetching && (!prs || prs.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <GitPullRequest className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No open pull requests</p>
          </div>
        </div>
      )}

      {/* PR List */}
      {!isFetching && prs && prs.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {prs.map((pr, index) => {
            const statusConfig = getStatusConfig(pr.status);
            const checksConfig = getChecksConfig(pr.checks_status);
            const isExpanded = expandedPR === pr.id;

            return (
              <motion.div
                key={pr.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel p-3 rounded-lg hover:bg-glass-bg transition-colors cursor-pointer"
                onClick={() => setExpandedPR(isExpanded ? null : pr.id)}
              >
                {/* PR Header */}
                <div className="flex items-start gap-3">
                  {/* Author Avatar */}
                  <img
                    src={pr.avatar_url}
                    alt={pr.author}
                    className="h-8 w-8 rounded-full"
                  />

                  {/* PR Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">
                        {pr.title}
                      </h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <statusConfig.icon className={cn('h-4 w-4', statusConfig.color)} />
                        <checksConfig.icon className={cn('h-4 w-4', checksConfig.color)} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>#{pr.number}</span>
                      <span>•</span>
                      <span>{pr.repository}</span>
                      <span>•</span>
                      <span>{formatDate(pr.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-glass-border space-y-3"
                  >
                    {/* AI Summary */}
                    {pr.ai_summary ? (
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-3 w-3 text-neon-primary" />
                          <span className="text-xs font-medium text-neon-primary">
                            AI Summary
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{pr.ai_summary}</p>
                      </div>
                    ) : (
                      <AIButton
                        context={{ pr_number: pr.number, repository: pr.repository }}
                        prompt="Summarize the changes in this pull request"
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                      >
                        <Sparkles className="h-3 w-3 mr-2" />
                        Generate AI Summary
                      </AIButton>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 glass-panel rounded-lg hover:bg-glass-bg text-xs transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on GitHub
                      </a>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
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
```

### Usage Examples

```typescript
// Basic usage (all repos)
<GitHubPRWidget />

// Specific repository
<GitHubPRWidget repository="anthropics/claude-code" />

// Custom sizing in Bento Grid
<GitHubPRWidget colSpan={3} rowSpan={2} maxItems={10} />
```

---

## 2. CalendarWidget Component

### Purpose
Displays upcoming events from Google Calendar with time indicators, meeting links, and quick actions.

### File Location
`apps/web/src/components/dashboard/widgets/CalendarWidget.tsx`

### Component Code

```typescript
'use client';

import { useRxData } from 'rxdb-hooks';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  meeting_url?: string;
  attendees_count?: number;
  color?: string;
  calendar_name: string;
}

interface CalendarWidgetProps {
  /**
   * Maximum number of events to display
   * @default 5
   */
  maxItems?: number;

  /**
   * Show only today's events
   * @default false
   */
  todayOnly?: boolean;

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

export function CalendarWidget({
  maxItems = 5,
  todayOnly = false,
  colSpan = 2,
  rowSpan = 2,
  className,
}: CalendarWidgetProps) {
  // Fetch events from RxDB
  const { result: events, isFetching } = useRxData<CalendarEvent>(
    'calendar_events',
    (collection) => {
      const now = new Date().toISOString();
      let query = collection.find().where('start_time').gte(now);

      if (todayOnly) {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        query = query.where('start_time').lte(endOfDay.toISOString());
      }

      return query.limit(maxItems).sort({ start_time: 'asc' });
    }
  );

  // Get next event (happening now or soon)
  const nextEvent = events?.[0];
  const isHappeningNow = nextEvent && new Date(nextEvent.start_time) <= new Date();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        'glass-panel rounded-xl p-6 flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-neon-primary" />
          <h3 className="font-semibold">Calendar</h3>
        </div>
        {events && events.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {events.length} upcoming
          </span>
        )}
      </div>

      {/* Loading State */}
      {isFetching && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading events...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isFetching && (!events || events.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {todayOnly ? 'No events today' : 'No upcoming events'}
            </p>
          </div>
        </div>
      )}

      {/* Event List */}
      {!isFetching && events && events.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {events.map((event, index) => {
            const startTime = new Date(event.start_time);
            const endTime = new Date(event.end_time);
            const isNow = index === 0 && isHappeningNow;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'glass-panel p-3 rounded-lg relative overflow-hidden',
                  isNow && 'ring-2 ring-neon-accent'
                )}
              >
                {/* Color Indicator */}
                {event.color && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: event.color }}
                  />
                )}

                <div className="pl-2">
                  {/* Time & Status */}
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatTime(startTime)} - {formatTime(endTime)}
                    </span>
                    {isNow && (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-xs font-medium text-neon-accent"
                      >
                        Happening now
                      </motion.span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-medium mb-2 line-clamp-2">
                    {event.title}
                  </h4>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{event.location}</span>
                      </div>
                    )}

                    {event.attendees_count && event.attendees_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{event.attendees_count}</span>
                      </div>
                    )}

                    {event.meeting_url && (
                      <a
                        href={event.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-neon-primary hover:text-neon-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Video className="h-3 w-3" />
                        <span>Join</span>
                        <ExternalLink className="h-2 w-2" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

CalendarWidget.displayName = 'CalendarWidget';

// Helper: Format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
```

### Usage Examples

```typescript
// Basic usage
<CalendarWidget />

// Today only
<CalendarWidget todayOnly maxItems={10} />

// Custom sizing
<CalendarWidget colSpan={2} rowSpan={3} />
```

---

## 3. SpotifyWidget Component

### Purpose
Displays currently playing track from Spotify with playback controls and track metadata.

### File Location
`apps/web/src/components/dashboard/widgets/SpotifyWidget.tsx`

### Component Code

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  album_art_url: string;
  duration_ms: number;
  progress_ms: number;
  is_playing: boolean;
  spotify_url: string;
}

interface SpotifyWidgetProps {
  /**
   * Bento grid column span
   * @default 2
   */
  colSpan?: 1 | 2 | 3 | 4;

  /**
   * Bento grid row span
   * @default 1
   */
  rowSpan?: 1 | 2 | 3 | 4;

  /**
   * Show playback controls
   * @default true
   */
  showControls?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function SpotifyWidget({
  colSpan = 2,
  rowSpan = 1,
  showControls = true,
  className,
}: SpotifyWidgetProps) {
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current track (simulated - replace with actual API call)
  useEffect(() => {
    const fetchTrack = async () => {
      try {
        // TODO: Implement actual Spotify API integration via MCP
        // const response = await fetch('/api/spotify/now-playing');
        // const data = await response.json();
        // setTrack(data);

        // Simulated data for demo
        setTimeout(() => {
          setTrack({
            id: '1',
            title: 'Blinding Lights',
            artist: 'The Weeknd',
            album: 'After Hours',
            album_art_url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
            duration_ms: 200000,
            progress_ms: 45000,
            is_playing: true,
            spotify_url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
          });
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error('Failed to fetch Spotify track:', error);
        setIsLoading(false);
      }
    };

    fetchTrack();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchTrack, 5000);

    return () => clearInterval(interval);
  }, []);

  // Playback controls
  const handlePlayPause = async () => {
    // TODO: Implement Spotify playback control
    console.log('Toggle play/pause');
  };

  const handleSkipPrevious = async () => {
    // TODO: Implement Spotify skip previous
    console.log('Skip previous');
  };

  const handleSkipNext = async () => {
    // TODO: Implement Spotify skip next
    console.log('Skip next');
  };

  // Calculate progress percentage
  const progressPercent = track
    ? (track.progress_ms / track.duration_ms) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        'glass-panel rounded-xl overflow-hidden relative',
        className
      )}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !track && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">Not playing</p>
          </div>
        </div>
      )}

      {/* Now Playing */}
      <AnimatePresence mode="wait">
        {!isLoading && track && (
          <motion.div
            key={track.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-full"
          >
            {/* Background Album Art (Blurred) */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl"
              style={{ backgroundImage: `url(${track.album_art_url})` }}
            />

            {/* Content */}
            <div className="relative h-full flex flex-col p-6">
              <div className="flex items-start gap-4 flex-1">
                {/* Album Art */}
                <motion.img
                  layoutId={`album-art-${track.id}`}
                  src={track.album_art_url}
                  alt={track.album}
                  className="h-16 w-16 rounded-lg shadow-lg flex-shrink-0"
                />

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{track.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.artist}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {track.album}
                  </p>

                  {/* Spotify Link */}
                  <a
                    href={track.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-neon-primary hover:text-neon-accent mt-2"
                  >
                    Open in Spotify
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="h-1 bg-glass-border rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full bg-neon-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDuration(track.progress_ms)}</span>
                  <span>{formatDuration(track.duration_ms)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              {showControls && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSkipPrevious}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="neon"
                    size="icon"
                    className="h-10 w-10"
                    onClick={handlePlayPause}
                  >
                    {track.is_playing ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSkipNext}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

SpotifyWidget.displayName = 'SpotifyWidget';

// Helper: Format duration
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

### Usage Examples

```typescript
// Basic usage
<SpotifyWidget />

// Without controls (display only)
<SpotifyWidget showControls={false} />

// Custom sizing
<SpotifyWidget colSpan={3} rowSpan={1} />
```

---

## 4. WeatherWidget Component

### Purpose
Displays current weather conditions with forecast and location information.

### File Location
`apps/web/src/components/dashboard/widgets/WeatherWidget.tsx`

### Component Code

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  Droplets,
  Eye,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherData {
  location: string;
  temperature: number;
  feels_like: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  description: string;
  humidity: number;
  wind_speed: number;
  visibility: number;
  updated_at: string;
}

interface WeatherWidgetProps {
  /**
   * Location override (city name or coordinates)
   * If undefined, uses geolocation
   */
  location?: string;

  /**
   * Temperature unit
   * @default 'celsius'
   */
  unit?: 'celsius' | 'fahrenheit';

  /**
   * Bento grid column span
   * @default 1
   */
  colSpan?: 1 | 2 | 3 | 4;

  /**
   * Bento grid row span
   * @default 1
   */
  rowSpan?: 1 | 2 | 3 | 4;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function WeatherWidget({
  location,
  unit = 'celsius',
  colSpan = 1,
  rowSpan = 1,
  className,
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // TODO: Implement actual weather API integration
        // const response = await fetch('/api/weather', {
        //   method: 'POST',
        //   body: JSON.stringify({ location, unit }),
        // });
        // const data = await response.json();
        // setWeather(data);

        // Simulated data for demo
        setTimeout(() => {
          setWeather({
            location: location || 'San Francisco',
            temperature: 18,
            feels_like: 16,
            condition: 'cloudy',
            description: 'Partly cloudy',
            humidity: 65,
            wind_speed: 12,
            visibility: 10,
            updated_at: new Date().toISOString(),
          });
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error('Failed to fetch weather:', error);
        setIsLoading(false);
      }
    };

    fetchWeather();

    // Update every 10 minutes
    const interval = setInterval(fetchWeather, 600000);

    return () => clearInterval(interval);
  }, [location, unit]);

  // Get weather icon
  const getWeatherIcon = (condition: WeatherData['condition']) => {
    switch (condition) {
      case 'sunny':
        return Sun;
      case 'cloudy':
        return Cloud;
      case 'rainy':
        return CloudRain;
      case 'snowy':
        return CloudSnow;
      case 'windy':
        return Wind;
      default:
        return Cloud;
    }
  };

  // Get background gradient based on condition
  const getBackgroundGradient = (condition: WeatherData['condition']) => {
    switch (condition) {
      case 'sunny':
        return 'from-yellow-500/20 to-orange-500/20';
      case 'cloudy':
        return 'from-gray-500/20 to-blue-500/20';
      case 'rainy':
        return 'from-blue-500/20 to-indigo-500/20';
      case 'snowy':
        return 'from-blue-300/20 to-white/20';
      case 'windy':
        return 'from-teal-500/20 to-cyan-500/20';
      default:
        return 'from-gray-500/20 to-gray-600/20';
    }
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.condition) : Cloud;
  const bgGradient = weather ? getBackgroundGradient(weather.condition) : '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        'glass-panel rounded-xl p-6 relative overflow-hidden',
        className
      )}
    >
      {/* Background Gradient */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', bgGradient)} />

      {/* Loading State */}
      {isLoading && (
        <div className="relative h-full flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Weather Data */}
      {!isLoading && weather && (
        <div className="relative">
          {/* Location */}
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{weather.location}</span>
          </div>

          {/* Main Weather */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {Math.round(weather.temperature)}°
                </span>
                <span className="text-lg text-muted-foreground">
                  {unit === 'celsius' ? 'C' : 'F'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Feels like {Math.round(weather.feels_like)}°
              </p>
              <p className="text-sm font-medium mt-1">{weather.description}</p>
            </div>

            <WeatherIcon className="h-16 w-16 text-neon-primary" />
          </div>

          {/* Weather Details */}
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <Droplets className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-muted-foreground">Humidity</p>
              <p className="font-medium">{weather.humidity}%</p>
            </div>

            <div className="text-center">
              <Wind className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-muted-foreground">Wind</p>
              <p className="font-medium">{weather.wind_speed} km/h</p>
            </div>

            <div className="text-center">
              <Eye className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-muted-foreground">Visibility</p>
              <p className="font-medium">{weather.visibility} km</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

WeatherWidget.displayName = 'WeatherWidget';
```

### Usage Examples

```typescript
// Auto-detect location
<WeatherWidget />

// Specific location
<WeatherWidget location="New York" />

// Fahrenheit
<WeatherWidget unit="fahrenheit" />

// Custom sizing
<WeatherWidget colSpan={2} rowSpan={2} />
```

---

## 5. TaskWidget Component

### Purpose
Displays quick tasks and reminders with completion tracking and AI-powered task suggestions.

### File Location
`apps/web/src/components/dashboard/widgets/TaskWidget.tsx`

### Component Code

```typescript
'use client';

import { useState } from 'react';
import { useRxData } from 'rxdb-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Sparkles,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { OptimisticAction } from '@/components/shared/OptimisticAction';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
}

interface TaskWidgetProps {
  /**
   * Maximum number of tasks to display
   * @default 5
   */
  maxItems?: number;

  /**
   * Show completed tasks
   * @default false
   */
  showCompleted?: boolean;

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

export function TaskWidget({
  maxItems = 5,
  showCompleted = false,
  colSpan = 2,
  rowSpan = 2,
  className,
}: TaskWidgetProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Fetch tasks from RxDB
  const { result: tasks, isFetching } = useRxData<Task>(
    'tasks',
    (collection) => {
      let query = collection.find();

      if (!showCompleted) {
        query = query.where('completed').eq(false);
      }

      return query.limit(maxItems).sort({ created_at: 'desc' });
    }
  );

  // Add new task
  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;

    try {
      // TODO: Implement task creation
      // await db.collections.tasks.insert({
      //   id: generateId(),
      //   text: newTaskText,
      //   completed: false,
      //   priority: 'medium',
      //   created_at: new Date().toISOString(),
      // });

      setNewTaskText('');
      setIsAddingTask(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  // Toggle task completion
  const toggleTaskCompletion = async (task: Task) => {
    try {
      // TODO: Implement task update
      // await db.collections.tasks.upsert({
      //   ...task,
      //   completed: !task.completed,
      // });
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      // TODO: Implement task deletion
      // await db.collections.tasks.findOne(taskId).remove();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Get priority color
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
    }
  };

  const incompleteTasks = tasks?.filter((t) => !t.completed) || [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        'glass-panel rounded-xl p-6 flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-neon-primary" />
          <h3 className="font-semibold">Tasks</h3>
        </div>
        <div className="flex items-center gap-2">
          {incompleteTasks.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {incompleteTasks.length} pending
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsAddingTask(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add Task Input */}
      <AnimatePresence>
        {isAddingTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask();
                  if (e.key === 'Escape') setIsAddingTask(false);
                }}
                placeholder="Enter task..."
                autoFocus
                className="flex-1 px-3 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary text-sm"
              />
              <Button
                variant="neon"
                size="sm"
                onClick={handleAddTask}
              >
                Add
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isFetching && (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isFetching && (!tasks || tasks.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No tasks</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingTask(true)}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add your first task
            </Button>
          </div>
        </div>
      )}

      {/* Task List */}
      {!isFetching && tasks && tasks.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {tasks.map((task, index) => (
            <OptimisticAction
              key={task.id}
              data={task}
              optimisticUpdate={(current) => ({
                ...current,
                completed: !current.completed,
              })}
              serverAction={async (data) => {
                await toggleTaskCompletion(data);
                return data;
              }}
              showStatus={false}
            >
              {(optimisticTask, triggerToggle) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-panel p-3 rounded-lg group hover:bg-glass-bg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={triggerToggle}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {optimisticTask.completed ? (
                        <CheckSquare className="h-5 w-5 text-neon-accent" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground hover:text-neon-primary" />
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm',
                          optimisticTask.completed &&
                            'line-through text-muted-foreground'
                        )}
                      >
                        {optimisticTask.text}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            optimisticTask.priority === 'high' && 'bg-red-500',
                            optimisticTask.priority === 'medium' &&
                              'bg-yellow-500',
                            optimisticTask.priority === 'low' && 'bg-green-500'
                          )}
                        />
                        {optimisticTask.due_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(optimisticTask.due_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteTask(optimisticTask.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </motion.div>
              )}
            </OptimisticAction>
          ))}
        </div>
      )}
    </motion.div>
  );
}

TaskWidget.displayName = 'TaskWidget';

// Helper: Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString();
}
```

### Usage Examples

```typescript
// Basic usage
<TaskWidget />

// Show completed tasks
<TaskWidget showCompleted maxItems={10} />

// Custom sizing
<TaskWidget colSpan={2} rowSpan={3} />
```

---

## Bento Grid Integration

### Example Dashboard Layout

```typescript
// apps/web/src/app/dashboard/page.tsx
import { BentoGrid } from '@/components/dashboard/BentoGrid';
import { GitHubPRWidget } from '@/components/dashboard/widgets/GitHubPRWidget';
import { CalendarWidget } from '@/components/dashboard/widgets/CalendarWidget';
import { SpotifyWidget } from '@/components/dashboard/widgets/SpotifyWidget';
import { WeatherWidget } from '@/components/dashboard/widgets/WeatherWidget';
import { TaskWidget } from '@/components/dashboard/widgets/TaskWidget';
import { StatusWidget } from '@/components/dashboard/widgets/StatusWidget';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <BentoGrid>
        {/* GitHub PRs - Large */}
        <GitHubPRWidget colSpan={2} rowSpan={2} />

        {/* Calendar - Medium */}
        <CalendarWidget colSpan={2} rowSpan={2} />

        {/* Tasks - Medium */}
        <TaskWidget colSpan={2} rowSpan={2} />

        {/* Spotify - Wide */}
        <SpotifyWidget colSpan={3} rowSpan={1} />

        {/* Weather - Small */}
        <WeatherWidget colSpan={1} rowSpan={1} />

        {/* Status - Small */}
        <StatusWidget
          title="System Status"
          status="online"
          colSpan={1}
          rowSpan={1}
        />
      </BentoGrid>
    </div>
  );
}
```

---

## Implementation Checklist

### Phase 1: GitHub PR Widget
- [ ] Create `GitHubPRWidget.tsx` component
- [ ] Set up RxDB schema for `github_prs` collection
- [ ] Integrate GitHub MCP server for PR fetching
- [ ] Implement AI summary generation
- [ ] Add PR status indicators and filters

### Phase 2: Calendar Widget
- [ ] Create `CalendarWidget.tsx` component
- [ ] Set up RxDB schema for `calendar_events` collection
- [ ] Integrate Google Calendar MCP server
- [ ] Implement "happening now" detection
- [ ] Add meeting link integration

### Phase 3: Spotify Widget
- [ ] Create `SpotifyWidget.tsx` component
- [ ] Integrate Spotify MCP server
- [ ] Implement playback controls
- [ ] Add progress bar with live updates
- [ ] Test album art display

### Phase 4: Weather Widget
- [ ] Create `WeatherWidget.tsx` component
- [ ] Integrate OpenWeather API
- [ ] Implement geolocation fallback
- [ ] Add weather condition icons
- [ ] Test temperature unit conversion

### Phase 5: Task Widget
- [ ] Create `TaskWidget.tsx` component
- [ ] Set up RxDB schema for `tasks` collection
- [ ] Implement task CRUD operations
- [ ] Add optimistic updates
- [ ] Integrate priority system

### Phase 6: Testing & Polish
- [ ] Write unit tests for all widgets
- [ ] Test responsive layouts
- [ ] Verify accessibility compliance
- [ ] Add loading skeletons
- [ ] Test empty states

---

## Design Decisions & Rationale

### Glassmorphism Consistency
All widgets use the `glass-panel` class with consistent blur, transparency, and neon accents to maintain visual cohesion.

### RxDB Local-First
Widgets read from RxDB first, ensuring instant rendering even offline. Background sync keeps data fresh.

### Optimistic Updates
Task completion and other interactions use `OptimisticAction` for instant feedback before server confirmation.

### Responsive Sizing
Bento Grid's `colSpan` and `rowSpan` props allow flexible layouts that adapt to different screen sizes.

### MCP Integration
Each widget connects to specific MCP servers (GitHub, Google, Spotify, Weather) for data fetching.

---

## Next Steps

After implementing Dashboard Widgets, proceed to:
1. **Chat Interface** (Category 1) - Agent conversation UI
2. **Voice Enhancements** (Category 4) - Advanced voice features

---

**End of Dashboard Widgets Design Specification**
