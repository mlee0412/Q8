/**
 * Home Assistant Tool Definitions & Executor
 * Function calling tools for smart home control
 */

const HOME_ASSISTANT_URL = process.env.HASS_URL || 'http://homeassistant.local:8123';
const HOME_ASSISTANT_TOKEN = process.env.HASS_TOKEN;

/**
 * OpenAI-compatible tool definitions for Home Assistant
 * Comprehensive coverage of all major device types
 */
export const homeAssistantTools = [
  {
    type: 'function' as const,
    function: {
      name: 'discover_devices',
      description: 'Discover available Home Assistant devices/entities. Use this to find entity IDs before controlling them.',
      parameters: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description: 'Filter by domain (e.g., light, switch, sensor, climate, media_player, cover, lock, vacuum, alarm_control_panel, automation, script)',
          },
          area: {
            type: 'string',
            description: 'Filter by area/room name (e.g., living room, bedroom, kitchen)',
          },
        },
        required: [],
      },
    },
  },
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
  // Security & Safety
  {
    type: 'function' as const,
    function: {
      name: 'control_alarm',
      description: 'Control a security alarm system',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The alarm control panel entity ID',
          },
          action: {
            type: 'string',
            enum: ['arm_home', 'arm_away', 'arm_night', 'disarm', 'trigger'],
            description: 'Alarm action to perform',
          },
          code: {
            type: 'string',
            description: 'PIN code if required for the action',
          },
        },
        required: ['entity_id', 'action'],
      },
    },
  },
  // Sensors
  {
    type: 'function' as const,
    function: {
      name: 'get_sensor_state',
      description: 'Get the current state of a sensor (motion, door, window, temperature, humidity, water leak, etc.)',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The sensor entity ID',
          },
        },
        required: ['entity_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_sensor_history',
      description: 'Get historical data for a sensor over a time period',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The sensor entity ID',
          },
          hours: {
            type: 'number',
            description: 'Number of hours of history to retrieve (default: 24)',
          },
        },
        required: ['entity_id'],
      },
    },
  },
  // Automations
  {
    type: 'function' as const,
    function: {
      name: 'trigger_automation',
      description: 'Manually trigger a Home Assistant automation',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The automation entity ID',
          },
        },
        required: ['entity_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'toggle_automation',
      description: 'Enable or disable a Home Assistant automation',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The automation entity ID',
          },
          action: {
            type: 'string',
            enum: ['enable', 'disable'],
            description: 'Whether to enable or disable the automation',
          },
        },
        required: ['entity_id', 'action'],
      },
    },
  },
  // Scripts
  {
    type: 'function' as const,
    function: {
      name: 'run_script',
      description: 'Run a Home Assistant script',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The script entity ID',
          },
          variables: {
            type: 'object',
            description: 'Variables to pass to the script',
          },
        },
        required: ['entity_id'],
      },
    },
  },
  // Vacuum/Robot
  {
    type: 'function' as const,
    function: {
      name: 'control_vacuum',
      description: 'Control a robot vacuum cleaner',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: 'The vacuum entity ID',
          },
          action: {
            type: 'string',
            enum: ['start', 'stop', 'pause', 'return_to_base', 'locate', 'set_fan_speed'],
            description: 'Vacuum control action',
          },
          fan_speed: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'turbo'],
            description: 'Fan speed setting (only for set_fan_speed action)',
          },
        },
        required: ['entity_id', 'action'],
      },
    },
  },
  // Energy
  {
    type: 'function' as const,
    function: {
      name: 'get_energy_stats',
      description: 'Get energy consumption statistics',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'week', 'month'],
            description: 'Time period for energy stats',
          },
        },
        required: ['period'],
      },
    },
  },
  // Notifications
  {
    type: 'function' as const,
    function: {
      name: 'send_notification',
      description: 'Send a notification to devices via Home Assistant',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The notification message',
          },
          title: {
            type: 'string',
            description: 'Optional notification title',
          },
          target: {
            type: 'string',
            enum: ['mobile', 'tv', 'all'],
            description: 'Target device(s) for the notification',
          },
        },
        required: ['message'],
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

      case 'discover_devices': {
        const { domain, area } = args as { domain?: string; area?: string };
        const states = await callHomeAssistant('/states', 'GET') as Array<{
          entity_id: string;
          state: string;
          attributes: {
            friendly_name?: string;
            area_id?: string;
            device_class?: string;
          };
        }>;

        let filteredStates = states;

        // Filter by domain if provided
        if (domain) {
          filteredStates = filteredStates.filter(s =>
            s.entity_id.startsWith(`${domain}.`)
          );
        }

        // Filter by area if provided (check friendly_name for area keywords)
        if (area) {
          const areaLower = area.toLowerCase();
          filteredStates = filteredStates.filter(s => {
            const friendlyName = s.attributes.friendly_name?.toLowerCase() || '';
            const entityId = s.entity_id.toLowerCase();
            return friendlyName.includes(areaLower) ||
                   entityId.includes(areaLower.replace(/\s+/g, '_'));
          });
        }

        // Return simplified device list
        const devices = filteredStates.map(s => ({
          entity_id: s.entity_id,
          friendly_name: s.attributes.friendly_name || s.entity_id,
          state: s.state,
          device_class: s.attributes.device_class,
        }));

        return {
          success: true,
          message: `Found ${devices.length} devices`,
          data: devices,
        };
      }

      case 'control_alarm': {
        const { entity_id, action, code } = args as {
          entity_id: string;
          action: 'arm_home' | 'arm_away' | 'arm_night' | 'disarm' | 'trigger';
          code?: string;
        };

        const serviceMap: Record<string, string> = {
          arm_home: 'alarm_arm_home',
          arm_away: 'alarm_arm_away',
          arm_night: 'alarm_arm_night',
          disarm: 'alarm_disarm',
          trigger: 'alarm_trigger',
        };

        const serviceData: Record<string, unknown> = { entity_id };
        if (code) {
          serviceData.code = code;
        }

        await callHomeAssistant(
          `/services/alarm_control_panel/${serviceMap[action]}`,
          'POST',
          serviceData
        );

        return {
          success: true,
          message: `Alarm ${action} executed on ${entity_id}`,
        };
      }

      case 'get_sensor_state': {
        const { entity_id } = args as { entity_id: string };
        const state = await callHomeAssistant(`/states/${entity_id}`, 'GET') as {
          state: string;
          attributes: Record<string, unknown>;
          last_changed: string;
          last_updated: string;
        };

        return {
          success: true,
          message: `Sensor ${entity_id} state`,
          data: {
            state: state.state,
            attributes: state.attributes,
            last_changed: state.last_changed,
            last_updated: state.last_updated,
          },
        };
      }

      case 'get_sensor_history': {
        const { entity_id, hours = 24 } = args as {
          entity_id: string;
          hours?: number;
        };

        const endTime = new Date().toISOString();
        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        const history = await callHomeAssistant(
          `/history/period/${startTime}?filter_entity_id=${entity_id}&end_time=${endTime}`,
          'GET'
        ) as Array<Array<{ state: string; last_changed: string }>>;

        const historyData = history[0]?.map(h => ({
          state: h.state,
          timestamp: h.last_changed,
        })) || [];

        return {
          success: true,
          message: `History for ${entity_id} (last ${hours} hours)`,
          data: historyData,
        };
      }

      case 'trigger_automation': {
        const { entity_id } = args as { entity_id: string };
        await callHomeAssistant('/services/automation/trigger', 'POST', { entity_id });
        return {
          success: true,
          message: `Triggered automation ${entity_id}`,
        };
      }

      case 'toggle_automation': {
        const { entity_id, action } = args as {
          entity_id: string;
          action: 'enable' | 'disable';
        };

        const service = action === 'enable' ? 'turn_on' : 'turn_off';
        await callHomeAssistant(`/services/automation/${service}`, 'POST', { entity_id });

        return {
          success: true,
          message: `Automation ${entity_id} ${action}d`,
        };
      }

      case 'run_script': {
        const { entity_id, variables } = args as {
          entity_id: string;
          variables?: Record<string, unknown>;
        };

        const serviceData: Record<string, unknown> = { entity_id };
        if (variables) {
          Object.assign(serviceData, variables);
        }

        await callHomeAssistant('/services/script/turn_on', 'POST', serviceData);

        return {
          success: true,
          message: `Ran script ${entity_id}`,
        };
      }

      case 'control_vacuum': {
        const { entity_id, action, fan_speed } = args as {
          entity_id: string;
          action: 'start' | 'stop' | 'pause' | 'return_to_base' | 'locate' | 'set_fan_speed';
          fan_speed?: 'low' | 'medium' | 'high' | 'turbo';
        };

        let service = action;
        const serviceData: Record<string, unknown> = { entity_id };

        if (action === 'set_fan_speed' && fan_speed) {
          serviceData.fan_speed = fan_speed;
        }

        await callHomeAssistant(`/services/vacuum/${service}`, 'POST', serviceData);

        return {
          success: true,
          message: `Vacuum ${entity_id}: ${action}${fan_speed ? ` (${fan_speed})` : ''}`,
        };
      }

      case 'get_energy_stats': {
        const { period } = args as { period: 'today' | 'week' | 'month' };

        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }

        // Fetch energy sensors (usually sensor.energy_* or sensor.*_energy)
        const states = await callHomeAssistant('/states', 'GET') as Array<{
          entity_id: string;
          state: string;
          attributes: {
            friendly_name?: string;
            unit_of_measurement?: string;
            device_class?: string;
          };
        }>;

        const energySensors = states.filter(s =>
          s.attributes.device_class === 'energy' ||
          s.entity_id.includes('energy') ||
          s.attributes.unit_of_measurement === 'kWh'
        );

        return {
          success: true,
          message: `Energy stats for ${period}`,
          data: {
            period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            sensors: energySensors.map(s => ({
              entity_id: s.entity_id,
              friendly_name: s.attributes.friendly_name,
              current_value: s.state,
              unit: s.attributes.unit_of_measurement,
            })),
          },
        };
      }

      case 'send_notification': {
        const { message, title, target = 'all' } = args as {
          message: string;
          title?: string;
          target?: 'mobile' | 'tv' | 'all';
        };

        const notificationData: Record<string, unknown> = { message };
        if (title) {
          notificationData.title = title;
        }

        // Determine notification service based on target
        let service = 'notify';
        switch (target) {
          case 'mobile':
            service = 'mobile_app';
            break;
          case 'tv':
            service = 'notify'; // Usually notify.{tv_name}
            break;
          default:
            service = 'notify';
        }

        // Try persistent_notification as fallback
        await callHomeAssistant('/services/persistent_notification/create', 'POST', {
          message,
          title: title || 'Q8 Notification',
        });

        return {
          success: true,
          message: `Notification sent: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
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
