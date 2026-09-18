import type { Forecast } from "../domain/Forecast.js";

export interface ForecastResponse {
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
  readonly hourly: {
    readonly time: readonly string[];
    readonly shortwave_radiation: readonly number[];
  };
  readonly hourly_units: {
    readonly time: string;
    readonly shortwave_radiation: string;
  };
}

export function toForecastResponse(forecast: Forecast): ForecastResponse {
  return {
    address: forecast.location.address,
    latitude: forecast.location.coordinates.latitude,
    longitude: forecast.location.coordinates.longitude,
    timezone: forecast.timezone,
    hourly: {
      time: forecast.hourly.time,
      shortwave_radiation: forecast.hourly.shortwaveRadiation,
    },
    hourly_units: {
      time: forecast.hourlyUnits.time,
      shortwave_radiation: forecast.hourlyUnits.shortwaveRadiation,
    },
  };
}
