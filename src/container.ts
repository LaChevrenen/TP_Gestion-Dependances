import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./types.js";
import { ForecastService } from "./application/ForecastService.js";
import type { AppConfig } from "./config/Config.js";
import { loadConfig } from "./config/Config.js";
import type { Geocoder } from "./domain/ports/Geocoder.js";
import type { WeatherProvider } from "./domain/ports/WeatherProvider.js";
import { NominatimGeocoder } from "./infrastructure/geocoding/NominatimGeocoder.js";
import type { HttpClient } from "./infrastructure/http/HttpClient.js";
import { FetchHttpClient } from "./infrastructure/http/FetchHttpClient.js";
import { OpenMeteoWeatherProvider } from "./infrastructure/weather/OpenMeteoWeatherProvider.js";
import { ForecastController } from "./presentation/ForecastController.js";

export function buildContainer(): Container {
  const container = new Container({ defaultScope: "Singleton" });

  container.bind<AppConfig>(TYPES.Config).toConstantValue(loadConfig());
  container.bind<HttpClient>(TYPES.HttpClient).to(FetchHttpClient);
  container.bind<Geocoder>(TYPES.Geocoder).to(NominatimGeocoder);
  container.bind<WeatherProvider>(TYPES.WeatherProvider).to(OpenMeteoWeatherProvider);
  container.bind<ForecastService>(TYPES.ForecastService).to(ForecastService);
  container.bind<ForecastController>(TYPES.ForecastController).to(ForecastController);

  return container;
}
