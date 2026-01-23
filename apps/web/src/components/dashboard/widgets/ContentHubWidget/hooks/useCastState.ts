/**
 * useCastState Hook
 * Manages casting/device selection state for ContentHub
 */

import { useState, useCallback } from 'react';
import { useContentHub } from '@/hooks/useContentHub';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { useSpotifyWebPlayback } from '@/hooks/useSpotifyWebPlayback';
import { logger } from '@/lib/logger';
import type { ContentItem, CastMessage } from '../types';
import type { SpotifyDevice } from '../DeviceSelectorModal';

interface UseCastStateReturn {
  castLoading: boolean;
  castMessage: CastMessage | null;
  showDeviceSelector: boolean;
  currentDeviceName: string | null;
  setCastMessage: (message: CastMessage | null) => void;
  setShowDeviceSelector: (show: boolean) => void;
  openDeviceSelector: () => void;
  handleSmartHome: (nowPlaying: ContentItem | null) => Promise<void>;
  handleDeviceSelect: (deviceId: string, deviceName: string) => Promise<{ success: boolean; message: string }>;
  getDevicesWithWebPlayer: () => Promise<SpotifyDevice[]>;
}

export function useCastState(): UseCastStateReturn {
  const { castToDevice, getSpotifyDevices, transferSpotifyPlayback } = useContentHub();
  const { setError } = useContentHubStore();
  const webPlayback = useSpotifyWebPlayback();

  const [castLoading, setCastLoading] = useState(false);
  const [castMessage, setCastMessage] = useState<CastMessage | null>(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [currentDeviceName, setCurrentDeviceName] = useState<string | null>(null);

  const openDeviceSelector = useCallback(() => {
    setShowDeviceSelector(true);
  }, []);

  // Get devices with web player included
  const getDevicesWithWebPlayer = useCallback(async (): Promise<SpotifyDevice[]> => {
    const devices = await getSpotifyDevices();

    if (webPlayback.isReady && webPlayback.deviceId) {
      const webPlayerDevice: SpotifyDevice = {
        id: webPlayback.deviceId,
        name: `${webPlayback.deviceName} (This Browser)`,
        type: 'Computer',
        isActive: webPlayback.isActive,
        volume: webPlayback.volume,
        supportsVolume: true,
      };
      return [webPlayerDevice, ...devices.filter((d: SpotifyDevice) => d.id !== webPlayback.deviceId)];
    }

    return devices;
  }, [getSpotifyDevices, webPlayback.isReady, webPlayback.deviceId, webPlayback.deviceName, webPlayback.isActive, webPlayback.volume]);

  // Device selection handler
  const handleDeviceSelect = useCallback(
    async (deviceId: string, deviceName: string): Promise<{ success: boolean; message: string }> => {
      const { nowPlaying } = useContentHubStore.getState();

      if (deviceId === webPlayback.deviceId) {
        setCurrentDeviceName(deviceName);
        if (nowPlaying?.source === 'spotify' && nowPlaying?.sourceMetadata?.uri) {
          await webPlayback.play(nowPlaying.sourceMetadata.uri as string);
          return { success: true, message: `Playing on ${deviceName}` };
        }
        return { success: true, message: `Switched to ${deviceName}` };
      }

      const result = await transferSpotifyPlayback(deviceId, deviceName);
      if (result.success) {
        setCurrentDeviceName(deviceName);
        return { success: true, message: result.message || `Switched to ${deviceName}` };
      }
      return { success: false, message: result.error || 'Failed to transfer playback' };
    },
    [transferSpotifyPlayback, webPlayback]
  );

  // Smart Home casting handler
  const handleSmartHome = useCallback(
    async (nowPlaying: ContentItem | null) => {
      if (!nowPlaying) {
        setError('No content to cast');
        return;
      }

      if (nowPlaying.source === 'spotify') {
        openDeviceSelector();
        return;
      }

      setCastLoading(true);
      setCastMessage({ type: 'loading', text: 'Launching YouTube on Apple TV...' });

      try {
        const result = await castToDevice(nowPlaying, 'media_player.living_room');
        if (result.success) {
          setError(null);
          setCastMessage({ type: 'success', text: 'YouTube launched on Apple TV!' });
          setTimeout(() => setCastMessage(null), 4000);
        } else {
          setCastMessage({
            type: 'error',
            text: result.error || 'Cast failed. Try opening in browser instead.',
            fallbackUrl: nowPlaying.playbackUrl || nowPlaying.deepLinkUrl,
          });
        }
      } catch (error) {
        logger.error('Cast error', { error });
        setCastMessage({
          type: 'error',
          text: 'Cast failed. Try opening in browser instead.',
          fallbackUrl: nowPlaying.playbackUrl || nowPlaying.deepLinkUrl,
        });
      } finally {
        setCastLoading(false);
      }
    },
    [castToDevice, setError, openDeviceSelector]
  );

  return {
    castLoading,
    castMessage,
    showDeviceSelector,
    currentDeviceName,
    setCastMessage,
    setShowDeviceSelector,
    openDeviceSelector,
    handleSmartHome,
    handleDeviceSelect,
    getDevicesWithWebPlayer,
  };
}

export default useCastState;
