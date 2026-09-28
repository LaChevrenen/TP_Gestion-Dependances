import type { Forecast } from "../domain/Forecast.js";

const CELSIUS_UNITS: ReadonlySet<string> = new Set(["°C", "celsius"]);

export interface ForecastResponse {
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly hourly: readonly { readonly time: string; readonly temperatureCelsius: number }[];
}

// Contrat public unique : identique quel que soit le fournisseur ou le mode demo.
export function toForecastResponse(forecast: Forecast): ForecastResponse {
  return {
    address: forecast.location.address,
    latitude: forecast.location.coordinates.latitude,
    longitude: forecast.location.coordinates.longitude,
    hourly: forecast.hourly.flatMap(({ time, temperature }) => {
      if (!temperature) {
        return [];
      }
      if (!CELSIUS_UNITS.has(temperature.unit)) {
        throw new Error(`Unsupported temperature unit: ${temperature.unit}`);
      }
      return [{ time, temperatureCelsius: temperature.value }];
    }),
  };
}
