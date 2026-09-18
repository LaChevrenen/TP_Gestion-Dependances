import type { Forecast, HourlyPoint } from "../domain/Forecast.js";

export interface ForecastResponse {
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
  readonly hourly: readonly HourlyPoint[];
}

export function toForecastResponse(forecast: Forecast): ForecastResponse {
  return {
    address: forecast.location.address,
    latitude: forecast.location.coordinates.latitude,
    longitude: forecast.location.coordinates.longitude,
    timezone: forecast.timezone,
    hourly: forecast.hourly,
  };
}
