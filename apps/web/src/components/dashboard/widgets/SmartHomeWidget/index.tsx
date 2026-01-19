'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Thermometer,
  Lightbulb,
  Tv,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ENTITIES } from './constants';
import { LightControlModal } from './modals';
import { HomeTab, LightsTab, MediaTab, ClimateTab } from './tabs';
import type {
  SmartHomeWidgetProps,
  HAState,
  HAStateItem,
  TabType,
  LightControlConfig,
  CallServiceFn,
} from './types';

export function SmartHomeWidget({
  colSpan = 2,
  rowSpan = 3,
  className,
}: SmartHomeWidgetProps) {
  const [states, setStates] = useState<HAState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lightModal, setLightModal] = useState<LightControlConfig | null>(null);

  const openLightControl = useCallback((config: LightControlConfig) => {
    setLightModal(config);
  }, []);

  const closeLightControl = useCallback(() => {
    setLightModal(null);
  }, []);

  const fetchStates = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const allEntities = [
        ENTITIES.climate,
        ...Object.values(ENTITIES.scenes),
        ...Object.values(ENTITIES.remotes),
        ...Object.values(ENTITIES.media),
        ...Object.values(ENTITIES.syncBox),
        ...Object.values(ENTITIES.covers),
        ...Object.values(ENTITIES.switches),
        ...Object.values(ENTITIES.lights),
        ...Object.values(ENTITIES.sonos),
      ];

      const response = await fetch(
        `/api/homeassistant?entities=${allEntities.join(',')}`
      );

      if (!response.ok) throw new Error('Failed to fetch states');

      const data = await response.json() as { states?: HAStateItem[] };
      const stateMap: HAState = {};
      data.states?.forEach((s: HAStateItem) => {
        stateMap[s.entity_id] = { state: s.state, attributes: s.attributes };
      });
      setStates(stateMap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStates();
    const interval = setInterval(fetchStates, 10000);
    return () => clearInterval(interval);
  }, [fetchStates]);

  const callService: CallServiceFn = async (
    domain: string,
    service: string,
    entityId?: string | null,
    data?: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/homeassistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, service, entity_id: entityId, data }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error('Service call failed:', result.error);
        return false;
      }
      setTimeout(fetchStates, 500);
      return true;
    } catch (err) {
      console.error('Service call failed:', err);
      return false;
    }
  };

  const getState = (entityId: string) => states[entityId]?.state || 'unavailable';
  const getAttr = (entityId: string, attr: string) => states[entityId]?.attributes?.[attr];
  const isOn = (entityId: string) => getState(entityId) === 'on';
  const toggleEntity = (domain: string, entityId: string) => callService(domain, 'toggle', entityId);
  const activateScene = (entityId: string) => callService('scene', 'turn_on', entityId);

  const sonosVolume = Math.round(((getAttr(ENTITIES.media.sonos, 'volume_level') as number) || 0) * 100);
  const sonosMuted = getAttr(ENTITIES.media.sonos, 'is_volume_muted') as boolean;
  const setVolume = (level: number) => callService('media_player', 'volume_set', ENTITIES.media.sonos, { volume_level: level / 100 });
  const toggleMute = () => callService('media_player', 'volume_mute', ENTITIES.media.sonos, { is_volume_muted: !sonosMuted });

  const tabs: { id: TabType; icon: LucideIcon; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'lights', icon: Lightbulb, label: 'Lights' },
    { id: 'media', icon: Tv, label: 'Media' },
    { id: 'climate', icon: Thermometer, label: 'Climate' },
  ];

  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

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
      className={cn('surface-matte overflow-hidden flex flex-col w-full', colSpanClasses[colSpan], rowSpanClasses[rowSpan], className)}
    >
      {/* Header */}
      <div className="widget-header px-4 py-3 border-b border-border-subtle">
        <div className="widget-header-title">
          <Home className="h-4 w-4 text-neon-primary" />
          <h3 className="text-heading text-sm">Smart Home</h3>
        </div>
        <button
          className="btn-icon btn-icon-sm focus-ring"
          onClick={fetchStates}
          disabled={isRefreshing}
          aria-label="Refresh states"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors focus-ring',
              activeTab === tab.id
                ? 'text-neon-primary border-b-2 border-neon-primary'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-8 w-8 animate-spin text-text-muted" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <AlertTriangle className="h-8 w-8 text-warning" />
            <p className="text-sm text-text-muted">{error}</p>
            <button className="btn-ghost text-sm focus-ring" onClick={fetchStates}>
              Retry
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {activeTab === 'home' && (
                <HomeTab
                  isOn={isOn}
                  activateScene={activateScene}
                  toggleEntity={toggleEntity}
                  sonosVolume={sonosVolume}
                  sonosMuted={sonosMuted}
                  setVolume={setVolume}
                  toggleMute={toggleMute}
                  callService={callService}
                  openLightControl={openLightControl}
                />
              )}
              {activeTab === 'lights' && (
                <LightsTab
                  isOn={isOn}
                  toggleEntity={toggleEntity}
                  activateScene={activateScene}
                  callService={callService}
                  openLightControl={openLightControl}
                  getAttr={getAttr}
                />
              )}
              {activeTab === 'media' && (
                <MediaTab
                  isOn={isOn}
                  getState={getState}
                  getAttr={getAttr}
                  callService={callService}
                  toggleEntity={toggleEntity}
                  sonosVolume={sonosVolume}
                  sonosMuted={sonosMuted}
                  setVolume={setVolume}
                  toggleMute={toggleMute}
                />
              )}
              {activeTab === 'climate' && (
                <ClimateTab
                  getState={getState}
                  getAttr={getAttr}
                  callService={callService}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Light Control Modal */}
      {lightModal && (
        <LightControlModal
          isOpen={!!lightModal}
          onClose={closeLightControl}
          config={lightModal}
          currentBrightness={Math.round(((getAttr(lightModal.entityId, 'brightness') as number) || 0) / 255 * 100)}
          currentColor={(getAttr(lightModal.entityId, 'rgb_color') as [number, number, number] | null) || null}
          isOn={isOn(lightModal.entityId)}
          callService={callService}
        />
      )}
    </motion.div>
  );
}

SmartHomeWidget.displayName = 'SmartHomeWidget';

// Re-export types for external use
export type { SmartHomeWidgetProps, LightControlConfig } from './types';
