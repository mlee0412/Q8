'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

/**
 * Widget identifier types
 */
export type WidgetId = 'tasks' | 'calendar' | 'finance' | 'home' | 'weather' | 'github' | 'daily-brief';

/**
 * Widget action types
 */
export type WidgetActionType = 'refresh' | 'create' | 'update' | 'delete' | 'navigate';

/**
 * Widget update payload
 */
export interface WidgetUpdate {
  widgetId: WidgetId;
  action: WidgetActionType;
  data?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Widget subscription callback
 */
export type WidgetUpdateCallback = (update: WidgetUpdate) => void;

/**
 * Context value interface
 */
interface WidgetUpdateContextValue {
  /**
   * Push an update to trigger widget refresh/action
   */
  pushUpdate: (update: Omit<WidgetUpdate, 'timestamp'>) => void;

  /**
   * Subscribe a widget to receive updates
   */
  subscribeWidget: (widgetId: WidgetId, callback: WidgetUpdateCallback) => () => void;

  /**
   * Get the last update for a widget
   */
  getLastUpdate: (widgetId: WidgetId) => WidgetUpdate | null;

  /**
   * Get all pending updates for a widget (clears after retrieval)
   */
  getPendingUpdates: (widgetId: WidgetId) => WidgetUpdate[];

  /**
   * Clear pending updates for a widget
   */
  clearPendingUpdates: (widgetId: WidgetId) => void;
}

const WidgetUpdateContext = createContext<WidgetUpdateContextValue | null>(null);

interface WidgetUpdateProviderProps {
  children: ReactNode;
}

/**
 * WidgetUpdateProvider
 *
 * Provides bidirectional communication between chat/agents and dashboard widgets
 * Enables agents to trigger widget refreshes, create actions, and more
 */
export function WidgetUpdateProvider({ children }: WidgetUpdateProviderProps) {
  // Store subscriptions per widget
  const [subscriptions, setSubscriptions] = useState<
    Map<WidgetId, Set<WidgetUpdateCallback>>
  >(new Map());

  // Store last update per widget
  const [lastUpdates, setLastUpdates] = useState<Map<WidgetId, WidgetUpdate>>(
    new Map()
  );

  // Store pending updates per widget (for widgets that aren't subscribed yet)
  const [pendingUpdates, setPendingUpdates] = useState<
    Map<WidgetId, WidgetUpdate[]>
  >(new Map());

  /**
   * Push an update to subscribed widgets
   */
  const pushUpdate = useCallback(
    (update: Omit<WidgetUpdate, 'timestamp'>) => {
      const fullUpdate: WidgetUpdate = {
        ...update,
        timestamp: new Date(),
      };

      // Store as last update
      setLastUpdates((prev) => {
        const next = new Map(prev);
        next.set(update.widgetId, fullUpdate);
        return next;
      });

      // Get subscriptions for this widget
      const widgetSubs = subscriptions.get(update.widgetId);

      if (widgetSubs && widgetSubs.size > 0) {
        // Notify all subscribers
        widgetSubs.forEach((callback) => {
          try {
            callback(fullUpdate);
          } catch (error) {
            console.error(
              `Error in widget update callback for ${update.widgetId}:`,
              error
            );
          }
        });
      } else {
        // No subscribers - store as pending
        setPendingUpdates((prev) => {
          const next = new Map(prev);
          const existing = next.get(update.widgetId) || [];
          next.set(update.widgetId, [...existing, fullUpdate]);
          return next;
        });
      }
    },
    [subscriptions]
  );

  /**
   * Subscribe a widget to receive updates
   */
  const subscribeWidget = useCallback(
    (widgetId: WidgetId, callback: WidgetUpdateCallback) => {
      setSubscriptions((prev) => {
        const next = new Map(prev);
        const existing = next.get(widgetId) || new Set();
        existing.add(callback);
        next.set(widgetId, existing);
        return next;
      });

      // Return unsubscribe function
      return () => {
        setSubscriptions((prev) => {
          const next = new Map(prev);
          const existing = next.get(widgetId);
          if (existing) {
            existing.delete(callback);
            if (existing.size === 0) {
              next.delete(widgetId);
            }
          }
          return next;
        });
      };
    },
    []
  );

  /**
   * Get the last update for a widget
   */
  const getLastUpdate = useCallback(
    (widgetId: WidgetId): WidgetUpdate | null => {
      return lastUpdates.get(widgetId) || null;
    },
    [lastUpdates]
  );

  /**
   * Get all pending updates for a widget
   */
  const getPendingUpdates = useCallback(
    (widgetId: WidgetId): WidgetUpdate[] => {
      return pendingUpdates.get(widgetId) || [];
    },
    [pendingUpdates]
  );

  /**
   * Clear pending updates for a widget
   */
  const clearPendingUpdates = useCallback((widgetId: WidgetId) => {
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.delete(widgetId);
      return next;
    });
  }, []);

  const value: WidgetUpdateContextValue = {
    pushUpdate,
    subscribeWidget,
    getLastUpdate,
    getPendingUpdates,
    clearPendingUpdates,
  };

  return (
    <WidgetUpdateContext.Provider value={value}>
      {children}
    </WidgetUpdateContext.Provider>
  );
}

/**
 * Hook to use widget update context
 */
export function useWidgetUpdates() {
  const context = useContext(WidgetUpdateContext);
  if (!context) {
    throw new Error(
      'useWidgetUpdates must be used within a WidgetUpdateProvider'
    );
  }
  return context;
}

/**
 * Hook for widgets to subscribe to updates and get helpers
 */
export function useWidgetSubscription(widgetId: WidgetId) {
  const { subscribeWidget, getLastUpdate, getPendingUpdates, clearPendingUpdates } =
    useWidgetUpdates();
  const [updates, setUpdates] = useState<WidgetUpdate[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to updates
  useEffect(() => {
    const unsubscribe = subscribeWidget(widgetId, (update) => {
      setUpdates((prev) => [...prev, update]);

      // Trigger refresh for refresh actions
      if (update.action === 'refresh') {
        setRefreshKey((prev) => prev + 1);
      }
    });

    // Process any pending updates
    const pending = getPendingUpdates(widgetId);
    if (pending.length > 0) {
      setUpdates((prev) => [...prev, ...pending]);
      clearPendingUpdates(widgetId);

      // Check for refresh actions in pending
      if (pending.some((u) => u.action === 'refresh')) {
        setRefreshKey((prev) => prev + 1);
      }
    }

    return unsubscribe;
  }, [widgetId, subscribeWidget, getPendingUpdates, clearPendingUpdates]);

  // Get the most recent update
  const lastUpdate = updates.length > 0 ? updates[updates.length - 1] : null;

  // Clear processed updates
  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  return {
    updates,
    lastUpdate,
    refreshKey,
    clearUpdates,
    getLastUpdate: () => getLastUpdate(widgetId),
  };
}

WidgetUpdateProvider.displayName = 'WidgetUpdateProvider';
