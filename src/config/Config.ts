export interface AppConfig {
  readonly port: number;
  readonly nominatimBaseUrl: string;
  readonly openMeteoBaseUrl: string;
  readonly nominatimUserAgent: string;
  readonly httpTimeoutMs: number;
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
  };
}
