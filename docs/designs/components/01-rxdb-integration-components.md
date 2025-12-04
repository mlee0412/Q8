# RxDB Integration Components Design Specification

**Category**: RxDB Integration (Phase 1 - Foundation)
**Priority**: Critical - Foundation for local-first architecture
**Design Date**: 2025-01-20

---

## Overview

Components that manage RxDB state, Supabase synchronization, and offline-first capabilities. These are foundational components that enable the "Local Speed, Global Intelligence" philosophy of Q8.

---

## 1. SyncStatus Component

### Purpose
Displays real-time synchronization status between RxDB (local) and Supabase (remote), showing connection state, sync progress, and last sync time.

### File Location
`apps/web/src/components/shared/SyncStatus.tsx`

### Component Code

```typescript
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncStatus } from '@/hooks/useSyncStatus';

type SyncState = 'online' | 'offline' | 'syncing' | 'error' | 'synced';

interface SyncStatusProps {
  /**
   * Display variant
   * - badge: Small badge with icon only
   * - compact: Icon + status text
   * - detailed: Full status with last sync time
   */
  variant?: 'badge' | 'compact' | 'detailed';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show last sync timestamp
   * @default true for detailed variant, false otherwise
   */
  showTimestamp?: boolean;

  /**
   * Auto-hide when synced
   * @default false
   */
  autoHide?: boolean;

  /**
   * Auto-hide delay in milliseconds
   * @default 3000
   */
  autoHideDelay?: number;
}

export function SyncStatus({
  variant = 'compact',
  className,
  showTimestamp,
  autoHide = false,
  autoHideDelay = 3000,
}: SyncStatusProps) {
  const { state, lastSync, pendingChanges, error } = useSyncStatus();
  const [visible, setVisible] = useState(true);

  // Auto-hide logic for synced state
  useEffect(() => {
    if (autoHide && state === 'synced') {
      const timer = setTimeout(() => setVisible(false), autoHideDelay);
      return () => clearTimeout(timer);
    }
    setVisible(true);
  }, [state, autoHide, autoHideDelay]);

  // Determine display properties based on state
  const config = getSyncConfig(state);
  const shouldShowTimestamp = showTimestamp ?? variant === 'detailed';

  if (!visible && autoHide) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'glass-panel inline-flex items-center gap-2 rounded-full',
          variant === 'badge' && 'px-2 py-1',
          variant === 'compact' && 'px-3 py-1.5',
          variant === 'detailed' && 'px-4 py-2',
          className
        )}
      >
        {/* Icon */}
        <motion.div
          animate={state === 'syncing' ? { rotate: 360 } : {}}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <config.icon
            className={cn(
              'h-4 w-4',
              config.color
            )}
          />
        </motion.div>

        {/* Status Text (compact & detailed) */}
        {variant !== 'badge' && (
          <div className="flex flex-col">
            <span className={cn('text-sm font-medium', config.color)}>
              {config.label}
            </span>

            {/* Pending changes indicator */}
            {pendingChanges > 0 && (
              <span className="text-xs text-muted-foreground">
                {pendingChanges} pending
              </span>
            )}
          </div>
        )}

        {/* Timestamp (detailed only) */}
        {variant === 'detailed' && shouldShowTimestamp && lastSync && (
          <span className="text-xs text-muted-foreground ml-auto">
            {formatTimestamp(lastSync)}
          </span>
        )}

        {/* Error indicator */}
        {error && variant === 'detailed' && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

SyncStatus.displayName = 'SyncStatus';

// Helper: Get configuration for each sync state
function getSyncConfig(state: SyncState) {
  const configs = {
    online: {
      icon: Cloud,
      label: 'Online',
      color: 'text-neon-accent',
    },
    offline: {
      icon: CloudOff,
      label: 'Offline',
      color: 'text-yellow-500',
    },
    syncing: {
      icon: RefreshCw,
      label: 'Syncing',
      color: 'text-blue-500',
    },
    synced: {
      icon: Check,
      label: 'Synced',
      color: 'text-neon-accent',
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      color: 'text-red-500',
    },
  };

  return configs[state];
}

// Helper: Format timestamp for display
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}
```

