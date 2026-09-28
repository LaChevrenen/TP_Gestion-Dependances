import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { AppConfig } from "../../../src/config/Config.js";
import { ProviderUnavailableError } from "../../../src/domain/errors/ProviderUnavailableError.js";
import { FetchHttpClient } from "../../../src/infrastructure/http/FetchHttpClient.js";
import { OpenMeteoWeatherProvider } from "../../../src/infrastructure/weather/OpenMeteoWeatherProvider.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const URL_FORECAST = "https://open-meteo.test/v1/forecast";
const COORDS = { latitude: 44.13, longitude: 4.08 };

const config: AppConfig = {
  port: 3000,
  nominatimBaseUrl: "https://nominatim.test",
  openMeteoBaseUrl: "https://open-meteo.test",
  nominatimUserAgent: "tp-gestion-dependances-tests/1.0",
  httpTimeoutMs: 2000,
  openMeteoTimezone: "auto",
  openMeteoUserAgent: "tp-gestion-dependances-tests/1.0",
  banBaseUrl: "https://ban.test",
  metNorwayBaseUrl: "https://met-norway.test",
  geocoderProvider: "nominatim",
  weatherProvider: "open-meteo",
};

function buildProvider(overrides: Partial<AppConfig> = {}): OpenMeteoWeatherProvider {
  return new OpenMeteoWeatherProvider(new FetchHttpClient(), { ...config, ...overrides });
}

// 1704067200 = 2024-01-01T00:00:00Z
function body(hourly: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timezone: "Europe/Paris",
    hourly: {
      time: [1704067200, 1704070800],
      temperature_2m: [5.2, 4.8],
      shortwave_radiation: [0, 12.5],
      ...hourly,
    },
    hourly_units: { temperature_2m: "°C", shortwave_radiation: "W/m²" },
  };
}

function mockJson(json: unknown): void {
  server.use(http.get(URL_FORECAST, () => HttpResponse.json(json as Record<string, unknown>)));
}

describe("OpenMeteoWeatherProvider", () => {
  it("envoie les query params et le User-Agent, et mappe le JSON (heures UTC, unites lues)", async () => {
    let capturedUrl: URL | undefined;
    let capturedUserAgent: string | null = null;
    server.use(
      http.get(URL_FORECAST, ({ request }) => {
        capturedUrl = new URL(request.url);
        capturedUserAgent = request.headers.get("User-Agent");
        return HttpResponse.json(body());
      })
    );

    const weather = await buildProvider().getHourlyForecast(COORDS);

    expect(weather).toEqual({
      timezone: "Europe/Paris",
      hourly: [
        {
          time: "2024-01-01T00:00:00Z",
          temperature: { value: 5.2, unit: "°C" },
          shortwaveRadiation: { value: 0, unit: "W/m²" },
        },
        {
          time: "2024-01-01T01:00:00Z",
          temperature: { value: 4.8, unit: "°C" },
          shortwaveRadiation: { value: 12.5, unit: "W/m²" },
        },
      ],
    });
    expect(capturedUrl?.searchParams.get("latitude")).toBe("44.13");
    expect(capturedUrl?.searchParams.get("longitude")).toBe("4.08");
    expect(capturedUrl?.searchParams.get("hourly")).toBe("temperature_2m,shortwave_radiation");
    expect(capturedUrl?.searchParams.get("timeformat")).toBe("unixtime");
    expect(capturedUrl?.searchParams.get("timezone")).toBe("auto");
    expect(capturedUserAgent).toBe("tp-gestion-dependances-tests/1.0");
  });

  it("envoie le fuseau horaire configure dans la query string", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get(URL_FORECAST, ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(body());
      })
    );

    await buildProvider({ openMeteoTimezone: "Europe/Paris" }).getHourlyForecast(COORDS);

    expect(capturedUrl?.searchParams.get("timezone")).toBe("Europe/Paris");
  });

  it("omet une mesure quand Open-Meteo renvoie null pour cette heure", async () => {
    mockJson(body({ temperature_2m: [null, 4.8] }));

    const weather = await buildProvider().getHourlyForecast(COORDS);

    expect(weather.hourly[0]).not.toHaveProperty("temperature");
    expect(weather.hourly[1]?.temperature).toEqual({ value: 4.8, unit: "°C" });
  });

  it.each([
    ["hourly manquant", {}],
    ["timezone et hourly_units manquants", { hourly: body().hourly }],
    ["hourly.time vide", body({ time: [], temperature_2m: [], shortwave_radiation: [] })],
    ["longueurs differentes", body({ temperature_2m: [5.2] })],
    ["temperature_2m absent", body({ temperature_2m: undefined })],
  ])("leve ProviderUnavailableError sur une reponse malformee : %s", async (_label, json) => {
    mockJson(json);

    await expect(buildProvider().getHourlyForecast(COORDS)).rejects.toBeInstanceOf(
      ProviderUnavailableError
    );
  });

  it("leve ProviderUnavailableError quand Open-Meteo repond en erreur", async () => {
    server.use(http.get(URL_FORECAST, () => new HttpResponse(null, { status: 500 })));

    await expect(buildProvider().getHourlyForecast(COORDS)).rejects.toBeInstanceOf(
      ProviderUnavailableError
    );
  });
});
