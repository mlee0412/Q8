/**
 * Home Assistant Context Builder
 * Fetches and caches device/entity information from Home Assistant
 */

const HOME_ASSISTANT_URL = process.env.HASS_URL || 'http://homeassistant.local:8123';
const HOME_ASSISTANT_TOKEN = process.env.HASS_TOKEN;

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

interface HAArea {
  area_id: string;
  name: string;
  picture?: string;
}

interface DeviceContext {
  entities: HAEntity[];
  areas: HAArea[];
  lastFetched: Date;
}

// Cache device context (refresh every 5 minutes)
let cachedContext: DeviceContext | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all entities from Home Assistant
 */
async function fetchEntities(): Promise<HAEntity[]> {
  if (!HOME_ASSISTANT_TOKEN) {
    console.warn('HASS_TOKEN not configured');
    return [];
  }

  try {
    const response = await fetch(`${HOME_ASSISTANT_URL}/api/states`, {
      headers: {
        'Authorization': `Bearer ${HOME_ASSISTANT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HA API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching HA entities:', error);
    return [];
  }
}

/**
 * Fetch all areas from Home Assistant
 */
async function fetchAreas(): Promise<HAArea[]> {
  if (!HOME_ASSISTANT_TOKEN) {
    return [];
  }

  try {
    // Use WebSocket API for areas (REST doesn't have direct endpoint)
    // Fallback: return empty and let entities provide context
    return [];
  } catch (error) {
    console.error('Error fetching HA areas:', error);
    return [];
  }
}

/**
 * Get device context (cached)
 */
export async function getHomeContext(): Promise<DeviceContext> {
  const now = new Date();
  
  // Return cached if still valid
  if (cachedContext && (now.getTime() - cachedContext.lastFetched.getTime()) < CACHE_TTL_MS) {
    return cachedContext;
  }

  // Fetch fresh data
  const [entities, areas] = await Promise.all([
    fetchEntities(),
    fetchAreas(),
  ]);

  cachedContext = {
    entities,
    areas,
    lastFetched: now,
  };

  return cachedContext;
}

/**
 * Build a concise device summary for the system prompt
 * Groups devices by domain and room
 */
export async function buildDeviceSummary(): Promise<string> {
  const context = await getHomeContext();
  
  if (context.entities.length === 0) {
    return 'No Home Assistant devices available. Check HASS_TOKEN and HASS_URL configuration.';
  }

  // Group entities by domain
  const byDomain: Record<string, HAEntity[]> = {};
  
  for (const entity of context.entities) {
    const parts = entity.entity_id.split('.');
    const domain = parts[0];
    
    // Only include controllable domains
    if (domain && ['light', 'switch', 'fan', 'cover', 'lock', 'climate', 'media_player', 'scene', 'automation', 'script'].includes(domain)) {
      if (!byDomain[domain]) {
        byDomain[domain] = [];
      }
      byDomain[domain]!.push(entity);
    }
  }

  // Build summary
  const lines: string[] = ['## Available Smart Home Devices\n'];
  
  for (const [domain, entities] of Object.entries(byDomain)) {
    const domainName = domain.charAt(0).toUpperCase() + domain.slice(1) + 's';
    lines.push(`### ${domainName} (${entities.length})`);
    
    for (const entity of entities.slice(0, 50)) { // Limit per domain to avoid token explosion
      const friendlyName = entity.attributes.friendly_name || entity.entity_id;
      const state = entity.state;
      lines.push(`- **${friendlyName}** (\`${entity.entity_id}\`): ${state}`);
    }
    
    if (entities.length > 50) {
      lines.push(`- ... and ${entities.length - 50} more`);
    }
    
    lines.push('');
  }

  // Add sensor summary (read-only but useful for context)
  const sensors = context.entities.filter(e => 
    e.entity_id.startsWith('sensor.') && 
    (e.entity_id.includes('temperature') || e.entity_id.includes('humidity') || e.entity_id.includes('motion'))
  );
  
  if (sensors.length > 0) {
    lines.push('### Key Sensors');
    for (const sensor of sensors.slice(0, 20)) {
      const friendlyName = sensor.attributes.friendly_name || sensor.entity_id;
      const unit = sensor.attributes.unit_of_measurement || '';
      lines.push(`- **${friendlyName}**: ${sensor.state}${unit}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Invalidate cache (call after making changes)
 */
export function invalidateHomeCache(): void {
  cachedContext = null;
}