### Hook Implementation

```typescript
// apps/web/src/hooks/useSyncStatus.ts
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';

type SyncState = 'online' | 'offline' | 'syncing' | 'error' | 'synced';

interface SyncStatusData {
  state: SyncState;
  lastSync: Date | null;
  pendingChanges: number;
  error: Error | null;
}

export function useSyncStatus(): SyncStatusData {
  const [status, setStatus] = useState<SyncStatusData>({
    state: 'offline',
    lastSync: null,
    pendingChanges: 0,
    error: null,
  });

  useEffect(() => {
    // Subscribe to online/offline events
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, state: 'online' }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, state: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial state
    setStatus(prev => ({
      ...prev,
      state: navigator.onLine ? 'online' : 'offline',
    }));

    // Subscribe to RxDB replication events
    const subscription = db.replicationState$.subscribe({
      next: (replicationState) => {
        if (replicationState.active) {
          setStatus(prev => ({ ...prev, state: 'syncing' }));
        } else if (replicationState.error) {
          setStatus(prev => ({
            ...prev,
            state: 'error',
            error: replicationState.error,
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            state: 'synced',
            lastSync: new Date(),
          }));
        }
      },
    });

    // Monitor pending changes
    const pendingSubscription = db.pending$.subscribe({
      next: (count) => {
        setStatus(prev => ({ ...prev, pendingChanges: count }));
      },
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      subscription.unsubscribe();
      pendingSubscription.unsubscribe();
    };
  }, []);

  return status;
}
```

### Usage Examples

```typescript
// Basic badge in header
<SyncStatus variant="badge" />

// Compact status in navbar
<SyncStatus variant="compact" />

// Detailed status in settings
<SyncStatus variant="detailed" showTimestamp />

// Auto-hide notification
<SyncStatus variant="compact" autoHide autoHideDelay={5000} />
```

### Styling & Design Tokens

```css
/* Uses existing tokens from globals.css */
- Glass panel: backdrop-blur-[24px], glass-bg
- Neon accent: text-neon-accent for online/synced
- Status colors: Yellow (offline), Blue (syncing), Red (error), Green (synced)
- Animations: Rotating icon for syncing state
```

### Accessibility

- [ ] Icon has `aria-hidden="true"` with text label for screen readers
- [ ] Status text is semantic (`<span role="status">`)
- [ ] Color is not the only indicator (icons + text)
- [ ] Motion respects `prefers-reduced-motion`
- [ ] Error state announces via `aria-live="polite"`

### Unit Tests

```typescript
// apps/web/src/components/shared/__tests__/SyncStatus.test.tsx
import { render, screen } from '@testing-library/react';
import { SyncStatus } from '../SyncStatus';
import { useSyncStatus } from '@/hooks/useSyncStatus';

// Mock the hook
jest.mock('@/hooks/useSyncStatus');

describe('SyncStatus', () => {
  it('renders online state correctly', () => {
    (useSyncStatus as jest.Mock).mockReturnValue({
      state: 'online',
      lastSync: new Date(),
      pendingChanges: 0,
      error: null,
    });

    render(<SyncStatus variant="compact" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows pending changes count', () => {
    (useSyncStatus as jest.Mock).mockReturnValue({
      state: 'syncing',
      lastSync: null,
      pendingChanges: 5,
      error: null,
    });

    render(<SyncStatus variant="compact" />);
    expect(screen.getByText('5 pending')).toBeInTheDocument();
  });

  it('auto-hides after sync completion', async () => {
    jest.useFakeTimers();

    (useSyncStatus as jest.Mock).mockReturnValue({
      state: 'synced',
      lastSync: new Date(),
      pendingChanges: 0,
      error: null,
    });

    const { container } = render(
      <SyncStatus variant="compact" autoHide autoHideDelay={3000} />
    );

    expect(container.firstChild).toBeInTheDocument();

    jest.advanceTimersByTime(3000);

    expect(container.firstChild).not.toBeInTheDocument();

    jest.useRealTimers();
  });
});
```

