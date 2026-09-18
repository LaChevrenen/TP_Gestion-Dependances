import { inject, injectable } from "inversify";
import { TYPES } from "../../types.js";
import type { Coordinates } from "../../domain/Coordinates.js";
import type { HourlyPoint, WeatherForecast } from "../../domain/Forecast.js";
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

  async getHourlyForecast(coordinates: Coordinates): Promise<WeatherForecast> {
    const url =
      `${this.config.openMeteoBaseUrl}/v1/forecast` +
      `?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}` +
      `&hourly=shortwave_radiation` +
      `&timezone=${encodeURIComponent(this.config.openMeteoTimezone)}`;

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
    // timezone vient de la reponse (parametre timezone=auto repercute par Open-Meteo),
    // jamais d'une valeur en dur : voir README, section ADR.
    const { timezone } = response;
    const shortwaveRadiationUnit = response.hourly_units?.shortwave_radiation;

    if (
      !Array.isArray(time) ||
      !Array.isArray(shortwaveRadiation) ||
      time.length !== shortwaveRadiation.length ||
      typeof timezone !== "string" ||
      typeof shortwaveRadiationUnit !== "string"
    ) {
      throw new ProviderUnavailableError(
        PROVIDER_NAME,
        new Error(
          "Malformed Open-Meteo response: missing timezone, hourly.time, hourly.shortwave_radiation or hourly_units.shortwave_radiation"
        )
      );
    }

    const hourly: HourlyPoint[] = time.map((t, i) => ({
      time: t,
      shortwaveRadiation: { value: shortwaveRadiation[i]!, unit: shortwaveRadiationUnit },
    }));

    return { timezone, hourly };
  }
}
