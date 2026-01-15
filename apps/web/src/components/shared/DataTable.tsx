'use client';

import { useState, useMemo } from 'react';
import { useRxQuery } from '@/hooks/useRxDB';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
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

  const { data, isLoading: isFetching } = useRxQuery<T>(collection, queryFn);

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
      <div className={cn('surface-matte rounded-xl p-8 text-center', className)}>
        <p className="text-text-muted">{loadingMessage}</p>
      </div>
    );
  }

  // Empty state
  if (!paginatedData || paginatedData.length === 0) {
    return (
      <div className={cn('surface-matte rounded-xl p-8 text-center', className)}>
        <p className="text-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search bar */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 surface-matte rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      {/* Table */}
      <div className="surface-matte rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border-subtle">
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
                    role={column.sortable !== false ? 'button' : undefined}
                    tabIndex={column.sortable !== false ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (column.sortable !== false && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleSort(column.key);
                      }
                    }}
                    aria-sort={
                      sortColumn === column.key
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
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
                            <ChevronUp className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
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
                    'border-b border-border-subtle last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-surface-3'
                  )}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }}
                >
                  {showIndex && (
                    <td className="px-4 py-3 text-sm text-text-muted">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
            <p className="text-sm text-text-muted">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
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