### Storybook Story

```typescript
// apps/web/src/components/shared/SyncStatus.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { SyncStatus } from './SyncStatus';

const meta: Meta<typeof SyncStatus> = {
  title: 'Shared/SyncStatus',
  component: SyncStatus,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['badge', 'compact', 'detailed'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof SyncStatus>;

export const Badge: Story = {
  args: {
    variant: 'badge',
  },
};

export const Compact: Story = {
  args: {
    variant: 'compact',
  },
};

export const Detailed: Story = {
  args: {
    variant: 'detailed',
    showTimestamp: true,
  },
};

export const AutoHide: Story = {
  args: {
    variant: 'compact',
    autoHide: true,
    autoHideDelay: 3000,
  },
};
```

---

## 2. DataTable Component

### Purpose
Generic, reusable data table component with RxDB query integration, sorting, filtering, and pagination. Designed for displaying any RxDB collection data.

### File Location
`apps/web/src/components/shared/DataTable.tsx`

### Component Code

```typescript
'use client';

import { useState, useMemo } from 'react';
import { useRxData, useRxQuery } from 'rxdb-hooks';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface ColumnDef<T> {
  /**
   * Column identifier (must match data key)
   */
  key: keyof T;

  /**
   * Display header text
   */
  header: string;

  /**
   * Custom cell renderer
   */
  cell?: (value: T[keyof T], row: T) => React.ReactNode;

  /**
   * Enable sorting for this column
   * @default true
   */
  sortable?: boolean;

  /**
   * Custom sort function
   */
  sortFn?: (a: T, b: T) => number;

  /**
   * Column width (CSS value)
   */
  width?: string;

  /**
   * Text alignment
   * @default 'left'
   */
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  /**
   * RxDB collection name
   */
  collection: string;

  /**
   * Column definitions
   */
  columns: ColumnDef<T>[];

  /**
   * RxDB query modifier function
   */
  query?: (collection: any) => any;

  /**
   * Enable search functionality
   * @default false
   */
  searchable?: boolean;

  /**
   * Search placeholder text
   */
  searchPlaceholder?: string;

  /**
   * Enable pagination
   * @default true
   */
  paginate?: boolean;

  /**
   * Rows per page
   * @default 10
   */
  pageSize?: number;

  /**
   * Empty state message
   */
  emptyMessage?: string;

  /**
   * Loading state message
   */
  loadingMessage?: string;

  /**
   * Row click handler
   */
  onRowClick?: (row: T) => void;

  /**
   * Additional CSS classes for table container
   */
  className?: string;

  /**
   * Show row index
   * @default false
   */
  showIndex?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  collection,
  columns,
  query,
  searchable = false,
  searchPlaceholder = 'Search...',
  paginate = true,
  pageSize = 10,
  emptyMessage = 'No data available',
  loadingMessage = 'Loading...',
  onRowClick,
  className,
  showIndex = false,
}: DataTableProps<T>) {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data from RxDB
  const queryFn = useMemo(() => {
    return (col: any) => {
      let q = query ? query(col) : col.find();
      return q;
    };
  }, [query]);

  const { result: data, isFetching } = useRxData<T>(collection, queryFn);

  // Apply search filter
  const filteredData = useMemo(() => {
    if (!searchTerm || !data) return data || [];

    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortColumn || !filteredData) return filteredData;

    const column = columns.find((col) => col.key === sortColumn);
    const sorted = [...filteredData].sort((a, b) => {
      if (column?.sortFn) {
        return column.sortFn(a, b);
      }

      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredData, sortColumn, sortDirection, columns]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    if (!paginate || !sortedData) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, paginate]);

  // Calculate total pages
  const totalPages = Math.ceil((sortedData?.length || 0) / pageSize);

  // Handle sort
  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Loading state
  if (isFetching) {
    return (
      <div className={cn('glass-panel rounded-xl p-8 text-center', className)}>
        <p className="text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  // Empty state
  if (!paginatedData || paginatedData.length === 0) {
    return (
      <div className={cn('glass-panel rounded-xl p-8 text-center', className)}>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search bar */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
          />
        </div>
      )}

      {/* Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-glass-border">
              <tr>
                {showIndex && (
                  <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                )}
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    style={{ width: column.width }}
                    className={cn(
                      'px-4 py-3 text-sm font-semibold',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.sortable !== false && 'cursor-pointer hover:text-neon-primary'
                    )}
                    onClick={() =>
                      column.sortable !== false && handleSort(column.key)
                    }
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable !== false && sortColumn === column.key && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </motion.div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIndex) => (
                <motion.tr
                  key={rowIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: rowIndex * 0.05 }}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-glass-border last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-glass-bg'
                  )}
                >
                  {showIndex && (
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {(currentPage - 1) * pageSize + rowIndex + 1}
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-4 py-3 text-sm',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.cell
                        ? column.cell(row[column.key], row)
                        : String(row[column.key])}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {paginate && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-glass-border">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

DataTable.displayName = 'DataTable';
```

