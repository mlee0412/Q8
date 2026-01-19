'use client';

import { motion } from 'framer-motion';
import {
  Thermometer,
  ChevronUp,
  ChevronDown,
  PanelTopOpen,
  PanelBottomClose,
  SunDim,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ENTITIES } from '../constants';
import { CoverControl } from '../components';
import type { ClimateTabProps } from '../types';

export function ClimateTab({ getState, getAttr, callService }: ClimateTabProps) {
  const currentTemp = getAttr(ENTITIES.climate, 'current_temperature') as number | null;
  const targetTemp = getAttr(ENTITIES.climate, 'temperature') as number | null;
  const hvacMode = getState(ENTITIES.climate);
  const hvacAction = getAttr(ENTITIES.climate, 'hvac_action') as string | null;

  const setClimateTemp = (temp: number) => callService('climate', 'set_temperature', ENTITIES.climate, { temperature: temp });

  return (
    <>
      <section>
        <div className="card-item rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold">{currentTemp || '--'}°</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-2xl font-semibold text-neon-primary">{targetTemp || '--'}°</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mb-5">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => setClimateTemp((targetTemp || 70) - 1)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center hover:border-blue-400/50 transition-all shadow-lg"
            >
              <ChevronDown className="h-7 w-7 text-blue-400" />
            </motion.button>
            <div className="flex flex-col items-center">
              <motion.div
                animate={hvacAction === 'heating' || hvacAction === 'cooling' ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Thermometer className={cn('h-10 w-10 mb-2', hvacAction === 'heating' && 'text-orange-500', hvacAction === 'cooling' && 'text-blue-500', hvacAction === 'idle' && 'text-muted-foreground')} />
              </motion.div>
              <span className={cn(
                'text-sm font-medium capitalize',
                hvacAction === 'heating' && 'text-orange-400',
                hvacAction === 'cooling' && 'text-blue-400',
                hvacAction === 'idle' && 'text-muted-foreground'
              )}>{hvacAction || hvacMode}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => setClimateTemp((targetTemp || 70) + 1)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 flex items-center justify-center hover:border-orange-400/50 transition-all shadow-lg"
            >
              <ChevronUp className="h-7 w-7 text-orange-400" />
            </motion.button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { mode: 'off', label: 'Off' },
              { mode: 'heat_cool', label: 'Heat/Cool' },
            ].map(({ mode, label }) => (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => callService('climate', 'set_hvac_mode', ENTITIES.climate, { hvac_mode: mode })}
                className={cn(
                  'py-2.5 rounded-xl text-xs font-medium transition-all',
                  hvacMode === mode
                    ? 'bg-neon-primary text-white shadow-lg shadow-neon-primary/30 border border-white/20'
                    : 'bg-surface-2 border border-border-subtle text-muted-foreground hover:text-white hover:border-white/20'
                )}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <CoverControl label="Left Window" state={getState(ENTITIES.covers.left)} onOpen={() => callService('cover', 'open_cover', ENTITIES.covers.left)} onClose={() => callService('cover', 'close_cover', ENTITIES.covers.left)} onStop={() => callService('cover', 'stop_cover', ENTITIES.covers.left)} />
            <CoverControl label="Right Window" state={getState(ENTITIES.covers.right)} onOpen={() => callService('cover', 'open_cover', ENTITIES.covers.right)} onClose={() => callService('cover', 'close_cover', ENTITIES.covers.right)} onStop={() => callService('cover', 'stop_cover', ENTITIES.covers.right)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('cover', 'open_cover', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right] })}
              className="py-3.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1"
            >
              <PanelTopOpen className="h-5 w-5" />
              <div className="flex gap-0.5">
                <div className="w-2.5 h-0.5 bg-white/80 rounded-full" />
                <div className="w-2.5 h-0.5 bg-white/80 rounded-full" />
                <div className="w-2.5 h-0.5 bg-white/80 rounded-full" />
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('cover', 'set_cover_position', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right], position: 50 })}
              className="py-3.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1"
            >
              <SunDim className="h-5 w-5" />
              <div className="flex gap-0.5">
                <div className="w-2.5 h-1.5 bg-white/60 rounded-sm" />
                <div className="w-2.5 h-1.5 bg-white/60 rounded-sm" />
                <div className="w-2.5 h-1.5 bg-white/60 rounded-sm" />
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('cover', 'close_cover', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right] })}
              className="py-3.5 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1"
            >
              <PanelBottomClose className="h-5 w-5" />
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2.5 bg-white/40 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-white/40 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-white/40 rounded-sm" />
              </div>
            </motion.button>
          </div>
        </div>
      </section>
    </>
  );
}
