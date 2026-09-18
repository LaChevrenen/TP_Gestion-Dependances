export interface AppConfig {
  readonly port: number;
  readonly nominatimBaseUrl: string;
  readonly openMeteoBaseUrl: string;
  readonly nominatimUserAgent: string;
  readonly httpTimeoutMs: number;
  readonly openMeteoTimezone: string;
  readonly banBaseUrl: string;
  readonly metNorwayBaseUrl: string;
  readonly metNorwayUserAgent?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3000),
    nominatimBaseUrl: env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org",
    openMeteoBaseUrl: env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com",
    nominatimUserAgent:
      env.NOMINATIM_USER_AGENT ??
      "tp-gestion-dependances/1.0 (contact: julien.andrade24@gmail.com)",
    httpTimeoutMs: Number(env.HTTP_TIMEOUT_MS ?? 5000),
    openMeteoTimezone: env.OPEN_METEO_TIMEZONE ?? "auto",
    banBaseUrl: env.BAN_BASE_URL ?? "https://api-adresse.data.gouv.fr",
    metNorwayBaseUrl: env.MET_NORWAY_BASE_URL ?? "https://api.met.no",
    // Pas de valeur par defaut generique ici : un User-Agent de lib fait 403 chez MET Norway.
    ...(env.MET_NORWAY_USER_AGENT ? { metNorwayUserAgent: env.MET_NORWAY_USER_AGENT } : {}),
  };
}
