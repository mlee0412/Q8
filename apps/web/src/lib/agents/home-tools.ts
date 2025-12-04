/**
 * Home Assistant Tool Definitions & Executor
 * Function calling tools for smart home control
 */

const HOME_ASSISTANT_URL = process.env.HASS_URL || 'http://homeassistant.local:8123';
const HOME_ASSISTANT_TOKEN = process.env.HASS_TOKEN;

/**
 * OpenAI-compatible tool definitions for Home Assistant
 */
export const homeAssistantTools = [
  {
    type: 'function' as const,
    function: {
      name: 'control_device',
      description: 'Control a Home Assistant device (lights, switches, fans, covers, locks, etc.)',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The Home Assistant entity ID (e.g., light.living_room, switch.bedroom_fan)',
          },
          action: {
            type: 'string',
            enum: ['turn_on', 'turn_off', 'toggle'],
            description: 'The action to perform',
          },
          brightness_pct: {
            type: 'number',
            description: 'Brightness percentage (0-100) for lights. Optional.',
          },
          color_name: {
            type: 'string',
            description: 'Color name for lights (e.g., red, blue, warm_white). Optional.',
          },
        },
        required: ['entity_id', 'action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_climate',
      description: 'Set thermostat/climate device temperature and mode',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The climate entity ID (e.g., climate.living_room)',
          },
          temperature: {
            type: 'number',
            description: 'Target temperature in degrees',
          },
          hvac_mode: {
            type: 'string',
            enum: ['heat', 'cool', 'heat_cool', 'auto', 'off'],
            description: 'HVAC mode. Optional.',
          },
        },
        required: ['entity_id', 'temperature'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'activate_scene',
      description: 'Activate a Home Assistant scene',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The scene entity ID (e.g., scene.movie_night)',
          },
        },
        required: ['entity_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'control_media',
      description: 'Control media players (TV, speakers, etc.)',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The media player entity ID',
          },
          action: {
            type: 'string',
            enum: ['play', 'pause', 'stop', 'next', 'previous', 'volume_up', 'volume_down', 'volume_mute'],
            description: 'Media control action',
          },
          volume_level: {
            type: 'number',
            description: 'Volume level (0.0 to 1.0). Only for volume_set.',
          },
        },
        required: ['entity_id', 'action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'control_cover',
      description: 'Control blinds, shades, garage doors, etc.',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The cover entity ID',
          },
          action: {
            type: 'string',
            enum: ['open', 'close', 'stop', 'set_position'],
            description: 'Cover control action',
          },
          position: {
            type: 'number',
            description: 'Position percentage (0-100). Only for set_position.',
          },
        },
        required: ['entity_id', 'action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'control_lock',
      description: 'Lock or unlock a door lock',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The lock entity ID',
          },
          action: {
            type: 'string',
            enum: ['lock', 'unlock'],
            description: 'Lock action',
          },
        },
        required: ['entity_id', 'action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_device_state',
      description: 'Get the current state of a device',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The entity ID to check',
          },
        },
        required: ['entity_id'],
      },
    },
  },
];

/**
 * Execute a Home Assistant API call
 */
async function callHomeAssistant(
  endpoint: string,
  method: string = 'POST',
  body?: Record<string, unknown>
): Promise<unknown> {
  if (!HOME_ASSISTANT_TOKEN) {
    throw new Error('HASS_TOKEN not configured');
  }

  const response = await fetch(`${HOME_ASSISTANT_URL}/api${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${HOME_ASSISTANT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Home Assistant API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Execute a tool call from the LLM
 */
export async function executeHomeAssistantTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    switch (toolName) {
      case 'control_device': {
        const { entity_id, action, brightness_pct, color_name } = args as {
          entity_id: string;
          action: 'turn_on' | 'turn_off' | 'toggle';
          brightness_pct?: number;
          color_name?: string;
        };

        const domain = entity_id.split('.')[0];
        const serviceData: Record<string, unknown> = { entity_id };

        if (action === 'turn_on' && domain === 'light') {
          if (brightness_pct !== undefined) {
            serviceData.brightness_pct = brightness_pct;
          }
          if (color_name) {
            serviceData.color_name = color_name;
          }
        }

        await callHomeAssistant(`/services/${domain}/${action}`, 'POST', serviceData);
        return {
          success: true,
          message: `Successfully executed ${action} on ${entity_id}`,
        };
      }

      case 'set_climate': {
        const { entity_id, temperature, hvac_mode } = args as {
          entity_id: string;
          temperature: number;
          hvac_mode?: string;
        };

        if (hvac_mode) {
          await callHomeAssistant('/services/climate/set_hvac_mode', 'POST', {
            entity_id,
            hvac_mode,
          });
        }

        await callHomeAssistant('/services/climate/set_temperature', 'POST', {
          entity_id,
          temperature,
        });

        return {
          success: true,
          message: `Set ${entity_id} to ${temperature}°${hvac_mode ? ` in ${hvac_mode} mode` : ''}`,
        };
      }

      case 'activate_scene': {
        const { entity_id } = args as { entity_id: string };
        await callHomeAssistant('/services/scene/turn_on', 'POST', { entity_id });
        return {
          success: true,
          message: `Activated scene ${entity_id}`,
        };
      }

      case 'control_media': {
        const { entity_id, action, volume_level } = args as {
          entity_id: string;
          action: string;
          volume_level?: number;
        };

        let service = action;
        const serviceData: Record<string, unknown> = { entity_id };

        if (action === 'volume_up' || action === 'volume_down' || action === 'volume_mute') {
          service = action;
        } else if (volume_level !== undefined) {
          service = 'volume_set';
          serviceData.volume_level = volume_level;
        } else {
          service = `media_${action}`;
        }

        await callHomeAssistant(`/services/media_player/${service}`, 'POST', serviceData);
        return {
          success: true,
          message: `Media player ${entity_id}: ${action}`,
        };
      }

      case 'control_cover': {
        const { entity_id, action, position } = args as {
          entity_id: string;
          action: string;
          position?: number;
        };

        const serviceData: Record<string, unknown> = { entity_id };
        let service = `${action}_cover`;

        if (action === 'set_position' && position !== undefined) {
          service = 'set_cover_position';
          serviceData.position = position;
        } else if (action === 'stop') {
          service = 'stop_cover';
        }

        await callHomeAssistant(`/services/cover/${service}`, 'POST', serviceData);
        return {
          success: true,
          message: `Cover ${entity_id}: ${action}${position !== undefined ? ` to ${position}%` : ''}`,
        };
      }

      case 'control_lock': {
        const { entity_id, action } = args as {
          entity_id: string;
          action: 'lock' | 'unlock';
        };

        await callHomeAssistant(`/services/lock/${action}`, 'POST', { entity_id });
        return {
          success: true,
          message: `${action === 'lock' ? 'Locked' : 'Unlocked'} ${entity_id}`,
        };
      }

      case 'get_device_state': {
        const { entity_id } = args as { entity_id: string };
        const state = await callHomeAssistant(`/states/${entity_id}`, 'GET');
        return {
          success: true,
          message: `Current state of ${entity_id}`,
          data: state,
        };
      }

      default:
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to execute ${toolName}: ${errorMessage}`,
    };
  }
}
