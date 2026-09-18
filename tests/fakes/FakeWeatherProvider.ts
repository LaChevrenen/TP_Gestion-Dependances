import type { Coordinates } from "../../src/domain/Coordinates.js";
import type { HourlyReadings } from "../../src/domain/Forecast.js";
import type { WeatherProvider } from "../../src/domain/ports/WeatherProvider.js";

export class FakeWeatherProvider implements WeatherProvider {
  constructor(private readonly result: HourlyReadings | Error) {}

  async getHourlyForecast(_coordinates: Coordinates): Promise<HourlyReadings> {
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}
