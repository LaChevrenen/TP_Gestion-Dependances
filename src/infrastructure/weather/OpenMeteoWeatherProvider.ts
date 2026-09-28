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
      `&hourly=temperature_2m,shortwave_radiation` +
      `&timeformat=unixtime` +
      `&timezone=${encodeURIComponent(this.config.openMeteoTimezone)}`;

    let response: OpenMeteoResponse;
    try {
      response = await this.httpClient.getJson<OpenMeteoResponse>(url, {
        headers: { "User-Agent": this.config.openMeteoUserAgent },
        timeoutMs: this.config.httpTimeoutMs,
      });
    } catch (err) {
      throw new ProviderUnavailableError(PROVIDER_NAME, err);
    }

    const time = response.hourly?.time;
    const temperature = response.hourly?.temperature_2m;
    const shortwaveRadiation = response.hourly?.shortwave_radiation;
    // timezone vient de la reponse (parametre timezone=auto repercute par Open-Meteo),
    // jamais d'une valeur en dur : voir README, section ADR.
    const { timezone } = response;
    const temperatureUnit = response.hourly_units?.temperature_2m;
    const shortwaveRadiationUnit = response.hourly_units?.shortwave_radiation;

    if (
      !Array.isArray(time) ||
      !Array.isArray(temperature) ||
      !Array.isArray(shortwaveRadiation) ||
      time.length === 0 ||
      temperature.length !== time.length ||
      shortwaveRadiation.length !== time.length ||
      typeof timezone !== "string" ||
      typeof temperatureUnit !== "string" ||
      typeof shortwaveRadiationUnit !== "string"
    ) {
      throw new ProviderUnavailableError(
        PROVIDER_NAME,
        new Error(
          "Malformed or empty Open-Meteo response: missing timezone, hourly.time/temperature_2m/shortwave_radiation or the matching hourly_units"
        )
      );
    }

    // timeformat=unixtime : instants UTC non ambigus, quel que soit le fuseau demande.
    const hourly: HourlyPoint[] = time.map((seconds, i) => {
      const temperatureValue = temperature[i];
      const radiationValue = shortwaveRadiation[i];
      return {
        time: new Date(seconds * 1000).toISOString().replace(".000Z", "Z"),
        ...(typeof temperatureValue === "number"
          ? { temperature: { value: temperatureValue, unit: temperatureUnit } }
          : {}),
        ...(typeof radiationValue === "number"
          ? { shortwaveRadiation: { value: radiationValue, unit: shortwaveRadiationUnit } }
          : {}),
      };
    });

    return { timezone, hourly };
  }
}
