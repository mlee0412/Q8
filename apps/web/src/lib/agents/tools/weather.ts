/**
 * Weather API Integration
 * Uses OpenWeatherMap API for weather data
 */

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const OPENWEATHER_ONECALL_URL = 'https://api.openweathermap.org/data/3.0/onecall';
const OPENWEATHER_AQI_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

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

export interface HourlyForecastData {
  time: string;
  temp: number;
  condition: string;
  icon: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

export interface AirQualityData {
  aqi: number;
  category: 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous';
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  co: number;
  so2: number;
}

export interface UVIndexData {
  value: number;
  category: 'low' | 'moderate' | 'high' | 'very-high' | 'extreme';
  peakTime?: string;
}

export interface WeatherAlertData {
  id: string;
  event: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  headline: string;
  description: string;
  start: string;
  end: string;
  sender?: string;
}

export interface ExtendedWeatherData {
  current: WeatherData;
  hourly: HourlyForecastData[];
  daily: ForecastData[];
  alerts: WeatherAlertData[];
  airQuality: AirQualityData | null;
  uvIndex: UVIndexData;
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

/**
 * Get extended weather data using One Call API 3.0
 * Includes hourly forecast, daily forecast, alerts, and UV index
 */
export async function getExtendedWeather(lat: number, lon: number): Promise<ExtendedWeatherData> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY not configured');
  }

  // Fetch One Call API data
  const oneCallUrl = `${OPENWEATHER_ONECALL_URL}?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
  const oneCallResponse = await fetch(oneCallUrl);

  if (!oneCallResponse.ok) {
    throw new Error(`One Call API error: ${oneCallResponse.status} ${oneCallResponse.statusText}`);
  }

  const oneCallData = await oneCallResponse.json();

  // Fetch Air Quality data
  let airQuality: AirQualityData | null = null;
  try {
    const aqiUrl = `${OPENWEATHER_AQI_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;
    const aqiResponse = await fetch(aqiUrl);
    if (aqiResponse.ok) {
      const aqiData = await aqiResponse.json();
      if (aqiData.list && aqiData.list[0]) {
        const aqi = aqiData.list[0];
        airQuality = {
          aqi: aqi.main.aqi * 50, // Convert 1-5 scale to approximate AQI
          category: getAQICategory(aqi.main.aqi),
          pm25: aqi.components.pm2_5 || 0,
          pm10: aqi.components.pm10 || 0,
          o3: aqi.components.o3 || 0,
          no2: aqi.components.no2 || 0,
          co: aqi.components.co || 0,
          so2: aqi.components.so2 || 0,
        };
      }
    }
  } catch {
    // Air quality data is optional
  }

  // Parse current weather
  const current: WeatherData = {
    temp: oneCallData.current.temp,
    feelsLike: oneCallData.current.feels_like,
    tempMin: oneCallData.daily[0]?.temp?.min || oneCallData.current.temp - 5,
    tempMax: oneCallData.daily[0]?.temp?.max || oneCallData.current.temp + 5,
    humidity: oneCallData.current.humidity,
    pressure: oneCallData.current.pressure,
    windSpeed: oneCallData.current.wind_speed,
    windDeg: oneCallData.current.wind_deg || 0,
    condition: oneCallData.current.weather[0]?.main || 'Unknown',
    description: oneCallData.current.weather[0]?.description || 'Unknown',
    icon: oneCallData.current.weather[0]?.icon || '01d',
    visibility: oneCallData.current.visibility || 10000,
    clouds: oneCallData.current.clouds || 0,
    sunrise: formatTime(oneCallData.current.sunrise, oneCallData.timezone_offset),
    sunset: formatTime(oneCallData.current.sunset, oneCallData.timezone_offset),
    timezone: oneCallData.timezone_offset,
    cityName: oneCallData.timezone?.split('/')[1]?.replace('_', ' ') || 'Unknown',
  };

  // Parse hourly forecast (next 48 hours)
  const hourly: HourlyForecastData[] = (oneCallData.hourly || []).slice(0, 48).map((h: Record<string, unknown>) => ({
    time: new Date((h.dt as number) * 1000).toISOString(),
    temp: h.temp as number,
    condition: ((h.weather as Array<{ main?: string }>)?.[0]?.main) || 'Unknown',
    icon: ((h.weather as Array<{ icon?: string }>)?.[0]?.icon) || '01d',
    precipitation: (h.pop as number) || 0,
    windSpeed: h.wind_speed as number,
    humidity: h.humidity as number,
  }));

