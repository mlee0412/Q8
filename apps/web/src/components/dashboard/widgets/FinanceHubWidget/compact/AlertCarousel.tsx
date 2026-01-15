'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Calendar, 
  TrendingUp, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePrivacyMode, useUpcomingBillsRaw, computeUpcomingBills, useActiveAlerts } from '@/lib/stores/financehub';
import { formatCurrency } from '@/types/finance';
import type { FinanceAlert, RecurringItem } from '@/types/finance';

interface AlertCarouselProps {
  className?: string;
  autoRotate?: boolean;
  rotateInterval?: number;
}

type CarouselItem = {
  id: string;
  type: 'bill' | 'alert';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  color: string;
  amount?: number;
};

/**
 * AlertCarousel Component
 *
 * Rotating carousel showing:
 * - Upcoming bills (from recurring)
 * - Spending anomalies
 * - Market alerts
 * - Budget warnings
 */
export function AlertCarousel({ 
  className, 
  autoRotate = true,
  rotateInterval = 5000 
}: AlertCarouselProps) {
  const privacyMode = usePrivacyMode();
  const recurringRaw = useUpcomingBillsRaw();
  const alerts = useActiveAlerts();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Memoize upcoming bills computation to prevent infinite loops
  const upcomingBills = useMemo(
    () => computeUpcomingBills(recurringRaw, 7),
    [recurringRaw]
  );

  // Build carousel items from bills and alerts
  const items: CarouselItem[] = [
    // Map upcoming bills
    ...upcomingBills.map((bill): CarouselItem => ({
      id: `bill-${bill.id}`,
      type: 'bill',
      icon: bill.daysUntilDue <= 1 ? AlertTriangle : Calendar,
      title: bill.name,
      subtitle: bill.daysUntilDue === 0 
        ? 'Due today!' 
        : bill.daysUntilDue === 1 
        ? 'Due tomorrow'
        : `Due in ${bill.daysUntilDue} days`,
      color: bill.daysUntilDue <= 1 ? 'text-danger' : 'text-yellow-400',
      amount: bill.amount,
    })),
    // Map active alerts
    ...alerts.slice(0, 5).map((alert): CarouselItem => ({
      id: `alert-${alert.id}`,
      type: 'alert',
      icon: alert.type === 'anomaly' ? TrendingUp 
        : alert.type === 'budget_exceeded' ? AlertTriangle 
        : alert.type === 'low_balance' ? CreditCard
        : Bell,
      title: alert.title,
      subtitle: alert.message,
      color: alert.severity === 'error' ? 'text-danger'
        : alert.severity === 'warning' ? 'text-yellow-400'
        : 'text-blue-400',
    })),
  ];

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate || items.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, rotateInterval);

    return () => clearInterval(timer);
  }, [autoRotate, items.length, rotateInterval]);

  // Reset index if items change
  useEffect(() => {
    if (currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [items.length, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  // Empty state
  if (items.length === 0) {
    return (
      <div className={cn('p-3 flex items-center justify-center', className)}>
        <div className="text-center">
          <Bell className="h-5 w-5 text-text-muted mx-auto mb-1 opacity-50" />
          <p className="text-xs text-text-muted">No alerts</p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  const Icon = currentItem.icon;

  return (
    <div className={cn('relative', className)}>
      {/* Navigation buttons */}
      {items.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 z-10"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 z-10"
            onClick={handleNext}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </>
      )}

      {/* Carousel content */}
      <div className="px-8 py-3 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3"
          >
            <div className={cn('p-2 rounded-lg bg-surface-3', currentItem.color)}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {currentItem.title}
                </span>
                {currentItem.amount && !privacyMode && (
                  <span className={cn('text-sm font-semibold', currentItem.color)}>
                    {formatCurrency(Math.abs(currentItem.amount))}
                  </span>
                )}
                {currentItem.amount && privacyMode && (
                  <span className="text-sm font-semibold blur-sm">$•••</span>
                )}
              </div>
              <p className="text-xs text-text-muted truncate">
                {currentItem.subtitle}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {items.map((_, i) => (
            <button
              key={i}
              className={cn(
                'h-1 rounded-full transition-all',
                i === currentIndex 
                  ? 'w-3 bg-neon-primary'
                  : 'w-1 bg-border-subtle hover:bg-text-muted'
              )}
              onClick={() => setCurrentIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

AlertCarousel.displayName = 'AlertCarousel';
