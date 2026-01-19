/**
 * WeatherWidget Types
 * Comprehensive type definitions for weather components
 */

export interface WeatherWidgetProps {
  location?: string;
  lat?: number;
  lon?: number;
  unit?: TemperatureUnit;
  showForecast?: boolean;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export type WeatherCondition =
  | 'Clear'
  | 'Clouds'
  | 'Rain'
  | 'Drizzle'
  | 'Snow'
  | 'Thunderstorm'
  | 'Mist'
  | 'Fog'
  | 'Haze'
  | 'Wind'
  | 'Dust'
  | 'Smoke'
  | 'Tornado';

export interface WeatherCurrent {
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windGust?: number;
  windDeg: number;
  condition: string;
  description: string;
  icon: string;
  visibility: number;
  clouds: number;
  sunrise: string;
  sunset: string;
  cityName: string;
  timezone?: number;
  dewPoint?: number;
}

export interface ForecastDay {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  description: string;
  icon: string;
  precipitation: number;
  humidity?: number;
  windSpeed?: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  icon: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

export interface WeatherResponse {
  current: WeatherCurrent;
  forecast: ForecastDay[] | null;
  hourly?: HourlyForecast[] | null;
  alerts?: WeatherAlert[] | null;
  airQuality?: AirQuality | null;
  uvIndex?: UVIndex | null;
  updatedAt: string;
  isMockData?: boolean;
}

export interface AirQuality {
  aqi: number;
  category: AQICategory;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  co: number;
  so2?: number;
}

export type AQICategory =
  | 'good'
  | 'moderate'
  | 'unhealthy-sensitive'
  | 'unhealthy'
  | 'very-unhealthy'
  | 'hazardous';

export interface UVIndex {
  value: number;
  category: UVCategory;
  peakTime?: string;
}

export type UVCategory = 'low' | 'moderate' | 'high' | 'very-high' | 'extreme';

export interface WeatherAlert {
  id: string;
  event: string;
  severity: AlertSeverity;
  headline: string;
  description: string;
  start: string;
  end: string;
  sender?: string;
}

export type AlertSeverity = 'minor' | 'moderate' | 'severe' | 'extreme';

export interface MoonPhase {
  phase: MoonPhaseName;
  illumination: number;
  moonrise?: string;
  moonset?: string;
}

export type MoonPhaseName =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

export type WeatherTab = 'overview' | 'hourly' | 'daily' | 'details' | 'alerts';

export interface WeatherCommandCenterProps {
  onClose: () => void;
  data: WeatherResponse;
  unit: TemperatureUnit;
  onUnitChange: (unit: TemperatureUnit) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export interface WeatherMetricProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  className?: string;
}

export interface ForecastCardProps {
  day: ForecastDay;
  index: number;
  unit: TemperatureUnit;
  convertTemp: (temp: number) => number;
}

export interface CurrentWeatherProps {
  current: WeatherCurrent;
  unit: TemperatureUnit;
  convertTemp: (temp: number) => number;
}

export interface WeatherIconProps {
  condition: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

export interface SunriseSunsetProps {
  sunrise: string;
  sunset: string;
  timezone?: number;
}

export interface WindCompassProps {
  direction: number;
  speed: number;
  gust?: number;
  unit: TemperatureUnit;
}

export interface HourlyForecastProps {
  hourly: HourlyForecast[];
  unit: TemperatureUnit;
  convertTemp: (temp: number) => number;
}

export interface AirQualityCardProps {
  airQuality: AirQuality;
}

export interface UVIndexCardProps {
  uvIndex: UVIndex;
}

export interface WeatherAlertsProps {
  alerts: WeatherAlert[];
}

export interface PrecipitationChartProps {
  forecast: ForecastDay[];
}

export interface WeatherInsightsProps {
  current: WeatherCurrent;
  forecast: ForecastDay[] | null;
}

export interface LocationSearchProps {
  currentLocation: string;
  onLocationChange: (location: string) => void;
  onClose: () => void;
}
