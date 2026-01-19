/**
 * SmartHomeWidget Constants
 * Entity IDs and presets for Home Assistant integration
 */

import type { ColorPreset, LEDEffect } from './types';

export const ENTITIES = {
  climate: 'climate.simon_aire_inc',
  scenes: {
    relax: 'scene.entertainment_relax',
    bright: 'scene.entertainment_bright',
    naturalLight: 'scene.entertainment_natural_light_2',
    dimmed: 'scene.entertainment_dimmed',
    rest: 'scene.entertainment_rest',
    night: 'scene.entertainment_nightlight',
    allOff: 'scene.all_lights_off',
  },
  remotes: {
    appleTV: 'remote.living_room',
    samsungTV: 'remote.tv_samsung_7_series_65',
    padMode: 'input_select.remote_pad_mode',
  },
  media: {
    appleTV: 'media_player.living_room',
    sonos: 'media_player.sonos',
  },
  syncBox: {
    power: 'switch.sync_box_power',
    lightSync: 'switch.sync_box_light_sync',
    dolbyVision: 'switch.sync_box_dolby_vision_compatibility',
    hdmiInput: 'select.sync_box_hdmi_input',
    syncMode: 'select.sync_box_sync_mode',
    intensity: 'select.sync_box_intensity',
    brightness: 'number.sync_box_brightness',
  },
  covers: {
    left: 'cover.left_blind',
    right: 'cover.right_blind',
  },
  switches: {
    bathroom: 'switch.bathroom',
    kitchen: 'switch.kitchen',
  },
  lights: {
    bedroomGroup: 'light.bedroom_group',
    bedside: 'light.bedside',
    bedLED: 'light.elk_bledom02',
    deskLED: 'light.elk_bledom0c',
    kitchenBar: 'light.kitchen_bar',
    entry: 'light.entry',
    entertainment: 'light.entertainment',
  },
  sonos: {
    audioDelay: 'number.sonos_audio_delay',
    balance: 'number.sonos_balance',
    bass: 'number.sonos_bass',
    crossfade: 'switch.sonos_crossfade',
    loudness: 'switch.sonos_loudness',
  },
} as const;

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Warm', rgb: [255, 180, 107], gradient: 'from-amber-400 to-orange-500' },
  { name: 'Soft White', rgb: [255, 244, 229], gradient: 'from-amber-100 to-yellow-200' },
  { name: 'Daylight', rgb: [255, 255, 255], gradient: 'from-white to-gray-200' },
  { name: 'Cool', rgb: [200, 220, 255], gradient: 'from-sky-100 to-blue-200' },
  { name: 'Cyan', rgb: [0, 255, 255], gradient: 'from-cyan-400 to-teal-500' },
  { name: 'Lavender', rgb: [200, 162, 200], gradient: 'from-purple-300 to-violet-400' },
  { name: 'Peach', rgb: [255, 200, 170], gradient: 'from-orange-300 to-pink-300' },
  { name: 'Rose', rgb: [255, 150, 180], gradient: 'from-pink-400 to-rose-500' },
];

export const LED_EFFECTS: LEDEffect[] = [
  { name: 'Jump RGB', value: 'jump_red_green_blue', gradient: 'from-red-500 via-green-500 to-blue-500' },
  { name: 'Rainbow', value: 'jump_red_green_blue_yellow_cyan_magenta_white', gradient: 'from-red-500 via-yellow-500 to-purple-500' },
  { name: 'Crossfade Red', value: 'crossfade_red', gradient: 'from-red-400 to-red-600' },
  { name: 'Crossfade Green', value: 'crossfade_green', gradient: 'from-green-400 to-green-600' },
  { name: 'Crossfade Blue', value: 'crossfade_blue', gradient: 'from-blue-400 to-blue-600' },
  { name: 'Crossfade Cyan', value: 'crossfade_cyan', gradient: 'from-cyan-400 to-cyan-600' },
  { name: 'Crossfade Magenta', value: 'crossfade_magenta', gradient: 'from-fuchsia-400 to-fuchsia-600' },
  { name: 'Crossfade Yellow', value: 'crossfade_yellow', gradient: 'from-yellow-400 to-yellow-600' },
  { name: 'Crossfade White', value: 'crossfade_white', gradient: 'from-gray-100 to-gray-300' },
  { name: 'Crossfade RG', value: 'crossfade_red_green', gradient: 'from-red-500 to-green-500' },
  { name: 'Crossfade RB', value: 'crossfade_red_blue', gradient: 'from-red-500 to-blue-500' },
  { name: 'Crossfade GB', value: 'crossfade_green_blue', gradient: 'from-green-500 to-blue-500' },
];
