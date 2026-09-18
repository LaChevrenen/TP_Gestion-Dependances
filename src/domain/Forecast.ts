import type { Location } from "./Location.js";

export interface WeatherMeasurement {
  readonly value: number;
  readonly unit: string;
}

export interface HourlyPoint {
  readonly time: string;
  readonly temperature?: WeatherMeasurement;
  readonly shortwaveRadiation?: WeatherMeasurement;
  readonly windSpeed?: WeatherMeasurement;
}

export interface WeatherForecast {
  readonly timezone: string;
  readonly hourly: readonly HourlyPoint[];
}

export interface Forecast {
  readonly location: Location;
  readonly timezone: string;
  readonly hourly: readonly HourlyPoint[];
}