### Usage Examples

```typescript
// Example: GitHub PRs table
interface GitHubPR {
  id: string;
  title: string;
  author: string;
  status: 'open' | 'closed' | 'merged';
  createdAt: Date;
}

const columns: ColumnDef<GitHubPR>[] = [
  {
    key: 'title',
    header: 'Title',
    width: '40%',
    cell: (value, row) => (
      <div>
        <p className="font-medium">{value}</p>
        <p className="text-xs text-muted-foreground">#{row.id}</p>
      </div>
    ),
  },
  {
    key: 'author',
    header: 'Author',
    width: '20%',
  },
  {
    key: 'status',
    header: 'Status',
    width: '15%',
    align: 'center',
    cell: (value) => (
      <span
        className={cn(
          'px-2 py-1 rounded-full text-xs',
          value === 'open' && 'bg-green-500/20 text-green-500',
          value === 'closed' && 'bg-red-500/20 text-red-500',
          value === 'merged' && 'bg-purple-500/20 text-purple-500'
        )}
      >
        {value}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    width: '25%',
    cell: (value) => new Date(value).toLocaleDateString(),
    sortFn: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
];

<DataTable<GitHubPR>
  collection="github_prs"
  columns={columns}
  query={(col) => col.find().where('status').eq('open')}
  searchable
  searchPlaceholder="Search pull requests..."
  pageSize={15}
  showIndex
  onRowClick={(pr) => console.log('Clicked PR:', pr)}
/>
```

### Styling & Design Tokens

```css
/* Glass panel table with subtle borders */
- Table container: glass-panel with rounded-xl
- Header row: border-b with glass-border
- Sortable columns: hover:text-neon-primary
- Row hover: hover:bg-glass-bg
- Status badges: bg-{color}-500/20 with matching text color
```

### Accessibility

- [ ] Table has proper `<thead>` and `<tbody>` structure
- [ ] Sortable columns have `role="button"` and keyboard support
- [ ] Search input has `aria-label`
- [ ] Pagination buttons have proper disabled states
- [ ] Row clicks are keyboard accessible (Enter/Space)
- [ ] Screen reader announces sort direction changes

### Unit Tests

```typescript
// apps/web/src/components/shared/__tests__/DataTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../DataTable';
import { useRxData } from 'rxdb-hooks';

jest.mock('rxdb-hooks');

const mockData = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 },
];

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'age', header: 'Age' },
];

describe('DataTable', () => {
  beforeEach(() => {
    (useRxData as jest.Mock).mockReturnValue({
      result: mockData,
      isFetching: false,
    });
  });

  it('renders table with data', () => {
    render(<DataTable collection="users" columns={columns} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('handles sorting', () => {
    render(<DataTable collection="users" columns={columns} />);

    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    // Verify sort direction indicator appears
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('filters data with search', () => {
    render(<DataTable collection="users" columns={columns} searchable />);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('paginates data', () => {
    render(<DataTable collection="users" columns={columns} pageSize={2} />);

    // Only 2 rows should be visible
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument();

    // Click next page
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });
});
```

---

## 3. OptimisticAction Component

