'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tv,
  CircleDot,
  Gamepad2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Power,
  Undo2,
  Volume1,
  Volume2,
  VolumeX,
  Palette,
  Zap,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ENTITIES } from '../constants';
import { ActionButton, EntityButton } from '../components';
import type { MediaTabProps, HueSyncBoxCardProps } from '../types';

export function MediaTab({ isOn, getState, callService, toggleEntity, sonosVolume, sonosMuted, setVolume, toggleMute }: MediaTabProps) {
  const syncBoxPower = isOn(ENTITIES.syncBox.power);
  const lightSync = isOn(ENTITIES.syncBox.lightSync);
  const dolbyVision = isOn(ENTITIES.syncBox.dolbyVision);
  const syncMode = getState(ENTITIES.syncBox.syncMode);
  const intensity = getState(ENTITIES.syncBox.intensity);

  return (
    <>
      <section>
        <div className="grid grid-cols-3 gap-2">
          <ActionButton icon={Tv} label="TV Power" gradient="from-red-500 to-rose-600" onClick={() => callService('homeassistant', 'toggle', ENTITIES.remotes.samsungTV)} />
          <ActionButton icon={CircleDot} label="Apple TV" gradient="from-gray-700 to-gray-900" onClick={async () => {
            await callService('remote', 'turn_on', ENTITIES.remotes.samsungTV);
            await callService('switch', 'turn_on', ENTITIES.syncBox.power);
            await callService('select', 'select_option', ENTITIES.syncBox.hdmiInput, { option: 'APPLE TV' });
            await callService('remote', 'turn_on', ENTITIES.remotes.appleTV);
            setTimeout(() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'home' }), 1000);
          }} />
          <ActionButton icon={Gamepad2} label="Nintendo" gradient="from-red-600 to-red-800" onClick={async () => {
            await callService('remote', 'turn_on', ENTITIES.remotes.samsungTV);
            await callService('switch', 'turn_on', ENTITIES.syncBox.power);
            await callService('select', 'select_option', ENTITIES.syncBox.hdmiInput, { option: 'Nintendo Switch' });
          }} />
        </div>
      </section>

      <section>
        <div className="card-item rounded-xl p-3 space-y-3">
          {/* Navigation D-Pad */}
          <div className="grid grid-cols-3 gap-1.5">
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'menu' })}
              className="h-14 rounded-xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-glass-border flex items-center justify-center gap-2 text-white/80 hover:text-white hover:border-white/20 transition-all"
            >
              <Undo2 className="h-4 w-4" />
              <span className="text-xs font-medium">Back</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(59,130,246,0.3)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'up' })}
              className="h-14 rounded-xl bg-gradient-to-b from-gray-600/80 to-gray-700/80 border border-glass-border flex items-center justify-center text-white hover:border-blue-500/50 hover:from-blue-600/30 hover:to-blue-700/30 transition-all"
            >
              <ChevronUp className="h-7 w-7" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'home' })}
              className="h-14 rounded-xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-glass-border flex items-center justify-center gap-2 text-white/80 hover:text-white hover:border-white/20 transition-all"
            >
              <Tv className="h-4 w-4" />
              <span className="text-xs font-medium">Home</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(59,130,246,0.3)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'left' })}
              className="h-16 rounded-xl bg-gradient-to-r from-gray-600/80 to-gray-700/80 border border-glass-border flex items-center justify-center text-white hover:border-blue-500/50 hover:from-blue-600/30 hover:to-blue-700/30 transition-all"
            >
              <ChevronLeft className="h-7 w-7" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'select' })}
              className="h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400/30 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white hover:shadow-blue-500/40 hover:border-blue-400/50 transition-all"
            >
              <span className="text-sm font-bold">OK</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(59,130,246,0.3)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'right' })}
              className="h-16 rounded-xl bg-gradient-to-l from-gray-600/80 to-gray-700/80 border border-glass-border flex items-center justify-center text-white hover:border-blue-500/50 hover:from-blue-600/30 hover:to-blue-700/30 transition-all"
            >
              <ChevronRight className="h-7 w-7" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'skip_backward' })}
              className="h-14 rounded-xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-glass-border flex items-center justify-center text-white/80 hover:text-white hover:border-white/20 transition-all"
            >
              <SkipBack className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(59,130,246,0.3)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'down' })}
              className="h-14 rounded-xl bg-gradient-to-t from-gray-600/80 to-gray-700/80 border border-glass-border flex items-center justify-center text-white hover:border-blue-500/50 hover:from-blue-600/30 hover:to-blue-700/30 transition-all"
            >
              <ChevronDown className="h-7 w-7" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'skip_forward' })}
              className="h-14 rounded-xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-glass-border flex items-center justify-center text-white/80 hover:text-white hover:border-white/20 transition-all"
            >
              <SkipForward className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Playback Controls */}
          <div className="grid grid-cols-3 gap-1.5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('media_player', 'media_previous_track', ENTITIES.media.appleTV)}
              className="h-12 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center gap-2 text-white/70 hover:text-white hover:border-white/20 transition-all"
            >
              <SkipBack className="h-4 w-4" />
              <span className="text-xs">Prev</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => callService('media_player', 'media_play_pause', ENTITIES.media.appleTV)}
              className="h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 border border-green-400/20 shadow-md flex items-center justify-center text-white hover:shadow-green-500/30 transition-all"
            >
              <Play className="h-5 w-5 mr-[-2px]" />
              <Pause className="h-5 w-5 ml-[-2px]" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('media_player', 'media_next_track', ENTITIES.media.appleTV)}
              className="h-12 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center gap-2 text-white/70 hover:text-white hover:border-white/20 transition-all"
            >
              <span className="text-xs">Next</span>
              <SkipForward className="h-4 w-4" />
            </motion.button>
          </div>

          {/* App Shortcuts */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-4 gap-1.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'YouTube' })}
                className="h-11 rounded-xl bg-[#FF0000] text-white shadow-md border border-white/10 flex items-center justify-center"
                title="YouTube"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Netflix' })}
                className="h-11 rounded-xl bg-[#141414] text-[#E50914] shadow-md border border-white/10 flex items-center justify-center"
                title="Netflix"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.913.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z"/>
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Disney+' })}
                className="h-11 rounded-xl bg-[#0063e5] text-white shadow-md border border-white/10 flex items-center justify-center"
                title="Disney+"
              >
                <svg viewBox="0 0 52 24" className="h-5 w-10" fill="white">
                  <text x="2" y="17" fontSize="14" fontWeight="bold" fontFamily="system-ui" fontStyle="italic">Disney</text>
                  <text x="42" y="17" fontSize="12" fontWeight="bold" fontFamily="system-ui">+</text>
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Apple TV+' })}
                className="h-11 rounded-xl bg-black text-white shadow-md border border-white/20 flex items-center justify-center gap-0.5"
                title="Apple TV+"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="text-[10px] font-bold">tv+</span>
              </motion.button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Prime Video' })}
                className="h-11 rounded-xl bg-[#232F3E] shadow-md border border-white/10 flex flex-col items-center justify-center py-1"
                title="Prime Video"
              >
                <span className="text-white text-[9px] font-medium tracking-tight">prime</span>
                <svg viewBox="0 0 40 12" className="w-8 h-3 -mt-0.5">
                  <path fill="#00A8E1" d="M2 8 Q20 14 38 8" strokeWidth="2.5" stroke="#00A8E1" strokeLinecap="round" fillOpacity="0"/>
                  <path fill="#00A8E1" d="M34 4 L38 8 L34 6 Z"/>
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Spotify' })}
                className="h-11 rounded-xl bg-[#191414] text-[#1DB954] shadow-md border border-white/10 flex items-center justify-center"
                title="Spotify"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Kiwi+' })}
                className="h-11 rounded-xl bg-[#FFEB3B] shadow-md border border-white/10 flex items-center justify-center gap-0.5 px-2"
                title="Kiwi+ (Korean Streaming)"
              >
                <span className="text-white font-bold text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" style={{ fontFamily: 'system-ui', letterSpacing: '-0.5px' }}>kiwi</span>
                <span className="text-[#E91E63] text-lg font-bold -mt-2 -ml-0.5">•</span>
                <span className="text-[#7CB342] font-bold text-base ml-0.5">+</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  await callService('remote', 'turn_off', ENTITIES.remotes.appleTV);
                  await callService('switch', 'turn_off', ENTITIES.syncBox.power);
                  await callService('remote', 'turn_off', ENTITIES.remotes.samsungTV);
                }}
                className="h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md border border-white/10 flex items-center justify-center gap-1.5 hover:from-red-900 hover:to-red-950 transition-all"
                title="Turn off all media devices"
              >
                <Power className="h-4 w-4" />
                <span className="text-[10px] font-semibold">Sleep</span>
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* Sonos Volume */}
      <section>
        <div className="card-item rounded-xl p-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setVolume(Math.max(0, sonosVolume - 5))}
              className="h-10 w-10 rounded-full bg-surface-2 border border-border-subtle hover:border-white/20 flex items-center justify-center transition-all"
            >
              <Volume1 className="h-4 w-4" />
            </motion.button>
            <div className="flex-1 relative">
              <input
                type="range"
                min={0}
                max={100}
                value={sonosMuted ? 0 : sonosVolume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full h-3 bg-glass-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-cyan-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30"
                style={{ background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(34 211 238) ${sonosMuted ? 0 : sonosVolume}%, rgba(255,255,255,0.15) ${sonosMuted ? 0 : sonosVolume}%)` }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setVolume(Math.min(100, sonosVolume + 5))}
              className="h-10 w-10 rounded-full bg-surface-2 border border-border-subtle hover:border-white/20 flex items-center justify-center transition-all"
            >
              <Volume2 className="h-4 w-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center transition-all',
                sonosMuted
                  ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                  : 'bg-surface-2 border border-border-subtle hover:border-white/20'
              )}
              title={sonosMuted ? 'Unmute' : 'Mute'}
            >
              {sonosMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </motion.button>
          </div>
          <div className="text-center mt-2 text-sm font-medium">{sonosMuted ? <span className="text-red-400">Muted</span> : `${sonosVolume}%`}</div>
        </div>
      </section>

      <HueSyncBoxCard
        syncBoxPower={syncBoxPower}
        lightSync={lightSync}
        dolbyVision={dolbyVision}
        syncMode={syncMode}
        intensity={intensity}
        toggleEntity={toggleEntity}
        callService={callService}
      />
    </>
  );
}

function HueSyncBoxCard({ syncBoxPower, lightSync, dolbyVision, syncMode, intensity, toggleEntity, callService }: HueSyncBoxCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section>
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-full flex items-center justify-center gap-3 py-3 rounded-xl transition-all",
          isExpanded 
            ? "bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 border border-fuchsia-500/30"
            : "bg-surface-2 border border-border-subtle hover:border-fuchsia-500/30"
        )}
      >
        <motion.div
          animate={syncBoxPower ? { opacity: [0.5, 1, 0.5] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Palette className={cn("h-5 w-5", syncBoxPower ? "text-fuchsia-400" : "text-muted-foreground")} />
        </motion.div>
        <span className={cn("text-sm font-medium", isExpanded ? "text-white" : "text-muted-foreground")}>
          {syncBoxPower ? "Hue Sync Active" : "Hue Sync Box"}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={cn("h-4 w-4", isExpanded ? "text-white" : "text-muted-foreground")} />
        </motion.div>
      </motion.button>
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="card-item rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <EntityButton icon={Power} label="Power" isActive={syncBoxPower} activeColor="green" onClick={() => toggleEntity('switch', ENTITIES.syncBox.power)} />
                <EntityButton icon={Zap} label="Sync" isActive={lightSync} activeColor="fuchsia" onClick={() => toggleEntity('switch', ENTITIES.syncBox.lightSync)} />
                <EntityButton icon={Film} label="Dolby" isActive={dolbyVision} activeColor="amber" onClick={() => toggleEntity('switch', ENTITIES.syncBox.dolbyVision)} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">Sync Mode: <span className="text-white font-medium capitalize">{syncMode}</span></span>
                <div className="grid grid-cols-3 gap-2">
                  {['video', 'music', 'game'].map((mode) => (
                    <motion.button
                      key={mode}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => callService('select', 'select_option', ENTITIES.syncBox.syncMode, { option: mode })}
                      className={cn(
                        'py-2.5 rounded-lg text-xs font-medium transition-all capitalize',
                        syncMode === mode
                          ? 'bg-neon-primary text-white shadow-lg shadow-neon-primary/30 border border-white/20'
                          : 'bg-surface-2 border border-border-subtle text-muted-foreground hover:text-white hover:border-white/20'
                      )}
                    >
                      {mode}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">Intensity: <span className="text-amber-400 font-medium capitalize">{intensity}</span></span>
                <div className="grid grid-cols-4 gap-2">
                  {['subtle', 'moderate', 'high', 'intense'].map((level) => (
                    <motion.button
                      key={level}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => callService('select', 'select_option', ENTITIES.syncBox.intensity, { option: level })}
                      className={cn(
                        'py-2 rounded-lg text-[10px] font-medium transition-all capitalize',
                        intensity === level
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-white/20'
                          : 'bg-surface-2 border border-border-subtle text-muted-foreground hover:text-white hover:border-white/20'
                      )}
                    >
                      {level}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
