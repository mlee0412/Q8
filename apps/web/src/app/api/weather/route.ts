import { NextRequest, NextResponse } from 'next/server';
import { getWeather, getWeatherForecast, getWeatherByCity } from '@/lib/agents/tools/weather';

// Default location: User's NYC location
const DEFAULT_LAT = 40.7472;
const DEFAULT_LON = -73.9903;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const includeForecast = searchParams.get('forecast') === 'true';

    let weather;
    let forecast = null;

    if (city) {
      weather = await getWeatherByCity(city);
    } else {
      const latitude = lat ? parseFloat(lat) : DEFAULT_LAT;
      const longitude = lon ? parseFloat(lon) : DEFAULT_LON;
      weather = await getWeather(latitude, longitude);
    }

    if (includeForecast) {
      const latitude = lat ? parseFloat(lat) : DEFAULT_LAT;
      const longitude = lon ? parseFloat(lon) : DEFAULT_LON;
      forecast = await getWeatherForecast(latitude, longitude, 5);
    }

    return NextResponse.json({
      current: weather,
      forecast,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Weather API error:', error);
    
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
      updatedAt: new Date().toISOString(),
      isMockData: true,
    });
  }
}