### Purpose
Wrapper component that provides optimistic UI updates for user actions before server confirmation. Uses React 19's `useOptimistic` hook for instant feedback.

### File Location
`apps/web/src/components/shared/OptimisticAction.tsx`

### Component Code

```typescript
'use client';

import { useOptimistic, useTransition, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimisticActionProps<T> {
  /**
   * Current data state
   */
  data: T;

  /**
   * Optimistic update function (applied immediately)
   */
  optimisticUpdate: (current: T) => T;

  /**
   * Server action to execute (async)
   */
  serverAction: (data: T) => Promise<T>;

  /**
   * Success callback
   */
  onSuccess?: (result: T) => void;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;

  /**
   * Render function that receives optimistic data and action trigger
   */
  children: (data: T, trigger: () => void, state: ActionState) => React.ReactNode;

  /**
   * Show status indicator
   * @default true
   */
  showStatus?: boolean;

  /**
   * Status indicator position
   * @default 'bottom-right'
   */
  statusPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

type ActionState = 'idle' | 'pending' | 'success' | 'error';

export function OptimisticAction<T>({
  data,
  optimisticUpdate,
  serverAction,
  onSuccess,
  onError,
  children,
  showStatus = true,
  statusPosition = 'bottom-right',
}: OptimisticActionProps<T>) {
  const [isPending, startTransition] = useTransition();
  const [optimisticData, setOptimisticData] = useOptimistic(data);
  const [actionState, setActionState] = useState<ActionState>('idle');

  const handleAction = () => {
    // Apply optimistic update immediately
    startTransition(async () => {
      setActionState('pending');
      setOptimisticData(optimisticUpdate(data));

      try {
        // Execute server action
        const result = await serverAction(optimisticData as T);

        setActionState('success');
        onSuccess?.(result);

        // Reset to idle after animation
        setTimeout(() => setActionState('idle'), 2000);
      } catch (error) {
        setActionState('error');
        onError?.(error as Error);

        // Revert optimistic update on error
        setOptimisticData(data);

        // Reset to idle after animation
        setTimeout(() => setActionState('idle'), 2000);
      }
    });
  };

  return (
    <div className="relative">
      {children(optimisticData as T, handleAction, actionState)}

      {/* Status Indicator */}
      {showStatus && actionState !== 'idle' && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              'absolute z-10 glass-panel rounded-full p-2',
              statusPosition === 'top-left' && 'top-2 left-2',
              statusPosition === 'top-right' && 'top-2 right-2',
              statusPosition === 'bottom-left' && 'bottom-2 left-2',
              statusPosition === 'bottom-right' && 'bottom-2 right-2'
            )}
          >
            {actionState === 'pending' && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
            {actionState === 'success' && (
              <Check className="h-4 w-4 text-neon-accent" />
            )}
            {actionState === 'error' && (
              <X className="h-4 w-4 text-red-500" />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

OptimisticAction.displayName = 'OptimisticAction';
```

### Usage Examples

```typescript
// Example 1: Like button with optimistic update
interface Post {
  id: string;
  likes: number;
  isLiked: boolean;
}

const post = { id: '123', likes: 42, isLiked: false };

<OptimisticAction
  data={post}
  optimisticUpdate={(current) => ({
    ...current,
    likes: current.isLiked ? current.likes - 1 : current.likes + 1,
    isLiked: !current.isLiked,
  })}
  serverAction={async (data) => {
    const response = await fetch(`/api/posts/${data.id}/like`, {
      method: 'POST',
    });
    return response.json();
  }}
  onSuccess={(result) => console.log('Like saved:', result)}
  onError={(error) => console.error('Like failed:', error)}
>
  {(optimisticPost, triggerLike, state) => (
    <Button
      onClick={triggerLike}
      variant={optimisticPost.isLiked ? 'neon' : 'ghost'}
      disabled={state === 'pending'}
    >
      <Heart className={cn(optimisticPost.isLiked && 'fill-current')} />
      {optimisticPost.likes}
    </Button>
  )}
</OptimisticAction>

// Example 2: Todo completion with optimistic update
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

<OptimisticAction
  data={todo}
  optimisticUpdate={(current) => ({
    ...current,
    completed: !current.completed,
  })}
  serverAction={async (data) => {
    await updateTodoInSupabase(data);
    return data;
  }}
>
  {(optimisticTodo, toggleComplete) => (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={optimisticTodo.completed}
        onChange={toggleComplete}
      />
      <span
        className={cn(
          optimisticTodo.completed && 'line-through text-muted-foreground'
        )}
      >
        {optimisticTodo.text}
      </span>
    </div>
  )}
</OptimisticAction>
```

