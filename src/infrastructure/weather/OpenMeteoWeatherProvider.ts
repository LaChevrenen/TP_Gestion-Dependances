import { inject, injectable } from "inversify";
import { TYPES } from "../../types.js";
import type { Coordinates } from "../../domain/Coordinates.js";
import type { HourlyReadings } from "../../domain/Forecast.js";
import { ProviderUnavailableError } from "../../domain/errors/ProviderUnavailableError.js";
import type { WeatherProvider } from "../../domain/ports/WeatherProvider.js";
import type { AppConfig } from "../../config/Config.js";
import type { HttpClient } from "../http/HttpClient.js";
import type { OpenMeteoResponse } from "./OpenMeteoTypes.js";

const PROVIDER_NAME = "open-meteo";

@injectable()
export class OpenMeteoWeatherProvider implements WeatherProvider {
  constructor(
    @inject(TYPES.HttpClient) private readonly httpClient: HttpClient,
    @inject(TYPES.Config) private readonly config: AppConfig
  ) {}

  async getHourlyForecast(coordinates: Coordinates): Promise<HourlyReadings> {
    const url =
      `${this.config.openMeteoBaseUrl}/v1/forecast` +
      `?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}` +
      `&hourly=shortwave_radiation`;

    let response: OpenMeteoResponse;
    try {
      response = await this.httpClient.getJson<OpenMeteoResponse>(url, {
        timeoutMs: this.config.httpTimeoutMs,
      });
    } catch (err) {
      throw new ProviderUnavailableError(PROVIDER_NAME, err);
    }

    const time = response.hourly?.time;
    const shortwaveRadiation = response.hourly?.shortwave_radiation;

    if (!Array.isArray(time) || !Array.isArray(shortwaveRadiation)) {
      throw new ProviderUnavailableError(
        PROVIDER_NAME,
        new Error("Malformed Open-Meteo response: missing hourly.time or hourly.shortwave_radiation")
      );
    }

    return { time, shortwaveRadiation };
  }
}
