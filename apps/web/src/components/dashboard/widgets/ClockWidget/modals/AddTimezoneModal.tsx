'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Globe, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POPULAR_TIMEZONES } from '../constants';
import type { AddTimezoneModalProps, TimeZoneConfig } from '../types';

export function AddTimezoneModal({
  isOpen,
  onClose,
  onAdd,
  existingTimezones,
}: AddTimezoneModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTimezones = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return POPULAR_TIMEZONES.filter(
      (tz) =>
        !existingTimezones.includes(tz.timezone) &&
        (tz.city.toLowerCase().includes(query) ||
          tz.country.toLowerCase().includes(query) ||
          tz.timezone.toLowerCase().includes(query))
    );
  }, [searchQuery, existingTimezones]);

  const handleSelect = (tz: (typeof POPULAR_TIMEZONES)[0]) => {
    const newTimezone: TimeZoneConfig = {
      id: `tz_${Date.now()}`,
      timezone: tz.timezone,
      city: tz.city,
      country: tz.country,
      label: tz.label,
      isPinned: false,
      sortOrder: 999,
    };
    onAdd(newTimezone);
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-md"
          >
            <div className="surface-matte rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-neon-primary" />
                  <h2 className="text-sm font-semibold text-text-primary">Add Timezone</h2>
                </div>
                <button
                  onClick={onClose}
                  className="btn-icon btn-icon-sm focus-ring"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-border-subtle">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cities..."
                    className="w-full pl-10 pr-4 py-2 bg-surface-4 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-neon-primary/50 outline-none transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              {/* Timezone List */}
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {filteredTimezones.length === 0 ? (
                  <div className="py-8 text-center">
                    <Clock className="h-8 w-8 text-text-muted mx-auto mb-2" />
                    <p className="text-sm text-text-muted">No timezones found</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {filteredTimezones.map((tz) => {
                      const currentTime = new Date().toLocaleTimeString('en-US', {
                        timeZone: tz.timezone,
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });

                      return (
                        <button
                          key={tz.timezone}
                          onClick={() => handleSelect(tz)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-4/50 transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {tz.city}
                            </p>
                            <p className="text-xs text-text-muted">
                              {tz.country} · {tz.timezone}
                            </p>
                          </div>
                          <span className="text-sm font-mono text-text-secondary">
                            {currentTime}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

AddTimezoneModal.displayName = 'AddTimezoneModal';
