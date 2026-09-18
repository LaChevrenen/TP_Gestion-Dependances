import { inject, injectable } from "inversify";
import { TYPES } from "../types.js";
import type { Forecast } from "../domain/Forecast.js";
import type { Geocoder } from "../domain/ports/Geocoder.js";
import type { WeatherProvider } from "../domain/ports/WeatherProvider.js";

@injectable()
export class ForecastService {
  constructor(
    @inject(TYPES.Geocoder) private readonly geocoder: Geocoder,
    @inject(TYPES.WeatherProvider) private readonly weatherProvider: WeatherProvider
  ) {}

  async getForecast(address: string): Promise<Forecast> {
    const coordinates = await this.geocoder.geocode(address);
    const weather = await this.weatherProvider.getHourlyForecast(coordinates);
    return {
      location: { address, coordinates },
      timezone: weather.timezone,
      hourly: weather.hourly,
    };
  }
}
