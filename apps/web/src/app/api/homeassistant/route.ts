import { NextRequest, NextResponse } from 'next/server';

const HA_URL = process.env.HASS_URL || 'http://homeassistant.local:8123';
const HA_TOKEN = process.env.HASS_TOKEN || '';

interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

/**
 * Helper to make authenticated requests to Home Assistant
 */
async function haFetch(endpoint: string, options: RequestInit = {}) {
  if (!HA_TOKEN) {
    throw new Error('HOME_ASSISTANT_TOKEN is not configured');
  }

  const response = await fetch(`${HA_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HA_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Home Assistant API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * GET: Fetch entity states from Home Assistant
 * 
 * Query params:
 * - entities: Comma-separated list of entity IDs to fetch
 * 
 * @example
 * GET /api/homeassistant?entities=light.bedroom,switch.kitchen
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityIds = searchParams.get('entities')?.split(',').filter(Boolean) || [];

  try {
    if (entityIds.length === 0) {
      // Return all states if no specific entities requested
      const states = await haFetch('/states');
      return NextResponse.json({ states });
    }

    // Fetch specific entities in parallel
    const states: HAState[] = await Promise.all(
      entityIds.map(async (entityId) => {
        try {
          return await haFetch(`/states/${entityId.trim()}`);
        } catch (error) {
          console.warn(`Failed to fetch entity ${entityId}:`, error);
          return {
            entity_id: entityId,
            state: 'unavailable',
            attributes: {},
            last_changed: '',
            last_updated: '',
          };
        }
      })
    );

    return NextResponse.json({ states });
  } catch (error) {
    console.error('Home Assistant fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Home Assistant states' },
      { status: 500 }
    );
  }
}

/**
 * POST: Call Home Assistant services
 * 
 * Body:
 * - domain: Service domain (e.g., 'light', 'switch', 'scene')
 * - service: Service name (e.g., 'turn_on', 'toggle')
 * - entity_id: Target entity ID (optional if using data.entity_id)
 * - data: Additional service data
 * 
 * @example
 * POST /api/homeassistant
 * { "domain": "light", "service": "turn_on", "entity_id": "light.bedroom" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, service, entity_id, data = {} } = body;

    if (!domain || !service) {
      return NextResponse.json(
        { error: 'Domain and service are required' },
        { status: 400 }
      );
    }

    // Build service data - support both entity_id at top level and in data
    const serviceData = entity_id 
      ? { entity_id, ...data } 
      : data;

    const result = await haFetch(`/services/${domain}/${service}`, {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Home Assistant service call error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to call Home Assistant service' },
      { status: 500 }
    );
  }
}
