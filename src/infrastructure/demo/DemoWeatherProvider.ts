import type { WeatherForecast } from "../../domain/Forecast.js";
import type { WeatherProvider } from "../../domain/ports/WeatherProvider.js";

const START_MS = Date.UTC(2025, 5, 10);
const HOUR_MS = 3_600_000;

// Mode demo : serie deterministe (date fixe, pas d'horloge) sur 24 h, cycle jour/nuit.
export class DemoWeatherProvider implements WeatherProvider {
  async getHourlyForecast(): Promise<WeatherForecast> {
    return {
      timezone: "UTC",
      hourly: Array.from({ length: 24 }, (_, hour) => ({
        time: new Date(START_MS + hour * HOUR_MS).toISOString().replace(".000Z", "Z"),
        temperature: {
          value: Math.round((18 + 8 * Math.sin(((hour - 9) / 24) * 2 * Math.PI)) * 10) / 10,
          unit: "celsius",
        },
      })),
    };
  }
}
