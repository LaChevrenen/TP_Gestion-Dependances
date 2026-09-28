import { ConfigurationError } from "./ConfigurationError.js";

export type GeocoderProviderName = "nominatim" | "ban";
export type WeatherProviderName = "open-meteo" | "met-norway";

export interface AppConfig {
  readonly port: number;
  readonly nominatimBaseUrl: string;
  readonly openMeteoBaseUrl: string;
  readonly nominatimUserAgent: string;
  readonly httpTimeoutMs: number;
  readonly openMeteoTimezone: string;
  readonly openMeteoUserAgent: string;
  readonly banBaseUrl: string;
  readonly metNorwayBaseUrl: string;
  readonly metNorwayUserAgent?: string;
  readonly geocoderProvider: GeocoderProviderName;
  readonly weatherProvider: WeatherProviderName;
  readonly geocodeCacheTtlMs: number;
  readonly geocodeCacheMaxEntries: number;
}

const GEOCODER_PROVIDERS: readonly GeocoderProviderName[] = ["nominatim", "ban"];
const WEATHER_PROVIDERS: readonly WeatherProviderName[] = ["open-meteo", "met-norway"];

function parseGeocoderProvider(raw: string | undefined): GeocoderProviderName {
  const value = raw ?? "nominatim";
  if (!GEOCODER_PROVIDERS.includes(value as GeocoderProviderName)) {
    throw new ConfigurationError(
      `Invalid GEOCODER_PROVIDER "${value}". Accepted values: ${GEOCODER_PROVIDERS.join(", ")}.`
    );
  }
  return value as GeocoderProviderName;
}

function parseWeatherProvider(raw: string | undefined): WeatherProviderName {
  const value = raw ?? "open-meteo";
  if (!WEATHER_PROVIDERS.includes(value as WeatherProviderName)) {
    throw new ConfigurationError(
      `Invalid WEATHER_PROVIDER "${value}". Accepted values: ${WEATHER_PROVIDERS.join(", ")}.`
    );
  }
  return value as WeatherProviderName;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const weatherProvider = parseWeatherProvider(env.WEATHER_PROVIDER);

  if (weatherProvider === "met-norway" && !env.MET_NORWAY_USER_AGENT) {
    throw new ConfigurationError(
      "MET_NORWAY_USER_AGENT is required when WEATHER_PROVIDER=met-norway " +
        "(MET Norway rejects requests with a generic library User-Agent)."
    );
  }

  return {
    port: Number(env.PORT ?? 3000),
    nominatimBaseUrl: env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org",
    openMeteoBaseUrl: env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com",
    nominatimUserAgent:
      env.NOMINATIM_USER_AGENT ??
      "tp-gestion-dependances/1.0 (contact: julien.andrade24@gmail.com)",
    httpTimeoutMs: Number(env.HTTP_TIMEOUT_MS ?? 5000),
    openMeteoTimezone: env.OPEN_METEO_TIMEZONE ?? "auto",
    openMeteoUserAgent:
      env.OPEN_METEO_USER_AGENT ??
      "tp-gestion-dependances/1.0 (contact: julien.andrade24@gmail.com)",
    banBaseUrl: env.BAN_BASE_URL ?? "https://api-adresse.data.gouv.fr",
    metNorwayBaseUrl: env.MET_NORWAY_BASE_URL ?? "https://api.met.no",
    // Pas de valeur par defaut generique ici : un User-Agent de lib fait 403 chez MET Norway.
    ...(env.MET_NORWAY_USER_AGENT ? { metNorwayUserAgent: env.MET_NORWAY_USER_AGENT } : {}),
    geocoderProvider: parseGeocoderProvider(env.GEOCODER_PROVIDER),
    weatherProvider,
    geocodeCacheTtlMs: Number(env.GEOCODE_CACHE_TTL_MS ?? 3_600_000),
    geocodeCacheMaxEntries: Number(env.GEOCODE_CACHE_MAX_ENTRIES ?? 1000),
  };
}
