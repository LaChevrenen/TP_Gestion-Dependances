import { inject, injectable } from "inversify";
import { TYPES } from "../../types.js";
import type { Coordinates } from "../../domain/Coordinates.js";
import type { HourlyPoint, WeatherForecast, WeatherMeasurement } from "../../domain/Forecast.js";
import { ProviderUnavailableError } from "../../domain/errors/ProviderUnavailableError.js";
import type { WeatherProvider } from "../../domain/ports/WeatherProvider.js";
import type { AppConfig } from "../../config/Config.js";
import type { HttpClient } from "../http/HttpClient.js";
import type { MetNorwayResponse, MetNorwayTimeseriesEntry, MetNorwayUnits } from "./MetNorwayTypes.js";

const PROVIDER_NAME = "met-norway";

@injectable()
export class MetNorwayWeatherProvider implements WeatherProvider {
  constructor(
    @inject(TYPES.HttpClient) private readonly httpClient: HttpClient,
    @inject(TYPES.Config) private readonly config: AppConfig
  ) {}

  async getHourlyForecast(coordinates: Coordinates): Promise<WeatherForecast> {
    if (!this.config.metNorwayUserAgent) {
      // Garde-fou local : la validation "au demarrage" complete est ajoutee dans
      // container.ts (etape config du choix de fournisseur), mais l'adapter ne doit
      // jamais partir en requete sans User-Agent explicite (= 403 garanti chez MET Norway).
      throw new Error(
        "MET_NORWAY_USER_AGENT doit etre defini pour utiliser MetNorwayWeatherProvider " +
          "(un User-Agent generique de librairie est rejete avec un 403 par MET Norway)."
      );
    }

    // MET Norway tronque les coordonnees a 4 decimales.
    const lat = coordinates.latitude.toFixed(4);
    const lon = coordinates.longitude.toFixed(4);
    const url = `${this.config.metNorwayBaseUrl}/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;

    let response: MetNorwayResponse;
    try {
      response = await this.httpClient.getJson<MetNorwayResponse>(url, {
        headers: { "User-Agent": this.config.metNorwayUserAgent },
        timeoutMs: this.config.httpTimeoutMs,
      });
    } catch (err) {
      throw new ProviderUnavailableError(PROVIDER_NAME, err);
    }

    const timeseries = response.properties?.timeseries;
    const units = response.properties?.meta?.units;

    if (!Array.isArray(timeseries) || timeseries.length === 0 || !units) {
      throw new ProviderUnavailableError(
        PROVIDER_NAME,
        new Error("Malformed MET Norway response: missing properties.timeseries or properties.meta.units")
      );
    }

    return {
      // MET Norway renvoie systematiquement des horodatages UTC (suffixe "Z") : ce
      // n'est pas une valeur en dur inventee, c'est un fait documente sur ce fournisseur.
      timezone: "UTC",
      hourly: timeseries.map((entry) => toHourlyPoint(entry, units)),
    };
  }
}

function toHourlyPoint(entry: MetNorwayTimeseriesEntry, units: MetNorwayUnits): HourlyPoint {
  const details = entry.data?.instant?.details;
  const temperature = toMeasurement(details?.air_temperature, units.air_temperature);
  const windSpeed = toMeasurement(details?.wind_speed, units.wind_speed);

  return {
    time: entry.time,
    ...(temperature ? { temperature } : {}),
    ...(windSpeed ? { windSpeed } : {}),
  };
}

function toMeasurement(value: number | undefined, unit: string | undefined): WeatherMeasurement | undefined {
  if (value === undefined || unit === undefined) {
    return undefined;
  }
  return { value, unit };
}
