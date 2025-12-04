/**
 * Home Assistant MCP Tool Definitions
 * Smart home control via Home Assistant API
 */

import { mcpClient } from '../client';

export const HOME_ASSISTANT_URL = process.env.HASS_URL || 'http://homeassistant.local:8123';
export const HOME_ASSISTANT_TOKEN = process.env.HASS_TOKEN;

/**
 * Initialize Home Assistant MCP tools
 * Uses the home-assistant MCP server
 */
export async function initHomeAssistantTools() {
  // The home-assistant MCP server should be running and configured
  // It connects to HA using HASS_URL and HASS_TOKEN env vars
  const mcpUrl = process.env.HOME_ASSISTANT_MCP_URL || 'http://localhost:3004';
  await mcpClient.registerServer('home-assistant', mcpUrl);
  return mcpClient.getServerTools('home-assistant');
}

/**
 * Direct Home Assistant API client (fallback if MCP not available)
 */
async function callHomeAssistantAPI(endpoint: string, method: string = 'GET', body?: unknown) {
  const response = await fetch(`${HOME_ASSISTANT_URL}/api${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${HOME_ASSISTANT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Home Assistant API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Call a Home Assistant service
 */
export async function callService(
  domain: string,
  service: string,
  entityId?: string,
  data?: Record<string, unknown>
) {
  try {
    return await mcpClient.executeTool('call_service', {
      domain,
      service,
      entity_id: entityId,
      ...data,
    });
  } catch {
    // Fallback to direct API call
    return callHomeAssistantAPI(`/services/${domain}/${service}`, 'POST', {
      entity_id: entityId,
      ...data,
    });
  }
}

/**
 * Get state of an entity
 */
export async function getState(entityId: string) {
  try {
    return await mcpClient.executeTool('get_state', { entity_id: entityId });
  } catch {
    return callHomeAssistantAPI(`/states/${entityId}`);
  }
}

/**
 * Get all states (optionally filtered by domain)
 */
export async function getStates(domain?: string) {
  try {
    return await mcpClient.executeTool('get_states', { domain });
  } catch {
    const states = await callHomeAssistantAPI('/states');
    if (domain) {
      return states.filter((s: { entity_id: string }) => s.entity_id.startsWith(`${domain}.`));
    }
    return states;
  }
}

/**
 * Light control helpers
 */
export async function turnOnLight(
  entityId: string,
  options?: { brightness_pct?: number; color_name?: string; rgb_color?: number[]; kelvin?: number }
) {
  return callService('light', 'turn_on', entityId, options);
}

export async function turnOffLight(entityId: string) {
  return callService('light', 'turn_off', entityId);
}

export async function toggleLight(entityId: string) {
  return callService('light', 'toggle', entityId);
}

/**
 * Switch control
 */
export async function turnOnSwitch(entityId: string) {
  return callService('switch', 'turn_on', entityId);
}

export async function turnOffSwitch(entityId: string) {
  return callService('switch', 'turn_off', entityId);
}

/**
 * Climate control
 */
export async function setThermostat(
  entityId: string,
  options: { temperature?: number; target_temp_high?: number; target_temp_low?: number; hvac_mode?: string }
) {
  if (options.hvac_mode) {
    await callService('climate', 'set_hvac_mode', entityId, { hvac_mode: options.hvac_mode });
  }
  if (options.temperature || options.target_temp_high || options.target_temp_low) {
    return callService('climate', 'set_temperature', entityId, options);
  }
}

/**
 * Scene and automation control
 */
export async function activateScene(sceneId: string) {
  return callService('scene', 'turn_on', sceneId);
}

export async function triggerAutomation(automationId: string) {
  return callService('automation', 'trigger', automationId);
}

export async function toggleAutomation(automationId: string, enable: boolean) {
  return callService('automation', enable ? 'turn_on' : 'turn_off', automationId);
}

/**
 * Media player control
 */
export async function mediaPlayPause(entityId: string) {
  return callService('media_player', 'media_play_pause', entityId);
}

export async function mediaPlay(entityId: string) {
  return callService('media_player', 'media_play', entityId);
}

export async function mediaPause(entityId: string) {
  return callService('media_player', 'media_pause', entityId);
}

export async function mediaStop(entityId: string) {
  return callService('media_player', 'media_stop', entityId);
}

export async function mediaNext(entityId: string) {
  return callService('media_player', 'media_next_track', entityId);
}

export async function mediaPrevious(entityId: string) {
  return callService('media_player', 'media_previous_track', entityId);
}

export async function setVolume(entityId: string, volumeLevel: number) {
  return callService('media_player', 'volume_set', entityId, { volume_level: volumeLevel });
}

/**
 * Cover/blind control
 */
export async function openCover(entityId: string) {
  return callService('cover', 'open_cover', entityId);
}

export async function closeCover(entityId: string) {
  return callService('cover', 'close_cover', entityId);
}

export async function setCoverPosition(entityId: string, position: number) {
  return callService('cover', 'set_cover_position', entityId, { position });
}

/**
 * Lock control
 */
export async function lockDoor(entityId: string) {
  return callService('lock', 'lock', entityId);
}

export async function unlockDoor(entityId: string) {
  return callService('lock', 'unlock', entityId);
}

/**
 * Fan control
 */
export async function turnOnFan(entityId: string, options?: { percentage?: number; preset_mode?: string }) {
  return callService('fan', 'turn_on', entityId, options);
}

export async function turnOffFan(entityId: string) {
  return callService('fan', 'turn_off', entityId);
}

/**
 * Get history for an entity
 */
export async function getHistory(entityId: string, startTime?: string, endTime?: string) {
  try {
    return await mcpClient.executeTool('get_history', {
      entity_id: entityId,
      start_time: startTime,
      end_time: endTime,
    });
  } catch {
    let endpoint = `/history/period`;
    if (startTime) endpoint += `/${startTime}`;
    const params = new URLSearchParams({ filter_entity_id: entityId });
    if (endTime) params.append('end_time', endTime);
    return callHomeAssistantAPI(`${endpoint}?${params}`);
  }
}

/**
 * Get all areas/rooms
 */
export async function getAreas() {
  try {
    return await mcpClient.executeTool('get_areas', {});
  } catch {
    return callHomeAssistantAPI('/config/area_registry/list', 'GET');
  }
}

/**
 * Get all devices
 */
export async function getDevices() {
  try {
    return await mcpClient.executeTool('get_devices', {});
  } catch {
    return callHomeAssistantAPI('/config/device_registry/list', 'GET');
  }
}
