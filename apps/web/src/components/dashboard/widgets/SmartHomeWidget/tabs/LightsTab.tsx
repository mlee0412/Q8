'use client';

import { motion } from 'framer-motion';
import {
  Sun,
  Sofa,
  SunDim,
  Bed,
  Sparkles,
  Palette,
  Lamp,
  Waves,
  UtensilsCrossed,
  DoorOpen,
  Bath,
  Lightbulb,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ENTITIES } from '../constants';
import { SceneButton, EntityButton } from '../components';
import type { LightsTabProps, LightControlConfig } from '../types';

export function LightsTab({ isOn, toggleEntity, activateScene, callService, openLightControl }: LightsTabProps) {
  const entertainmentConfig: LightControlConfig = {
    entityId: ENTITIES.lights.entertainment,
    name: 'Entertainment',
    type: 'hue',
    hasEffects: false,
  };

  const bedsideConfig: LightControlConfig = {
    entityId: ENTITIES.lights.bedside,
    name: 'Bedside Lamp',
    type: 'hue',
    hasEffects: false,
  };

  const bedLEDConfig: LightControlConfig = {
    entityId: ENTITIES.lights.bedLED,
    name: 'Bed LED Strip',
    type: 'led_strip',
    hasEffects: true,
  };

  const kitchenBarConfig: LightControlConfig = {
    entityId: ENTITIES.lights.kitchenBar,
    name: 'Kitchen Bar',
    type: 'hue',
    hasEffects: false,
  };

  const entryConfig: LightControlConfig = {
    entityId: ENTITIES.lights.entry,
    name: 'Entry',
    type: 'hue',
    hasEffects: false,
  };

  const deskLEDConfig: LightControlConfig = {
    entityId: ENTITIES.lights.deskLED,
    name: 'Desk LED Strip',
    type: 'led_strip',
    hasEffects: true,
  };

  const bedroomIsOn = isOn(ENTITIES.lights.bedside) || isOn(ENTITIES.lights.bedLED);
  
  const toggleBedroom = () => {
    if (bedroomIsOn) {
      callService('light', 'turn_off', ENTITIES.lights.bedside);
      callService('light', 'turn_off', ENTITIES.lights.bedLED);
    } else {
      callService('light', 'turn_on', ENTITIES.lights.bedside);
      callService('light', 'turn_on', ENTITIES.lights.bedLED);
    }
  };

  return (
    <>
      <section>
        <div className="grid grid-cols-3 gap-2">
          <SceneButton icon={Sun} label="Bright" gradient="from-amber-400 to-yellow-500" onClick={() => activateScene(ENTITIES.scenes.bright)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={Sofa} label="Relax" gradient="from-pink-500 to-rose-500" onClick={() => activateScene(ENTITIES.scenes.relax)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={SunDim} label="Dimmed" gradient="from-orange-400 to-amber-600" onClick={() => activateScene(ENTITIES.scenes.dimmed)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={Bed} label="Rest" gradient="from-purple-500 to-violet-600" onClick={() => activateScene(ENTITIES.scenes.rest)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={Sparkles} label="Night" gradient="from-blue-500 to-indigo-600" onClick={() => activateScene(ENTITIES.scenes.night)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={Palette} label="Natural Light" gradient="from-green-400 to-teal-500" onClick={() => activateScene(ENTITIES.scenes.naturalLight)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
        </div>
      </section>

      <section>
        <div className="space-y-2">
          <EntityButton icon={Bed} label="Bedroom" isActive={bedroomIsOn} activeColor="teal" onClick={toggleBedroom} fullWidth />
          <div className="grid grid-cols-2 gap-2">
            <EntityButton icon={Lamp} label="Bedside Lamp" isActive={isOn(ENTITIES.lights.bedside)} activeColor="amber" onClick={() => toggleEntity('light', ENTITIES.lights.bedside)} onLongPress={() => openLightControl(bedsideConfig)} />
            <EntityButton icon={Waves} label="Bed LED Strip" isActive={isOn(ENTITIES.lights.bedLED)} activeColor="violet" onClick={() => toggleEntity('light', ENTITIES.lights.bedLED)} onLongPress={() => openLightControl(bedLEDConfig)} />
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-2">
          <EntityButton icon={UtensilsCrossed} label="Kitchen Bar" isActive={isOn(ENTITIES.lights.kitchenBar)} activeColor="orange" onClick={() => toggleEntity('light', ENTITIES.lights.kitchenBar)} onLongPress={() => openLightControl(kitchenBarConfig)} />
          <EntityButton icon={DoorOpen} label="Entry" isActive={isOn(ENTITIES.lights.entry)} activeColor="sky" onClick={() => toggleEntity('light', ENTITIES.lights.entry)} onLongPress={() => openLightControl(entryConfig)} />
          <EntityButton icon={Bath} label="Bathroom" isActive={isOn(ENTITIES.switches.bathroom)} activeColor="cyan" onClick={() => toggleEntity('switch', ENTITIES.switches.bathroom)} />
          <EntityButton icon={Lightbulb} label="Kitchen" isActive={isOn(ENTITIES.switches.kitchen)} activeColor="yellow" onClick={() => toggleEntity('switch', ENTITIES.switches.kitchen)} />
        </div>
      </section>

      <section>
        <EntityButton icon={Monitor} label="Desk LED Strip" isActive={isOn(ENTITIES.lights.deskLED)} activeColor="fuchsia" onClick={() => toggleEntity('light', ENTITIES.lights.deskLED)} onLongPress={() => openLightControl(deskLEDConfig)} fullWidth />
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { name: 'Gaming', color: '#FF0000', gradient: 'from-red-600 to-red-800' },
            { name: 'Chill', color: '#0064FF', gradient: 'from-blue-500 to-blue-700' },
            { name: 'Focus', temp: 4500, gradient: 'from-gray-100 to-gray-300', dark: true },
            { name: 'Night', color: '#FF3200', gradient: 'from-orange-600 to-red-700' },
          ].map((mode) => (
            <motion.button
              key={mode.name}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => {
                if (mode.color) {
                  const r = parseInt(mode.color.slice(1, 3), 16);
                  const g = parseInt(mode.color.slice(3, 5), 16);
                  const b = parseInt(mode.color.slice(5, 7), 16);
                  callService('light', 'turn_on', ENTITIES.lights.deskLED, { rgb_color: [r, g, b], brightness_pct: 80 });
                } else if (mode.temp) {
                  callService('light', 'turn_on', ENTITIES.lights.deskLED, { color_temp_kelvin: mode.temp, brightness_pct: 85 });
                }
              }}
              className={cn(
                'py-3 rounded-xl text-[11px] font-semibold bg-gradient-to-br text-white shadow-md hover:shadow-lg',
                'border border-white/10 transition-all',
                mode.gradient,
                mode.dark && 'text-gray-800'
              )}
            >
              {mode.name}
            </motion.button>
          ))}
        </div>
      </section>
    </>
  );
}
