'use client';

import { memo, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Minimize2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCalendarStore } from '@/lib/stores/calendar';
import { useCalendarSync } from '../hooks/useCalendarSync';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { CalendarSidebar } from './CalendarSidebar';
import { MiniCalendar } from '../components/MiniCalendar';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { EventDetailPanel } from './EventDetailPanel';
import { CreateEventForm } from './CreateEventForm';
import { SyncStatus } from '../shared/SyncStatus';
import { MONTH_NAMES_FULL } from '../constants';
import type { CalendarCommandCenterProps, CalendarEvent, CalendarEventInput } from '../types';

/**
 * CalendarCommandCenter - Fullscreen calendar expanded view
 *
 * Full-featured calendar with month/week/day/agenda views.
 */
export const CalendarCommandCenter = memo(function CalendarCommandCenter({
  onClose,
  initialView = 'month',
  initialDate,
  selectedEventId,
}: CalendarCommandCenterProps) {
  const {
    calendars,
    selectedCalendarIds,
    currentView,
    currentDate,
    selectedEventId: storeSelectedEventId,
    isCreatingEvent,
    setCurrentView,
    setCurrentDate,
    setSelectedEvent,
    goToToday,
    goToPrevious,
    goToNext,
    setCreatingEvent,
    toggleCalendar,
  } = useCalendarStore();

  const {
    isSyncing,
    lastSyncAt,
    error,
    fetchCalendars,
    syncEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarSync();

  const { events } = useCalendarEvents();

  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [createEventDate, setCreateEventDate] = useState<Date | undefined>();
  const [createEventHour, setCreateEventHour] = useState<number | undefined>();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Initialize on mount
  useEffect(() => {
    if (initialView) setCurrentView(initialView);
    if (initialDate) setCurrentDate(initialDate);
    if (selectedEventId) setSelectedEvent(selectedEventId);
    if (calendars.length === 0) fetchCalendars();
  }, []);

  // Get selected event
  const selectedEvent = storeSelectedEventId
    ? events.find((e) => e.id === storeSelectedEventId) || null
    : null;

  // Format header title
  const headerTitle = (() => {
    const year = currentDate.getFullYear();
    const month = MONTH_NAMES_FULL[currentDate.getMonth()];

    switch (currentView) {
      case 'month':
        return `${month} ${year}`;
      case 'week': {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${MONTH_NAMES_FULL[weekStart.getMonth()] ?? 'Unknown'} ${weekStart.getDate()}-${weekEnd.getDate()}, ${year}`;
        }
        return `${(MONTH_NAMES_FULL[weekStart.getMonth()] ?? 'Unknown').slice(0, 3)} ${weekStart.getDate()} - ${(MONTH_NAMES_FULL[weekEnd.getMonth()] ?? 'Unknown').slice(0, 3)} ${weekEnd.getDate()}, ${year}`;
      }
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      case 'agenda':
        return 'Agenda';
      default:
        return `${month} ${year}`;
    }
  })();

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event.id);
    setIsEditingEvent(false);
  }, [setSelectedEvent]);

  const handleCreateEvent = useCallback(
    (date: Date, hour?: number) => {
      setCreateEventDate(date);
      setCreateEventHour(hour);
      setCreatingEvent(true);
    },
    [setCreatingEvent]
  );

  const handleSaveEvent = useCallback(
    async (eventData: CalendarEventInput) => {
      await createEvent(eventData);
      setCreatingEvent(false);
      syncEvents();
    },
    [createEvent, setCreatingEvent, syncEvents]
  );

  const handleUpdateEvent = useCallback(
    async (eventData: CalendarEventInput) => {
      if (!selectedEvent) return;
      await updateEvent(selectedEvent.google_event_id, eventData);
      setIsEditingEvent(false);
      syncEvents();
    },
    [selectedEvent, updateEvent, syncEvents]
  );

  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEvent) return;
    await deleteEvent(selectedEvent.google_event_id, selectedEvent.google_calendar_id);
    setSelectedEvent(null);
    syncEvents();
  }, [selectedEvent, deleteEvent, setSelectedEvent, syncEvents]);

  const handleClosePanel = useCallback(() => {
    setSelectedEvent(null);
    setIsEditingEvent(false);
  }, [setSelectedEvent]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 md:top-4 md:right-4 z-10 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <Minimize2 className="h-5 w-5" />
      </Button>

      <div className="h-full flex">
        {/* Desktop Sidebar (hidden on mobile via CalendarSidebar's own class) */}
        <CalendarSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          selectedDate={currentDate}
          onDateSelect={setCurrentDate}
          calendars={calendars}
          selectedCalendarIds={selectedCalendarIds}
          onCalendarToggle={toggleCalendar}
          onAddEvent={() => handleCreateEvent(new Date())}
        />

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {showMobileSidebar && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-30 bg-black/60 md:hidden"
                onClick={() => setShowMobileSidebar(false)}
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-y-0 left-0 z-40 w-72 bg-surface-2 border-r border-border-subtle flex flex-col md:hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                  <span className="text-sm font-semibold text-text-primary">Calendar</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowMobileSidebar(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {/* Reuse sidebar content inline for mobile drawer */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <Button
                    variant="default"
                    onClick={() => {
                      handleCreateEvent(new Date());
                      setShowMobileSidebar(false);
                    }}
                    className="w-full bg-neon-primary/20 hover:bg-neon-primary/30 text-neon-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Event
                  </Button>

                  <MiniCalendar
                    selectedDate={currentDate}
                    onDateSelect={(date) => {
                      setCurrentDate(date);
                      setShowMobileSidebar(false);
                    }}
                    events={events}
                    highlightToday
                    showNavigation
                  />

                  <div>
                    <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">View</h3>
                    <div className="grid grid-cols-2 gap-1">
                      {(['month', 'week', 'day', 'agenda'] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => {
                            setCurrentView(view);
                            setShowMobileSidebar(false);
                          }}
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm transition-colors',
                            currentView === view
                              ? 'bg-neon-primary/20 text-neon-primary'
                              : 'text-text-secondary hover:bg-surface-4'
                          )}
                        >
                          {view.charAt(0).toUpperCase() + view.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Calendars</h3>
                    <div className="space-y-1">
                      {calendars.map((calendar, index) => {
                        const isSelected = selectedCalendarIds.includes(calendar.id);
                        return (
                          <button
                            key={`mobile-${calendar.googleAccountId ?? ''}:${calendar.id}:${index}`}
                            onClick={() => toggleCalendar(calendar.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-surface-4"
                          >
                            <div
                              className="w-4 h-4 rounded border-2 flex-shrink-0"
                              style={{
                                borderColor: calendar.backgroundColor,
                                backgroundColor: isSelected ? calendar.backgroundColor : 'transparent',
                              }}
                            />
                            <span className={cn('truncate', isSelected ? 'text-text-primary' : 'text-text-muted')}>
                              {calendar.summary}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3 md:px-6 md:py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden text-white/70 hover:text-white flex-shrink-0"
                onClick={() => setShowMobileSidebar(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-neon-primary flex-shrink-0 hidden md:block" />
              <div className="min-w-0">
                <h1 className="text-base md:text-xl font-bold text-white truncate">{headerTitle}</h1>
                <div className="hidden md:block">
                  <SyncStatus
                    lastSyncAt={lastSyncAt}
                    isSyncing={isSyncing}
                    onSync={() => syncEvents({ forceRefresh: true })}
                    error={error}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="text-white/70 hover:text-white text-xs md:text-sm px-2 md:px-3"
              >
                Today
              </Button>
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="h-7 w-7 md:h-8 md:w-8 text-white/70 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="h-7 w-7 md:h-8 md:w-8 text-white/70 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="default"
                size="icon"
                onClick={() => handleCreateEvent(new Date())}
                className="ml-1 md:ml-2 h-7 w-7 md:h-auto md:w-auto md:px-3 md:py-1.5 bg-neon-primary/20 hover:bg-neon-primary/30 text-neon-primary"
              >
                <Plus className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline text-sm">New Event</span>
              </Button>
            </div>
          </div>

          {/* View Content */}
          <div className="flex-1 overflow-hidden flex">
            <div className={cn(
              'flex-1 overflow-auto',
              selectedEvent && 'hidden md:block md:mr-80'
            )}>
              <AnimatePresence mode="wait">
                {currentView === 'month' && (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <MonthView
                      currentDate={currentDate}
                      events={events}
                      selectedDate={null}
                      onDateSelect={setCurrentDate}
                      onEventClick={handleEventClick}
                      onCreateEvent={handleCreateEvent}
                    />
                  </motion.div>
                )}
                {currentView === 'week' && (
                  <motion.div
                    key="week"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <WeekView
                      currentDate={currentDate}
                      events={events}
                      selectedDate={null}
                      onDateSelect={setCurrentDate}
                      onEventClick={handleEventClick}
                      onCreateEvent={handleCreateEvent}
                    />
                  </motion.div>
                )}
                {currentView === 'day' && (
                  <motion.div
                    key="day"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <DayView
                      currentDate={currentDate}
                      events={events}
                      onEventClick={handleEventClick}
                      onCreateEvent={(hour) => handleCreateEvent(currentDate, hour)}
                    />
                  </motion.div>
                )}
                {currentView === 'agenda' && (
                  <motion.div
                    key="agenda"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <AgendaView
                      events={events}
                      onEventClick={handleEventClick}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Event Detail Panel */}
            <AnimatePresence>
              {selectedEvent && (
                <EventDetailPanel
                  event={selectedEvent}
                  isEditing={isEditingEvent}
                  onClose={handleClosePanel}
                  onEdit={() => setIsEditingEvent(true)}
                  onSave={handleUpdateEvent}
                  onDelete={handleDeleteEvent}
                  onCancelEdit={() => setIsEditingEvent(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Create Event Form */}
      <CreateEventForm
        isOpen={isCreatingEvent}
        onClose={() => setCreatingEvent(false)}
        defaultDate={createEventDate}
        defaultHour={createEventHour}
        calendars={calendars}
        onSave={handleSaveEvent}
      />
    </motion.div>
  );
});

CalendarCommandCenter.displayName = 'CalendarCommandCenter';

export default CalendarCommandCenter;