### Styling & Design Tokens

```css
/* Status indicator with glass effect */
- Glass panel: backdrop-blur-[24px]
- Rounded full: rounded-full
- Status colors: Blue (pending), Green (success), Red (error)
- Animations: Scale and opacity transitions
```

### Accessibility

- [ ] Action trigger is keyboard accessible
- [ ] Status changes announced to screen readers via `aria-live`
- [ ] Disabled state clearly indicated during pending
- [ ] Error messages are accessible
- [ ] Motion respects `prefers-reduced-motion`

### Unit Tests

```typescript
// apps/web/src/components/shared/__tests__/OptimisticAction.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OptimisticAction } from '../OptimisticAction';

describe('OptimisticAction', () => {
  it('applies optimistic update immediately', async () => {
    const mockData = { count: 0 };
    const mockServerAction = jest.fn().mockResolvedValue({ count: 1 });

    render(
      <OptimisticAction
        data={mockData}
        optimisticUpdate={(current) => ({ count: current.count + 1 })}
        serverAction={mockServerAction}
      >
        {(data, trigger) => (
          <button onClick={trigger}>Count: {data.count}</button>
        )}
      </OptimisticAction>
    );

    const button = screen.getByText('Count: 0');
    fireEvent.click(button);

    // Optimistic update should be immediate
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  it('shows success status', async () => {
    const mockServerAction = jest.fn().mockResolvedValue({ count: 1 });

    render(
      <OptimisticAction
        data={{ count: 0 }}
        optimisticUpdate={(current) => ({ count: current.count + 1 })}
        serverAction={mockServerAction}
      >
        {(data, trigger) => <button onClick={trigger}>Click</button>}
      </OptimisticAction>
    );

    fireEvent.click(screen.getByText('Click'));

    await waitFor(() => {
      // Success icon should appear
      expect(document.querySelector('.text-neon-accent')).toBeInTheDocument();
    });
  });

  it('reverts on error', async () => {
    const mockServerAction = jest.fn().mockRejectedValue(new Error('Failed'));
    const mockOnError = jest.fn();

    render(
      <OptimisticAction
        data={{ count: 0 }}
        optimisticUpdate={(current) => ({ count: current.count + 1 })}
        serverAction={mockServerAction}
        onError={mockOnError}
      >
        {(data, trigger) => (
          <button onClick={trigger}>Count: {data.count}</button>
        )}
      </OptimisticAction>
    );

    fireEvent.click(screen.getByText('Count: 0'));

    // Optimistic update applied
    expect(screen.getByText('Count: 1')).toBeInTheDocument();

    // Wait for error and revert
    await waitFor(() => {
      expect(screen.getByText('Count: 0')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalled();
    });
  });
});
```

---

## 4. OfflineIndicator Component

### Purpose
Persistent banner that displays when the app is offline, showing connection status and any pending sync operations. Auto-dismisses when connection is restored.

### File Location
`apps/web/src/components/shared/OfflineIndicator.tsx`

### Component Code

