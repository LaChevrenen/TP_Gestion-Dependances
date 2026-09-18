import type { Coordinates } from "../../src/domain/Coordinates.js";
import type { WeatherForecast } from "../../src/domain/Forecast.js";
import type { WeatherProvider } from "../../src/domain/ports/WeatherProvider.js";

export class FakeWeatherProvider implements WeatherProvider {
  constructor(private readonly result: WeatherForecast | Error) {}

  async getHourlyForecast(_coordinates: Coordinates): Promise<WeatherForecast> {
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}
