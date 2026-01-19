'use client';

import { motion } from 'framer-motion';
import {
  Sofa,
  Sun,
  Palette,
  Power,
  Bath,
  UtensilsCrossed,
  PanelTopOpen,
  PanelBottomClose,
  SunDim,
  Speaker,
  VolumeX,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ENTITIES } from '../constants';
import { SceneButton, EntityButton } from '../components';
import type { HomeTabProps, LightControlConfig } from '../types';

export function HomeTab({ isOn, activateScene, toggleEntity, sonosVolume, sonosMuted, setVolume, toggleMute, callService, openLightControl }: HomeTabProps) {
  const entertainmentLightConfig: LightControlConfig = {
    entityId: ENTITIES.lights.entertainment,
    name: 'Entertainment',
    type: 'hue',
    hasEffects: false,
  };

  return (
    <>
      <section>
        <div className="grid grid-cols-2 gap-2">
          <SceneButton
            icon={Sofa}
            label="Relax"
            gradient="from-cyan-500 to-blue-600"
            onClick={() => activateScene(ENTITIES.scenes.relax)}
            onLongPress={() => openLightControl(entertainmentLightConfig)}
          />
          <SceneButton
            icon={Sun}
            label="Bright"
            gradient="from-amber-400 to-yellow-500"
            onClick={() => activateScene(ENTITIES.scenes.bright)}
            onLongPress={() => openLightControl(entertainmentLightConfig)}
          />
          <SceneButton
            icon={Palette}
            label="Natural Light"
            gradient="from-green-400 to-teal-500"
            onClick={() => activateScene(ENTITIES.scenes.naturalLight)}
            onLongPress={() => openLightControl(entertainmentLightConfig)}
          />
          <SceneButton icon={Power} label="All Off" gradient="from-slate-600 to-slate-800" onClick={() => activateScene(ENTITIES.scenes.allOff)} />
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-2">
          <EntityButton icon={Bath} label="Bathroom" isActive={isOn(ENTITIES.switches.bathroom)} activeColor="cyan" onClick={() => toggleEntity('switch', ENTITIES.switches.bathroom)} />
          <EntityButton icon={UtensilsCrossed} label="Kitchen" isActive={isOn(ENTITIES.switches.kitchen)} activeColor="amber" onClick={() => toggleEntity('switch', ENTITIES.switches.kitchen)} />
        </div>
      </section>

      <section>
        <div className="grid grid-cols-3 gap-2">
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => callService('cover', 'open_cover', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right] })}
            className="py-4 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1.5"
          >
            <PanelTopOpen className="h-6 w-6" />
            <div className="flex gap-0.5">
              <div className="w-3 h-1 bg-white/80 rounded-full" />
              <div className="w-3 h-1 bg-white/80 rounded-full" />
              <div className="w-3 h-1 bg-white/80 rounded-full" />
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => callService('cover', 'set_cover_position', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right], position: 50 })}
            className="py-4 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1.5"
          >
            <SunDim className="h-6 w-6" />
            <div className="flex gap-0.5">
              <div className="w-3 h-2 bg-white/60 rounded-sm" />
              <div className="w-3 h-2 bg-white/60 rounded-sm" />
              <div className="w-3 h-2 bg-white/60 rounded-sm" />
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => callService('cover', 'close_cover', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right] })}
            className="py-4 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1.5"
          >
            <PanelBottomClose className="h-6 w-6" />
            <div className="flex gap-0.5">
              <div className="w-3 h-3 bg-white/40 rounded-sm" />
              <div className="w-3 h-3 bg-white/40 rounded-sm" />
              <div className="w-3 h-3 bg-white/40 rounded-sm" />
            </div>
          </motion.button>
        </div>
      </section>

      <section>
        <div className="card-item p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={!sonosMuted ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Speaker className="h-5 w-5 text-info" />
              </motion.div>
              <span className="text-base font-semibold text-text-primary">{sonosMuted ? 'Muted' : `${sonosVolume}%`}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center transition-all focus-ring',
                sonosMuted
                  ? 'bg-danger/20 text-danger border border-danger/30'
                  : 'bg-surface-2 border border-border-subtle hover:border-white/20'
              )}
              aria-label={sonosMuted ? 'Unmute' : 'Mute'}
            >
              {sonosMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </motion.button>
          </div>
          <div className="h-2 bg-border-subtle rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-info to-cyan-400 rounded-full"
              animate={{ width: `${sonosMuted ? 0 : sonosVolume}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { level: 15, label: 'Sleep', color: 'from-purple-600 to-violet-600' },
              { level: 20, label: 'Chat', color: 'from-cyan-500 to-teal-500' },
              { level: 40, label: 'Music', color: 'from-orange-500 to-amber-500' },
              { level: 70, label: 'Party', color: 'from-green-500 to-emerald-500' },
              { level: 90, label: 'Max', color: 'from-red-500 to-rose-500' },
            ].map((preset) => (
              <motion.button
                key={preset.level}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setVolume(preset.level)}
                className={cn(
                  'py-2.5 rounded-lg text-[10px] font-semibold transition-all bg-gradient-to-br text-white shadow-md',
                  'border border-white/10 hover:shadow-lg',
                  preset.color,
                  sonosVolume === preset.level && 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-105'
                )}
              >
                {preset.label}
              </motion.button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
