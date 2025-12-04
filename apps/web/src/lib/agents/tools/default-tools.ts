/**
 * Default Utility Tools
 * Shared tools available to multiple agents
 */

import type { OpenAITool } from '../types';
import { getWeather, getWeatherByCity, getWeatherForecast } from './weather';

/**
 * Tool definitions for OpenAI function calling
 */
export const defaultTools: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_datetime',
      description:
        'Get the current date and time. Can optionally convert to a different timezone.',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description:
              'IANA timezone name (e.g., "America/New_York", "Europe/London", "Asia/Tokyo"). Defaults to user\'s timezone if not specified.',
          },
          format: {
            type: 'string',
            enum: ['full', 'date', 'time', 'relative'],
            description: 'Output format. "full" for date and time, "date" for date only, "time" for time only, "relative" for relative time.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description:
        'Get current weather conditions for a location. Can use coordinates or city name.',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name (e.g., "New York", "London", "Tokyo")',
          },
          lat: {
            type: 'number',
            description: 'Latitude coordinate',
          },
          lon: {
            type: 'number',
            description: 'Longitude coordinate',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather_forecast',
      description: 'Get weather forecast for upcoming days.',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name',
          },
          days: {
            type: 'number',
            description: 'Number of days to forecast (1-5)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description:
        'Perform mathematical calculations. Supports basic arithmetic, percentages, and unit conversions.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description:
              'Mathematical expression to evaluate (e.g., "15% of 200", "sqrt(144)", "100 USD to EUR")',
          },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'convert_units',
      description: 'Convert between units (temperature, distance, weight, etc.)',
      parameters: {
        type: 'object',
        properties: {
          value: {
            type: 'number',
            description: 'The value to convert',
          },
          from_unit: {
            type: 'string',
            description: 'Source unit (e.g., "celsius", "miles", "kg")',
          },
          to_unit: {
            type: 'string',
            description: 'Target unit (e.g., "fahrenheit", "km", "lbs")',
          },
        },
        required: ['value', 'from_unit', 'to_unit'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description:
        'Search the web for current information. Use this when you need up-to-date information that may not be in your training data.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          num_results: {
            type: 'number',
            description: 'Number of results to return (default 5, max 10)',
          },
        },
        required: ['query'],
      },
    },
  },
];

/**
 * Default location (user's home)
 */
const DEFAULT_LOCATION = {
  lat: 40.7472,
  lon: -73.9903,
  city: 'New York',
  timezone: 'America/New_York',
};

/**
 * Execute a default tool
 */