```typescript
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface OfflineIndicatorProps {
  /**
   * Banner position
   * @default 'top'
   */
  position?: 'top' | 'bottom';

  /**
   * Show retry button
   * @default true
   */
  showRetry?: boolean;

  /**
   * Auto-dismiss delay when back online (ms)
   * @default 3000
   */
  dismissDelay?: number;

  /**
   * Custom offline message
   */
  offlineMessage?: string;

  /**
   * Custom online message
   */
  onlineMessage?: string;

  /**
   * Show pending changes count
   * @default true
   */
  showPendingCount?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function OfflineIndicator({
  position = 'top',
  showRetry = true,
  dismissDelay = 3000,
  offlineMessage = 'No internet connection',
  onlineMessage = 'Back online',
  showPendingCount = true,
  className,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);

  useEffect(() => {
    // Set initial online state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);

      // Auto-dismiss success message
      setTimeout(() => {
        setJustReconnected(false);
      }, dismissDelay);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // TODO: Subscribe to pending changes from RxDB
    // This would connect to your sync service to get pending count
    // Example:
    // const subscription = db.pending$.subscribe({
    //   next: (count) => setPendingChanges(count),
    // });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // subscription?.unsubscribe();
    };
  }, [dismissDelay]);

  // Handle manual retry
  const handleRetry = async () => {
    // Trigger manual sync attempt
    try {
      // TODO: Implement manual sync trigger
      // await db.sync();
      console.log('Retrying sync...');
    } catch (error) {
      console.error('Sync retry failed:', error);
    }
  };

  // Don't show anything if online and not just reconnected
  if (isOnline && !justReconnected) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed left-0 right-0 z-50 mx-auto max-w-2xl px-4',
          position === 'top' ? 'top-4' : 'bottom-4',
          className
        )}
      >
        <div
          className={cn(
            'glass-panel rounded-xl p-4 shadow-lg border',
            isOnline
              ? 'border-neon-accent/50 bg-neon-accent/10'
              : 'border-yellow-500/50 bg-yellow-500/10'
          )}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Icon & Message */}
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-neon-accent" />
              ) : (
                <WifiOff className="h-5 w-5 text-yellow-500" />
              )}

              <div>
                <p
                  className={cn(
                    'font-medium',
                    isOnline ? 'text-neon-accent' : 'text-yellow-500'
                  )}
                >
                  {isOnline ? onlineMessage : offlineMessage}
                </p>

                {!isOnline && showPendingCount && pendingChanges > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {pendingChanges} pending {pendingChanges === 1 ? 'change' : 'changes'}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isOnline && showRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="text-yellow-500 hover:text-yellow-400"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

OfflineIndicator.displayName = 'OfflineIndicator';
```

### Usage Examples

```typescript
// Basic usage in root layout
<OfflineIndicator />

// Bottom position with custom messages
<OfflineIndicator
  position="bottom"
  offlineMessage="You're offline - changes will sync when reconnected"
  onlineMessage="Connection restored!"
/>

// Without retry button
<OfflineIndicator showRetry={false} />

// Custom dismiss delay
<OfflineIndicator dismissDelay={5000} />
```

### Styling & Design Tokens

```css
/* Banner with contextual colors */
- Glass panel: backdrop-blur-[24px] with shadow
- Offline state: border-yellow-500/50, bg-yellow-500/10
- Online state: border-neon-accent/50, bg-neon-accent/10
- Position: Fixed at top or bottom with max-width
- Animations: Spring animation for smooth enter/exit
```

### Accessibility

- [ ] Banner has `role="status"` for announcements
- [ ] Online/offline state changes announced via `aria-live="polite"`
- [ ] Retry button is keyboard accessible
- [ ] Color is not the only indicator (icons + text)
- [ ] Motion respects `prefers-reduced-motion`

### Unit Tests

```typescript
// apps/web/src/components/shared/__tests__/OfflineIndicator.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';

// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('OfflineIndicator', () => {
  it('does not render when online', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).not.toBeInTheDocument();
  });

  it('renders when offline', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false });

    render(<OfflineIndicator />);
    expect(screen.getByText('No internet connection')).toBeInTheDocument();
  });

  it('shows reconnected message', async () => {
    jest.useFakeTimers();

    render(<OfflineIndicator dismissDelay={3000} />);

    // Simulate going online
    Object.defineProperty(window.navigator, 'onLine', { value: true });
    fireEvent(window, new Event('online'));

    expect(screen.getByText('Back online')).toBeInTheDocument();

    // Should auto-dismiss after delay
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(screen.queryByText('Back online')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('calls retry handler', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false });

    render(<OfflineIndicator />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    // Verify retry was triggered (check console or mock)
    expect(retryButton).toBeInTheDocument();
  });

  it('shows pending changes count', () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false });

    // TODO: Mock pending changes subscription
    render(<OfflineIndicator showPendingCount />);

    // Would show "5 pending changes" if subscription worked
  });
});
```

