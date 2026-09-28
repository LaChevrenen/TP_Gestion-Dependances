import "reflect-metadata";
import { Container } from "inversify";
import type { interfaces } from "inversify";
import { TYPES } from "./types.js";
import { ForecastService } from "./application/ForecastService.js";
import type { AppConfig, GeocoderProviderName, WeatherProviderName } from "./config/Config.js";
import { loadConfig } from "./config/Config.js";
import type { Coordinates } from "./domain/Coordinates.js";
import type { Geocoder } from "./domain/ports/Geocoder.js";
import type { WeatherProvider } from "./domain/ports/WeatherProvider.js";
import type { Cache } from "./infrastructure/cache/Cache.js";
import { CachingGeocoder } from "./infrastructure/cache/CachingGeocoder.js";
import { InMemoryCache } from "./infrastructure/cache/InMemoryCache.js";
import { BanGeocoder } from "./infrastructure/geocoding/BanGeocoder.js";
import { NominatimGeocoder } from "./infrastructure/geocoding/NominatimGeocoder.js";
import type { HttpClient } from "./infrastructure/http/HttpClient.js";
import { FetchHttpClient } from "./infrastructure/http/FetchHttpClient.js";
import { MetNorwayWeatherProvider } from "./infrastructure/weather/MetNorwayWeatherProvider.js";
import { OpenMeteoWeatherProvider } from "./infrastructure/weather/OpenMeteoWeatherProvider.js";
import { DemoGeocoder } from "./infrastructure/demo/DemoGeocoder.js";
import { DemoWeatherProvider } from "./infrastructure/demo/DemoWeatherProvider.js";
import { DemoAwareForecastController } from "./presentation/DemoAwareForecastController.js";
import { ForecastController } from "./presentation/ForecastController.js";
import type { ForecastHandler } from "./presentation/ForecastHandler.js";

const geocoderImplementations: Record<GeocoderProviderName, interfaces.Newable<Geocoder>> = {
  nominatim: NominatimGeocoder,
  ban: BanGeocoder,
};

const weatherProviderImplementations: Record<WeatherProviderName, interfaces.Newable<WeatherProvider>> = {
  "open-meteo": OpenMeteoWeatherProvider,
  "met-norway": MetNorwayWeatherProvider,
};

export function buildContainer(): Container {
  const container = new Container({ defaultScope: "Singleton" });
  const config = loadConfig();

  container.bind<AppConfig>(TYPES.Config).toConstantValue(config);
  container.bind<HttpClient>(TYPES.HttpClient).to(FetchHttpClient);
  container
    .bind<Geocoder>(TYPES.GeocoderDelegate)
    .to(geocoderImplementations[config.geocoderProvider]);
  container.bind<Cache<Coordinates>>(TYPES.GeocodeCache).toConstantValue(
    new InMemoryCache<Coordinates>({
      ttlMs: config.geocodeCacheTtlMs,
      maxEntries: config.geocodeCacheMaxEntries,
      now: Date.now,
    })
  );
  container.bind<Geocoder>(TYPES.Geocoder).to(CachingGeocoder);
  container
    .bind<WeatherProvider>(TYPES.WeatherProvider)
    .to(weatherProviderImplementations[config.weatherProvider]);
  container.bind<ForecastService>(TYPES.ForecastService).to(ForecastService);
  container.bind<ForecastHandler>(TYPES.LiveForecastController).to(ForecastController);
  // Graphe "demo" : sans HttpClient, il ne peut structurellement pas appeler le reseau.
  container
    .bind<ForecastHandler>(TYPES.DemoForecastController)
    .toConstantValue(
      new ForecastController(new ForecastService(new DemoGeocoder(), new DemoWeatherProvider()))
    );
  container.bind<ForecastHandler>(TYPES.ForecastController).to(DemoAwareForecastController);

  return container;
}