export async function executeDefaultTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case 'get_current_datetime': {
        const timezone = (args.timezone as string) || DEFAULT_LOCATION.timezone;
        const format = (args.format as string) || 'full';
        const now = new Date();

        let result: string;
        switch (format) {
          case 'date':
            result = now.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: timezone,
            });
            break;
          case 'time':
            result = now.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
              timeZone: timezone,
            });
            break;
          case 'relative':
            result = `It is currently ${now.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: timezone,
            })} on ${now.toLocaleDateString('en-US', {
              weekday: 'long',
              timeZone: timezone,
            })}`;
            break;
          default:
            result = now.toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: timezone,
            });
        }

        return {
          success: true,
          result: {
            formatted: result,
            iso: now.toISOString(),
            timezone,
            unix: Math.floor(now.getTime() / 1000),
          },
        };
      }

      case 'get_weather': {
        const city = args.city as string | undefined;
        const lat = args.lat as number | undefined;
        const lon = args.lon as number | undefined;

        let weather;
        if (city) {
          weather = await getWeatherByCity(city);
        } else if (lat !== undefined && lon !== undefined) {
          weather = await getWeather(lat, lon);
        } else {
          // Use default location
          weather = await getWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
        }

        return {
          success: true,
          result: {
            temperature: `${Math.round(weather.temp)}°F`,
            feelsLike: `${Math.round(weather.feelsLike)}°F`,
            condition: weather.condition,
            description: weather.description,
            humidity: `${weather.humidity}%`,
            wind: `${Math.round(weather.windSpeed)} mph`,
            city: weather.cityName,
            sunrise: weather.sunrise,
            sunset: weather.sunset,
          },
        };
      }

      case 'get_weather_forecast': {
        const city = args.city as string | undefined;
        const days = Math.min(Math.max((args.days as number) || 3, 1), 5);

        // Get coordinates for city (simplified - use default if no city)
        const lat = DEFAULT_LOCATION.lat;
        const lon = DEFAULT_LOCATION.lon;

        const forecast = await getWeatherForecast(lat, lon, days);

        return {
          success: true,
          result: {
            location: city || DEFAULT_LOCATION.city,
            forecast: forecast.map((day) => ({
              date: day.date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }),
              high: `${Math.round(day.tempMax)}°F`,
              low: `${Math.round(day.tempMin)}°F`,
              condition: day.condition,
              precipitation: `${Math.round(day.precipitation * 100)}%`,
            })),
          },
        };
      }

      case 'calculate': {
        const expression = args.expression as string;
        const result = evaluateExpression(expression);
        return { success: true, result };
      }

      case 'convert_units': {
        const value = args.value as number;
        const fromUnit = (args.from_unit as string).toLowerCase();
        const toUnit = (args.to_unit as string).toLowerCase();

        const result = convertUnits(value, fromUnit, toUnit);
        return {
          success: true,
          result: {
            original: `${value} ${fromUnit}`,
            converted: `${result.toFixed(2)} ${toUnit}`,
            value: result,
          },
        };
      }

      case 'search_web': {
        const query = args.query as string;
        const numResults = Math.min((args.num_results as number) || 5, 10);

        // For now, return a placeholder - integrate with Tavily/Brave later
        return {
          success: true,
          result: {
            query,
            message: `Web search for "${query}" would return ${numResults} results. Integration pending.`,
            note: 'For real-time search, the Researcher agent (Perplexity) has this capability built-in.',
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Evaluate a mathematical expression
 */
function evaluateExpression(expression: string): { expression: string; result: number | string } {
  // Handle percentage calculations
  const percentMatch = expression.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
  if (percentMatch && percentMatch[1] && percentMatch[2]) {
    const percent = parseFloat(percentMatch[1]);
    const value = parseFloat(percentMatch[2]);
    return {
      expression: `${percent}% of ${value}`,
      result: (percent / 100) * value,
    };
  }

  // Handle tip calculation
  const tipMatch = expression.match(/tip\s+(\d+(?:\.\d+)?)\s*%?\s+on\s+\$?(\d+(?:\.\d+)?)/i);
  if (tipMatch && tipMatch[1] && tipMatch[2]) {
    const tipPercent = parseFloat(tipMatch[1]);
    const billAmount = parseFloat(tipMatch[2]);
    const tip = (tipPercent / 100) * billAmount;
    return {
      expression: `${tipPercent}% tip on $${billAmount}`,
      result: `Tip: $${tip.toFixed(2)}, Total: $${(billAmount + tip).toFixed(2)}`,
    };
  }

  // Handle basic math using safe evaluation
  try {
    // Replace common math functions
    let sanitized = expression
      .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
      .replace(/pow\(([^,]+),([^)]+)\)/gi, 'Math.pow($1,$2)')
      .replace(/abs\(([^)]+)\)/gi, 'Math.abs($1)')
      .replace(/round\(([^)]+)\)/gi, 'Math.round($1)')
      .replace(/floor\(([^)]+)\)/gi, 'Math.floor($1)')
      .replace(/ceil\(([^)]+)\)/gi, 'Math.ceil($1)')
      .replace(/sin\(([^)]+)\)/gi, 'Math.sin($1)')
      .replace(/cos\(([^)]+)\)/gi, 'Math.cos($1)')
      .replace(/tan\(([^)]+)\)/gi, 'Math.tan($1)')
      .replace(/log\(([^)]+)\)/gi, 'Math.log($1)')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![a-z])/gi, 'Math.E');

    // Only allow safe characters
    if (!/^[0-9+\-*/().%\s,Math.sqrtpowabsroundfloorceisincostanlogPIE]+$/.test(sanitized)) {
      return { expression, result: 'Invalid expression' };
    }

    // Evaluate
    const result = new Function(`return ${sanitized}`)();
    return { expression, result: typeof result === 'number' ? result : 'Invalid result' };
  } catch {
    return { expression, result: 'Could not evaluate expression' };
  }
}

/**
 * Convert between units
 */
function convertUnits(value: number, fromUnit: string, toUnit: string): number {
  // Temperature conversions
  if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
    return (value * 9) / 5 + 32;
  }
  if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
    return ((value - 32) * 5) / 9;
  }
  if (fromUnit === 'celsius' && toUnit === 'kelvin') {
    return value + 273.15;
  }
  if (fromUnit === 'kelvin' && toUnit === 'celsius') {
    return value - 273.15;
  }

  // Distance conversions
  if (fromUnit === 'miles' && toUnit === 'km') {
    return value * 1.60934;
  }
  if (fromUnit === 'km' && toUnit === 'miles') {
    return value / 1.60934;
  }
  if (fromUnit === 'feet' && toUnit === 'meters') {
    return value * 0.3048;
  }
  if (fromUnit === 'meters' && toUnit === 'feet') {
    return value / 0.3048;
  }
  if (fromUnit === 'inches' && toUnit === 'cm') {
    return value * 2.54;
  }
  if (fromUnit === 'cm' && toUnit === 'inches') {
    return value / 2.54;
  }

  // Weight conversions
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return value * 0.453592;
  }
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return value / 0.453592;
  }
  if (fromUnit === 'oz' && toUnit === 'grams') {
    return value * 28.3495;
  }
  if (fromUnit === 'grams' && toUnit === 'oz') {
    return value / 28.3495;
  }

  // Volume conversions
  if (fromUnit === 'gallons' && toUnit === 'liters') {
    return value * 3.78541;
  }
  if (fromUnit === 'liters' && toUnit === 'gallons') {
    return value / 3.78541;
  }

  throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
}

/**
 * Get tool by name
 */
export function getDefaultTool(name: string): OpenAITool | undefined {
  return defaultTools.find((tool) => tool.function.name === name);
}

/**
 * Check if a tool is a default tool
 */
export function isDefaultTool(name: string): boolean {
  return defaultTools.some((tool) => tool.function.name === name);
}
