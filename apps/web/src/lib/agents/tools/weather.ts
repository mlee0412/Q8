/**
 * Weather API Integration
 * Uses OpenWeatherMap API for weather data
 */

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

export interface WeatherData {
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  condition: string;
  description: string;
  icon: string;
  visibility: number;
  clouds: number;
  sunrise: string;
  sunset: string;
  timezone: number;
  cityName: string;
}

export interface ForecastData {
  date: Date;
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  description: string;
  icon: string;
  precipitation: number;
}

/**
 * Get current weather for a location
 */
export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY not configured');
  }

  const url = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    temp: data.main.temp,
    feelsLike: data.main.feels_like,
    tempMin: data.main.temp_min,
    tempMax: data.main.temp_max,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    windSpeed: data.wind.speed,
    windDeg: data.wind.deg || 0,
    condition: data.weather[0]?.main || 'Unknown',
    description: data.weather[0]?.description || 'Unknown',
    icon: data.weather[0]?.icon || '01d',
    visibility: data.visibility || 10000,
    clouds: data.clouds?.all || 0,
    sunrise: formatTime(data.sys.sunrise, data.timezone),
    sunset: formatTime(data.sys.sunset, data.timezone),
    timezone: data.timezone,
    cityName: data.name,
  };
}

/**
 * Get weather forecast (5-day, 3-hour intervals)
 */
export async function getWeatherForecast(
  lat: number,
  lon: number,
  days: number = 5
): Promise<ForecastData[]> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY not configured');
  }

  const url = `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Group by day and get daily summaries
  const dailyForecasts: Map<string, ForecastData> = new Map();

  for (const item of data.list) {
    const date = new Date(item.dt * 1000);
    const dateKey = date.toISOString().split('T')[0] || '';

    if (!dailyForecasts.has(dateKey)) {
      dailyForecasts.set(dateKey, {
        date,
        temp: item.main.temp,
        tempMin: item.main.temp_min,
        tempMax: item.main.temp_max,
        condition: item.weather[0]?.main || 'Unknown',
        description: item.weather[0]?.description || 'Unknown',
        icon: item.weather[0]?.icon || '01d',
        precipitation: item.pop || 0,
      });
    } else {
      const existing = dailyForecasts.get(dateKey);
      if (existing) {
        existing.tempMin = Math.min(existing.tempMin, item.main.temp_min);
        existing.tempMax = Math.max(existing.tempMax, item.main.temp_max);
        existing.precipitation = Math.max(existing.precipitation, item.pop || 0);
      }
    }
  }

  return Array.from(dailyForecasts.values()).slice(0, days);
}

/**
 * Get weather by city name
 */
export async function getWeatherByCity(city: string): Promise<WeatherData> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY not configured');
  }

  const url = `${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(city)}&units=imperial&appid=${OPENWEATHER_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    temp: data.main.temp,
    feelsLike: data.main.feels_like,
    tempMin: data.main.temp_min,
    tempMax: data.main.temp_max,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    windSpeed: data.wind.speed,
    windDeg: data.wind.deg || 0,
    condition: data.weather[0]?.main || 'Unknown',
    description: data.weather[0]?.description || 'Unknown',
    icon: data.weather[0]?.icon || '01d',
    visibility: data.visibility || 10000,
    clouds: data.clouds?.all || 0,
    sunrise: formatTime(data.sys.sunrise, data.timezone),
    sunset: formatTime(data.sys.sunset, data.timezone),
    timezone: data.timezone,
    cityName: data.name,
  };
}

/**
 * Format Unix timestamp to time string
 */
function formatTime(unixTimestamp: number, timezoneOffset: number): string {
  const date = new Date((unixTimestamp + timezoneOffset) * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC', // Already adjusted for timezone
  });
}

/**
 * Get weather icon URL
 */
export function getWeatherIconUrl(iconCode: string, size: '1x' | '2x' | '4x' = '2x'): string {
  const sizeMap = { '1x': '', '2x': '@2x', '4x': '@4x' };
  return `https://openweathermap.org/img/wn/${iconCode}${sizeMap[size]}.png`;
}

/**
 * Get weather condition category for suggestions
 */
export function getWeatherCategory(
  condition: string
): 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy' {
  const lowerCondition = condition.toLowerCase();

  if (lowerCondition.includes('thunder') || lowerCondition.includes('storm')) {
    return 'stormy';
  }
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
    return 'rainy';
  }
  if (lowerCondition.includes('snow') || lowerCondition.includes('sleet')) {
    return 'snowy';
  }
  if (lowerCondition.includes('fog') || lowerCondition.includes('mist') || lowerCondition.includes('haze')) {
    return 'foggy';
  }
  if (lowerCondition.includes('cloud') || lowerCondition.includes('overcast')) {
    return 'cloudy';
  }
  return 'clear';
}

/**
 * Generate weather-based suggestion
 */
export function getWeatherSuggestion(weather: WeatherData): string | null {
  const category = getWeatherCategory(weather.condition);

  if (category === 'rainy') {
    return "Don't forget your umbrella today!";
  }
  if (category === 'stormy') {
    return 'Thunderstorms expected. Consider staying indoors if possible.';
  }
  if (category === 'snowy') {
    return 'Snow expected. Drive carefully and bundle up!';
  }
  if (weather.temp > 90) {
    return "It's hot today! Stay hydrated and seek shade.";
  }
  if (weather.temp < 32) {
    return "It's freezing! Dress warmly with layers.";
  }
  if (weather.feelsLike < weather.temp - 10) {
    return `Wind chill makes it feel like ${Math.round(weather.feelsLike)}°F. Dress warmer!`;
  }

  return null;
}
