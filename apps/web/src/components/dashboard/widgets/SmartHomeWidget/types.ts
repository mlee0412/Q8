/**
 * SmartHomeWidget Types
 * Shared type definitions for smart home components
 */

import type { LucideIcon } from 'lucide-react';

export type CallServiceFn = (
  domain: string,
  service: string,
  entityId?: string | null,
  data?: Record<string, unknown>
) => Promise<boolean>;

export interface HAStateItem {
  entity_id: string;
  state: string;
  attributes: Record<string, string | number | boolean | string[] | null>;
}

export type HAState = Record<string, { state: string; attributes: Record<string, string | number | boolean | string[] | null> }>;

export type TabType = 'home' | 'lights' | 'media' | 'climate';

export interface LightControlConfig {
  entityId: string;
  name: string;
  type: 'hue' | 'led_strip';
  hasEffects: boolean;
}

export interface ColorPreset {
  name: string;
  rgb: [number, number, number];
  gradient: string;
}

export interface LEDEffect {
  name: string;
  value: string;
  gradient: string;
}

export interface HomeTabProps {
  isOn: (entityId: string) => boolean;
  activateScene: (entityId: string) => void;
  toggleEntity: (domain: string, entityId: string) => void;
  sonosVolume: number;
  sonosMuted: boolean;
  setVolume: (level: number) => void;
  toggleMute: () => void;
  callService: CallServiceFn;
  openLightControl: (config: LightControlConfig) => void;
}

export interface LightsTabProps {
  isOn: (entityId: string) => boolean;
  toggleEntity: (domain: string, entityId: string) => void;
  activateScene: (entityId: string) => void;
  callService: CallServiceFn;
  openLightControl: (config: LightControlConfig) => void;
  getAttr: (entityId: string, attr: string) => unknown;
}

export interface MediaTabProps {
  isOn: (entityId: string) => boolean;
  getState: (entityId: string) => string;
  getAttr: (entityId: string, attr: string) => unknown;
  callService: CallServiceFn;
  toggleEntity: (domain: string, entityId: string) => void;
  sonosVolume: number;
  sonosMuted: boolean;
  setVolume: (level: number) => void;
  toggleMute: () => void;
}

export interface ClimateTabProps {
  getState: (entityId: string) => string;
  getAttr: (entityId: string, attr: string) => unknown;
  callService: CallServiceFn;
}

export interface HueSyncBoxCardProps {
  syncBoxPower: boolean;
  lightSync: boolean;
  dolbyVision: boolean;
  syncMode: string;
  intensity: string;
  toggleEntity: (domain: string, entityId: string) => void;
  callService: CallServiceFn;
}

export interface SceneButtonProps {
  icon: LucideIcon;
  label: string;
  gradient: string;
  onClick: () => void;
  onLongPress?: () => void;
  size?: 'sm' | 'md';
}

export interface EntityButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  activeColor?: string;
  onClick: () => void;
  onLongPress?: () => void;
  fullWidth?: boolean;
}

export interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  gradient: string;
  onClick: () => void;
}

export interface RemoteButtonProps {
  icon?: LucideIcon;
  label?: string;
  onClick: () => void;
  size?: 'md' | 'lg';
  color?: string;
}

export interface CoverControlProps {
  label: string;
  state: string;
  onOpen: () => void;
  onClose: () => void;
  onStop: () => void;
}

export interface SmartHomeWidgetProps {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}
