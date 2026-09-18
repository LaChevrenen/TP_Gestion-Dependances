import type { Forecast } from "../domain/Forecast.js";

export interface ForecastResponse {
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly hourly: {
    readonly time: readonly string[];
    readonly shortwave_radiation: readonly number[];
  };
}

export function toForecastResponse(forecast: Forecast): ForecastResponse {
  return {
    address: forecast.location.address,
    latitude: forecast.location.coordinates.latitude,
    longitude: forecast.location.coordinates.longitude,
    hourly: {
      time: forecast.hourly.time,
      shortwave_radiation: forecast.hourly.shortwaveRadiation,
    },
  };
}
