import { NextRequest, NextResponse } from 'next/server';
import {
  getWeather,
  getWeatherForecast,
  getWeatherByCity,
  getExtendedWeather,
  getHourlyForecast,
  getAirQuality,
} from '@/lib/agents/tools/weather';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { logger } from '@/lib/logger';

// Default location: User's NYC location
const DEFAULT_LAT = 40.7472;
const DEFAULT_LON = -73.9903;

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const includeForecast = searchParams.get('forecast') === 'true';
    const includeHourly = searchParams.get('hourly') === 'true';
    const includeAlerts = searchParams.get('alerts') === 'true';
    const includeAqi = searchParams.get('aqi') === 'true';
    const extended = searchParams.get('extended') === 'true';

    const latitude = lat ? parseFloat(lat) : DEFAULT_LAT;
    const longitude = lon ? parseFloat(lon) : DEFAULT_LON;

    // If extended mode requested, use One Call API 3.0 for all data
    if (extended) {
      try {
        const extendedData = await getExtendedWeather(latitude, longitude);
        
        // If city was provided, get city name from basic weather API
        if (city) {
          const cityWeather = await getWeatherByCity(city);
          extendedData.current.cityName = cityWeather.cityName;
        }

        return NextResponse.json({
          current: extendedData.current,
          forecast: extendedData.daily,
          hourly: extendedData.hourly,
          alerts: extendedData.alerts,
          airQuality: extendedData.airQuality,
          uvIndex: extendedData.uvIndex,
          updatedAt: new Date().toISOString(),
        });
      } catch (extendedError) {
        logger.warn('Extended weather API failed, falling back to basic API', { error: extendedError });
        // Fall through to basic API
      }
    }

    // Basic weather fetch
    let weather;
    let forecast = null;
    let hourly = null;
    let airQuality = null;

    if (city) {
      weather = await getWeatherByCity(city);
    } else {
      weather = await getWeather(latitude, longitude);
    }

    if (includeForecast) {
      forecast = await getWeatherForecast(latitude, longitude, 7);
    }

    if (includeHourly) {
      try {
        hourly = await getHourlyForecast(latitude, longitude);
      } catch {
        logger.warn('Hourly forecast fetch failed');
      }
    }

    if (includeAqi) {
      try {
        airQuality = await getAirQuality(latitude, longitude);
      } catch {
        logger.warn('Air quality fetch failed');
      }
    }

    return NextResponse.json({
      current: weather,
      forecast,
      hourly,
      alerts: includeAlerts ? [] : undefined, // Alerts require One Call API
      airQuality,
      uvIndex: undefined, // UV Index requires One Call API
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Weather API error', { error: error });
    
    // Return mock data if API fails (for development without API key)
    return NextResponse.json({
      current: {
        temp: 45,
        feelsLike: 41,
        tempMin: 38,
        tempMax: 52,
        humidity: 68,
        pressure: 1015,
        windSpeed: 12,
        windDeg: 270,
        condition: 'Clouds',
        description: 'overcast clouds',
        icon: '04d',
        visibility: 10000,
        clouds: 90,
        sunrise: '6:45 AM',
        sunset: '4:32 PM',
        timezone: -18000,
        cityName: 'New York',
      },
      forecast: [
        { date: new Date().toISOString(), temp: 45, tempMin: 38, tempMax: 52, condition: 'Clouds', description: 'overcast', icon: '04d', precipitation: 0.1 },
        { date: new Date(Date.now() + 86400000).toISOString(), temp: 48, tempMin: 40, tempMax: 55, condition: 'Clear', description: 'clear sky', icon: '01d', precipitation: 0 },
        { date: new Date(Date.now() + 172800000).toISOString(), temp: 42, tempMin: 35, tempMax: 48, condition: 'Rain', description: 'light rain', icon: '10d', precipitation: 0.6 },
        { date: new Date(Date.now() + 259200000).toISOString(), temp: 38, tempMin: 32, tempMax: 44, condition: 'Clouds', description: 'scattered clouds', icon: '03d', precipitation: 0.2 },
        { date: new Date(Date.now() + 345600000).toISOString(), temp: 50, tempMin: 42, tempMax: 58, condition: 'Clear', description: 'sunny', icon: '01d', precipitation: 0 },
      ],
      hourly: generateMockHourlyData(),
      alerts: [],
      airQuality: {
        aqi: 42,
        category: 'good',
        pm25: 8.5,
        pm10: 15.2,
        o3: 45,
        no2: 12,
        co: 0.3,
        so2: 2,
      },
      uvIndex: {
        value: 3,
        category: 'moderate',
      },
      updatedAt: new Date().toISOString(),
      isMockData: true,
    });
  }
}

function generateMockHourlyData() {
  const hourly = [];
  const baseTemp = 45;
  const conditions = ['Clouds', 'Clouds', 'Clear', 'Clear', 'Clouds', 'Rain'];
  
  for (let i = 0; i < 24; i++) {
    const hour = new Date(Date.now() + i * 3600000);
    const tempVariation = Math.sin((i / 24) * Math.PI * 2) * 8;
    hourly.push({
      time: hour.toISOString(),
      temp: Math.round(baseTemp + tempVariation),
      condition: conditions[i % conditions.length],
      icon: conditions[i % conditions.length] === 'Clear' ? '01d' : conditions[i % conditions.length] === 'Rain' ? '10d' : '04d',
      precipitation: conditions[i % conditions.length] === 'Rain' ? 0.6 : 0.1,
      windSpeed: 8 + Math.random() * 8,
      humidity: 60 + Math.random() * 20,
    });
  }
  return hourly;
}
