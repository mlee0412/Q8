'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  Volume2,
  Globe,
  Settings,
  Check,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface VoiceSettingsProps {
  /**
   * Selected microphone device ID
   */
  selectedMicrophone?: string;

  /**
   * Selected speaker device ID
   */
  selectedSpeaker?: string;

  /**
   * Input volume (0-100)
   * @default 80
   */
  inputVolume?: number;

  /**
   * Output volume (0-100)
   * @default 80
   */
  outputVolume?: number;

  /**
   * Selected language
   * @default 'en-US'
   */
  language?: string;

  /**
   * Enable noise suppression
   * @default true
   */
  noiseSuppression?: boolean;

  /**
   * Enable echo cancellation
   * @default true
   */
  echoCancellation?: boolean;

  /**
   * Enable auto gain control
   * @default true
   */
  autoGainControl?: boolean;

  /**
   * Voice detection sensitivity (0-100)
   * @default 50
   */
  sensitivity?: number;

  /**
   * Audio quality preset
   * @default 'balanced'
   */
  audioQuality?: 'low' | 'balanced' | 'high';

  /**
   * Device change callback
   */
  onDeviceChange?: (type: 'microphone' | 'speaker', deviceId: string) => void;

  /**
   * Volume change callback
   */
  onVolumeChange?: (type: 'input' | 'output', volume: number) => void;

  /**
   * Language change callback
   */
  onLanguageChange?: (language: string) => void;

  /**
   * Audio settings change callback
   */
  onAudioSettingsChange?: (settings: {
    noiseSuppression: boolean;
    echoCancellation: boolean;
    autoGainControl: boolean;
    sensitivity: number;
    audioQuality: 'low' | 'balanced' | 'high';
  }) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

/**
 * Voice Settings Component
 *
 * Comprehensive voice configuration panel with device selection,
 * volume controls, language settings, and audio processing options.
 *
 * Features:
 * - Microphone and speaker device enumeration
 * - Input/output volume controls
 * - Multi-language support (7 languages)
 * - Noise suppression, echo cancellation, auto-gain
 * - Voice detection sensitivity
 * - Audio quality presets
 *
 * @example
 * ```tsx
 * // Basic usage
 * <VoiceSettings
 *   onDeviceChange={(type, deviceId) => console.log(type, deviceId)}
 *   onLanguageChange={(lang) => console.log(lang)}
 * />
 *
 * // With custom defaults
 * <VoiceSettings
 *   inputVolume={90}
 *   outputVolume={70}
 *   language="es-ES"
 *   audioQuality="high"
 *   noiseSuppression={false}
 * />
 * ```
 */
export function VoiceSettings({
  selectedMicrophone,
  selectedSpeaker,
  inputVolume = 80,
  outputVolume = 80,
  language = 'en-US',
  noiseSuppression = true,
  echoCancellation = true,
  autoGainControl = true,
  sensitivity = 50,
  audioQuality = 'balanced',
  onDeviceChange,
  onVolumeChange,
  onLanguageChange,
  onAudioSettingsChange,
  className,
}: VoiceSettingsProps) {
  const [microphones, setMicrophones] = useState<AudioDevice[]>([]);
  const [speakers, setSpeakers] = useState<AudioDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [currentMic, setCurrentMic] = useState(selectedMicrophone || '');
  const [currentSpeaker, setCurrentSpeaker] = useState(selectedSpeaker || '');
  const [currentInputVolume, setCurrentInputVolume] = useState(inputVolume);
  const [currentOutputVolume, setCurrentOutputVolume] = useState(outputVolume);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [currentNoiseSuppression, setCurrentNoiseSuppression] = useState(noiseSuppression);
  const [currentEchoCancellation, setCurrentEchoCancellation] = useState(echoCancellation);
  const [currentAutoGain, setCurrentAutoGain] = useState(autoGainControl);
  const [currentSensitivity, setCurrentSensitivity] = useState(sensitivity);
  const [currentAudioQuality, setCurrentAudioQuality] = useState(audioQuality);

  // Supported languages
  const languages = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'ja-JP', label: 'Japanese' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
  ];

  // Load audio devices
  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);

    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // Get devices
      const devices = await navigator.mediaDevices.enumerateDevices();

      const mics = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
          kind: d.kind,
        }));

      const spkrs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 8)}`,
          kind: d.kind,
        }));

      setMicrophones(mics);
      setSpeakers(spkrs);
    } catch (error) {
      console.error('Failed to load audio devices:', error);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Set defaults when devices are loaded
  useEffect(() => {
    if (!currentMic && microphones.length > 0) {
      setCurrentMic(microphones[0]!.deviceId);
    }
  }, [currentMic, microphones]);

  useEffect(() => {
    if (!currentSpeaker && speakers.length > 0) {
      setCurrentSpeaker(speakers[0]!.deviceId);
    }
  }, [currentSpeaker, speakers]);

  // Handle microphone change
  const handleMicrophoneChange = (deviceId: string) => {
    setCurrentMic(deviceId);
    onDeviceChange?.('microphone', deviceId);
  };

  // Handle speaker change
  const handleSpeakerChange = (deviceId: string) => {
    setCurrentSpeaker(deviceId);
    onDeviceChange?.('speaker', deviceId);
  };

  // Handle input volume change
  const handleInputVolumeChange = (volume: number) => {
    setCurrentInputVolume(volume);
    onVolumeChange?.('input', volume);
  };

  // Handle output volume change
  const handleOutputVolumeChange = (volume: number) => {
    setCurrentOutputVolume(volume);
    onVolumeChange?.('output', volume);
  };

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    onLanguageChange?.(lang);
  };

  // Handle audio settings change
  const handleAudioSettingChange = (
    setting: 'noiseSuppression' | 'echoCancellation' | 'autoGainControl',
    value: boolean
  ) => {
    const newSettings = {
      noiseSuppression: currentNoiseSuppression,
      echoCancellation: currentEchoCancellation,
      autoGainControl: currentAutoGain,
      sensitivity: currentSensitivity,
      audioQuality: currentAudioQuality,
    };

    switch (setting) {
      case 'noiseSuppression':
        setCurrentNoiseSuppression(value);
        newSettings.noiseSuppression = value;
        break;
      case 'echoCancellation':
        setCurrentEchoCancellation(value);
        newSettings.echoCancellation = value;
        break;
      case 'autoGainControl':
        setCurrentAutoGain(value);
        newSettings.autoGainControl = value;
        break;
    }

    onAudioSettingsChange?.(newSettings);
  };

  // Handle sensitivity change
  const handleSensitivityChange = (value: number) => {
    setCurrentSensitivity(value);
    onAudioSettingsChange?.({
      noiseSuppression: currentNoiseSuppression,
      echoCancellation: currentEchoCancellation,
      autoGainControl: currentAutoGain,
      sensitivity: value,
      audioQuality: currentAudioQuality,
    });
  };

  // Handle audio quality change
  const handleAudioQualityChange = (quality: 'low' | 'balanced' | 'high') => {
    setCurrentAudioQuality(quality);
    onAudioSettingsChange?.({
      noiseSuppression: currentNoiseSuppression,
      echoCancellation: currentEchoCancellation,
      autoGainControl: currentAutoGain,
      sensitivity: currentSensitivity,
      audioQuality: quality,
    });
  };

  return (
    <div className={cn('surface-matte rounded-xl p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-neon-primary" />
          <h3 className="text-lg font-semibold">Voice Settings</h3>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={loadDevices}
          disabled={isLoadingDevices}
        >
          <RefreshCw className={cn('h-4 w-4', isLoadingDevices && 'animate-spin')} />
        </Button>
      </div>

      {/* Device Selection */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Mic className="h-4 w-4" />
          Audio Devices
        </h4>

        {/* Microphone */}
        <div>
          <label className="text-xs text-text-muted mb-2 block">
            Microphone
          </label>
          <select
            value={currentMic}
            onChange={(e) => handleMicrophoneChange(e.target.value)}
            className="w-full bg-surface-3 border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neon-primary"
          >
            {microphones.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label}
              </option>
            ))}
          </select>
        </div>

        {/* Speaker */}
        <div>
          <label className="text-xs text-text-muted mb-2 block">
            Speaker
          </label>
          <select
            value={currentSpeaker}
            onChange={(e) => handleSpeakerChange(e.target.value)}
            className="w-full bg-surface-3 border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neon-primary"
          >
            {speakers.map((speaker) => (
              <option key={speaker.deviceId} value={speaker.deviceId}>
                {speaker.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Volume Controls */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          Volume
        </h4>

        {/* Input Volume */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-text-muted">
              Input Volume
            </label>
            <span className="text-xs text-neon-primary">{currentInputVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentInputVolume}
            onChange={(e) => handleInputVolumeChange(Number(e.target.value))}
            className="w-full h-2 bg-border-subtle rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Output Volume */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-text-muted">
              Output Volume
            </label>
            <span className="text-xs text-neon-primary">{currentOutputVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentOutputVolume}
            onChange={(e) => handleOutputVolumeChange(Number(e.target.value))}
            className="w-full h-2 bg-border-subtle rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      {/* Language Selection */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Language
        </h4>

        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="w-full bg-surface-3 border border-border-subtle rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neon-primary"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Audio Processing */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Audio Processing</h4>

        {/* Toggles */}
        <div className="space-y-3">
          <ToggleOption
            label="Noise Suppression"
            description="Reduce background noise"
            checked={currentNoiseSuppression}
            onChange={(checked) => handleAudioSettingChange('noiseSuppression', checked)}
          />
          <ToggleOption
            label="Echo Cancellation"
            description="Eliminate audio feedback"
            checked={currentEchoCancellation}
            onChange={(checked) => handleAudioSettingChange('echoCancellation', checked)}
          />
          <ToggleOption
            label="Auto Gain Control"
            description="Automatically adjust volume"
            checked={currentAutoGain}
            onChange={(checked) => handleAudioSettingChange('autoGainControl', checked)}
          />
        </div>

        {/* Sensitivity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-text-muted">
              Voice Detection Sensitivity
            </label>
            <span className="text-xs text-neon-primary">{currentSensitivity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentSensitivity}
            onChange={(e) => handleSensitivityChange(Number(e.target.value))}
            className="w-full h-2 bg-border-subtle rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Audio Quality */}
        <div>
          <label className="text-xs text-text-muted mb-2 block">
            Audio Quality
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'balanced', 'high'] as const).map((quality) => (
              <button
                key={quality}
                onClick={() => handleAudioQualityChange(quality)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm transition-all',
                  currentAudioQuality === quality
                    ? 'bg-neon-primary text-white'
                    : 'bg-surface-3 hover:bg-surface-3/80'
                )}
              >
                {quality.charAt(0).toUpperCase() + quality.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

VoiceSettings.displayName = 'VoiceSettings';

// Toggle Option Component
interface ToggleOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleOption({ label, description, checked, onChange }: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>

      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-neon-primary' : 'bg-border-subtle'
        )}
        aria-label={`Toggle ${label}`}
        aria-checked={checked}
        role="switch"
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-lg flex items-center justify-center"
        >
          {checked && <Check className="h-3 w-3 text-neon-primary" />}
        </motion.div>
      </button>
    </div>
  );
}