  // Parse daily forecast (next 7 days)
  const daily: ForecastData[] = (oneCallData.daily || []).slice(0, 7).map((d: Record<string, unknown>) => ({
    date: new Date((d.dt as number) * 1000),
    temp: (d.temp as { day: number })?.day || 0,
    tempMin: (d.temp as { min: number })?.min || 0,
    tempMax: (d.temp as { max: number })?.max || 0,
    condition: ((d.weather as Array<{ main?: string }>)?.[0]?.main) || 'Unknown',
    description: ((d.weather as Array<{ description?: string }>)?.[0]?.description) || 'Unknown',
    icon: ((d.weather as Array<{ icon?: string }>)?.[0]?.icon) || '01d',
    precipitation: (d.pop as number) || 0,
  }));

  // Parse alerts
  const alerts: WeatherAlertData[] = (oneCallData.alerts || []).map((a: Record<string, unknown>, index: number) => ({
    id: `alert-${index}-${a.start}`,
    event: (a.event as string) || 'Weather Alert',
    severity: mapAlertSeverity(a.tags as string[] | undefined),
    headline: (a.event as string) || 'Weather Alert',
    description: (a.description as string) || '',
    start: new Date((a.start as number) * 1000).toISOString(),
    end: new Date((a.end as number) * 1000).toISOString(),
    sender: a.sender_name as string | undefined,
  }));

  // Parse UV Index
  const uvIndex: UVIndexData = {
    value: Math.round(oneCallData.current.uvi || 0),
    category: getUVCategory(oneCallData.current.uvi || 0),
  };

  return {
    current,
    hourly,
    daily,
    alerts,
    airQuality,
    uvIndex,
  };
}

/**
 * Get AQI category from OpenWeatherMap's 1-5 scale
 */
function getAQICategory(aqi: number): AirQualityData['category'] {
  switch (aqi) {
    case 1: return 'good';
    case 2: return 'moderate';
    case 3: return 'unhealthy-sensitive';
    case 4: return 'unhealthy';
    case 5: return 'hazardous';
    default: return 'moderate';
  }
}

/**
 * Get UV category from UV index value
 */
function getUVCategory(uvi: number): UVIndexData['category'] {
  if (uvi <= 2) return 'low';
  if (uvi <= 5) return 'moderate';
  if (uvi <= 7) return 'high';
  if (uvi <= 10) return 'very-high';
  return 'extreme';
}

/**
 * Map alert tags to severity level
 */
function mapAlertSeverity(tags?: string[]): WeatherAlertData['severity'] {
  if (!tags || tags.length === 0) return 'moderate';
  const tagStr = tags.join(' ').toLowerCase();
  if (tagStr.includes('extreme') || tagStr.includes('emergency')) return 'extreme';
  if (tagStr.includes('severe') || tagStr.includes('warning')) return 'severe';
  if (tagStr.includes('watch') || tagStr.includes('advisory')) return 'moderate';
  return 'minor';
}

/**
 * Get hourly forecast from standard API (fallback when One Call not available)
 */
export async function getHourlyForecast(lat: number, lon: number): Promise<HourlyForecastData[]> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY not configured');
  }

  const url = `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Forecast API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return data.list.slice(0, 24).map((item: Record<string, unknown>) => ({
    time: new Date((item.dt as number) * 1000).toISOString(),
    temp: (item.main as { temp: number })?.temp || 0,
    condition: ((item.weather as Array<{ main?: string }>)?.[0]?.main) || 'Unknown',
    icon: ((item.weather as Array<{ icon?: string }>)?.[0]?.icon) || '01d',
    precipitation: (item.pop as number) || 0,
    windSpeed: (item.wind as { speed: number })?.speed || 0,
    humidity: (item.main as { humidity: number })?.humidity || 0,
  }));
}

/**
 * Get air quality data
 */
export async function getAirQuality(lat: number, lon: number): Promise<AirQualityData | null> {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OPENWEATHER_API_KEY not configured');
  }

  try {
    const url = `${OPENWEATHER_AQI_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.list || !data.list[0]) {
      return null;
    }

    const aqi = data.list[0];
    return {
      aqi: aqi.main.aqi * 50,
      category: getAQICategory(aqi.main.aqi),
      pm25: aqi.components.pm2_5 || 0,
      pm10: aqi.components.pm10 || 0,
      o3: aqi.components.o3 || 0,
      no2: aqi.components.no2 || 0,
      co: aqi.components.co || 0,
      so2: aqi.components.so2 || 0,
    };
  } catch {
    return null;
  }
}
