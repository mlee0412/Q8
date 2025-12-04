/**
 * Agent Tools Index
 * Exports all tool definitions and executors
 */

// Default utility tools (available to all agents)
export {
  defaultTools,
  executeDefaultTool,
  getDefaultTool,
  isDefaultTool,
} from './default-tools';

// Weather API
export {
  getWeather,
  getWeatherByCity,
  getWeatherForecast,
  getWeatherIconUrl,
  getWeatherCategory,
  getWeatherSuggestion,
  type WeatherData,
  type ForecastData,
} from './weather';

// Notes tools (for accessing user notes)
export {
  noteTools,
  executeNotesTool,
  getNoteContextForAgent,
  type NotesToolContext,
} from './notes';