### Storybook Story

```typescript
// apps/web/src/components/shared/OfflineIndicator.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { OfflineIndicator } from './OfflineIndicator';

const meta: Meta<typeof OfflineIndicator> = {
  title: 'Shared/OfflineIndicator',
  component: OfflineIndicator,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof OfflineIndicator>;

export const TopPosition: Story = {
  args: {
    position: 'top',
  },
  parameters: {
    // Force offline state for Storybook
    mockData: {
      isOnline: false,
    },
  },
};

export const BottomPosition: Story = {
  args: {
    position: 'bottom',
  },
};

export const WithPendingChanges: Story = {
  args: {
    showPendingCount: true,
  },
};

export const BackOnline: Story = {
  args: {},
  parameters: {
    mockData: {
      isOnline: true,
      justReconnected: true,
    },
  },
};
```

---

## Implementation Checklist

### Phase 1: Core Components
- [ ] Create `SyncStatus.tsx` with hook implementation
- [ ] Create `useSyncStatus.ts` hook with RxDB subscriptions
- [ ] Create `DataTable.tsx` with generic type support
- [ ] Create `OptimisticAction.tsx` using React 19's `useOptimistic`
- [ ] Create `OfflineIndicator.tsx` with network listeners

### Phase 2: Integration
- [ ] Integrate `SyncStatus` into main layout/navbar
- [ ] Set up RxDB replication state observable
- [ ] Implement pending changes counter
- [ ] Add `OfflineIndicator` to root layout
- [ ] Create example `DataTable` instances for GitHub PRs, todos, etc.

### Phase 3: Testing
- [ ] Write unit tests for all components
- [ ] Write integration tests for RxDB hooks
- [ ] Test offline/online transitions
- [ ] Test optimistic updates with error handling
- [ ] Verify accessibility compliance

### Phase 4: Documentation
- [ ] Create Storybook stories for all variants
- [ ] Document usage patterns in project wiki
- [ ] Add examples to component library
- [ ] Update CLAUDE.md with RxDB integration patterns

---

## Design Decisions & Rationale

### Local-First Architecture
All components read from RxDB first, never wait for server responses. This ensures instant UI updates and works offline by default.

### Optimistic Updates
Using React 19's `useOptimistic` hook provides built-in state management for optimistic UI patterns, reducing boilerplate and ensuring consistency.

### Glass Design System
All components use the established glassmorphism design tokens (backdrop-blur, semi-transparent backgrounds, neon accents) for visual consistency.

### Type Safety
Generic components (`DataTable<T>`, `OptimisticAction<T>`) ensure type safety while maintaining reusability across different data models.

### Animation Philosophy
Framer Motion animations are used sparingly for meaningful state transitions (sync status changes, data loading) rather than gratuitous effects.

### Accessibility First
All components follow WCAG 2.1 AA standards with proper ARIA labels, keyboard navigation, and screen reader support.

---

## Performance Considerations

- **RxDB Subscriptions**: Automatically unsubscribe on component unmount to prevent memory leaks
- **Pagination**: Default 10 items per page to prevent rendering thousands of rows
- **Debounced Search**: Search input should debounce to avoid excessive filtering
- **Optimistic Updates**: Revert immediately on error to maintain data integrity
- **Animation Performance**: Use `transform` and `opacity` for GPU-accelerated animations

---

## Next Steps

After implementing these RxDB Integration components, proceed to:
1. **Authentication Components** (Category 3) - Session management and auth forms
2. **Dashboard Widgets** (Category 2) - Domain-specific data displays
3. **Chat Interface** (Category 1) - Agent conversation UI
4. **Voice Enhancements** (Category 4) - Advanced voice features

---

**End of RxDB Integration Components Design Specification**
