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

const config: AppConfig = {
  port: 3000,
  nominatimBaseUrl: "https://nominatim.test",
  openMeteoBaseUrl: "https://open-meteo.test",
  nominatimUserAgent: "tp-gestion-dependances-tests/1.0",
  httpTimeoutMs: 2000,
  openMeteoTimezone: "auto",
};

function buildProvider(overrides: Partial<AppConfig> = {}): OpenMeteoWeatherProvider {
  return new OpenMeteoWeatherProvider(new FetchHttpClient(), { ...config, ...overrides });
}

describe("OpenMeteoWeatherProvider", () => {
  it("envoie les query params attendus et mappe le JSON en WeatherForecast", async () => {
    let capturedUrl: URL | undefined;

    server.use(
      http.get("https://open-meteo.test/v1/forecast", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          timezone: "Europe/Paris",
          hourly: {
            time: ["2024-01-01T00:00", "2024-01-01T01:00"],
            shortwave_radiation: [0, 12.5],
          },
          hourly_units: {
            time: "iso8601",
            shortwave_radiation: "W/m²",
          },
        });
      })
    );

    const weather = await buildProvider().getHourlyForecast({ latitude: 44.13, longitude: 4.08 });

    expect(weather).toEqual({
      timezone: "Europe/Paris",
      hourly: {
        time: ["2024-01-01T00:00", "2024-01-01T01:00"],
        shortwaveRadiation: [0, 12.5],
      },
      hourlyUnits: {
        time: "iso8601",
        shortwaveRadiation: "W/m²",
      },
    });
    expect(capturedUrl?.searchParams.get("latitude")).toBe("44.13");
    expect(capturedUrl?.searchParams.get("longitude")).toBe("4.08");
    expect(capturedUrl?.searchParams.get("hourly")).toBe("shortwave_radiation");
    expect(capturedUrl?.searchParams.get("timezone")).toBe("auto");
  });

  it("envoie le fuseau horaire configure dans la query string", async () => {
    let capturedUrl: URL | undefined;

    server.use(
      http.get("https://open-meteo.test/v1/forecast", ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          timezone: "Europe/Paris",
          hourly: { time: ["2024-01-01T00:00"], shortwave_radiation: [0] },
          hourly_units: { time: "iso8601", shortwave_radiation: "W/m²" },
        });
      })
    );

    await buildProvider({ openMeteoTimezone: "Europe/Paris" }).getHourlyForecast({
      latitude: 44.13,
      longitude: 4.08,
    });

    expect(capturedUrl?.searchParams.get("timezone")).toBe("Europe/Paris");
  });

  it("leve ProviderUnavailableError sur une reponse malformee (hourly manquant)", async () => {
    server.use(http.get("https://open-meteo.test/v1/forecast", () => HttpResponse.json({})));

    await expect(
      buildProvider().getHourlyForecast({ latitude: 44.13, longitude: 4.08 })
    ).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("leve ProviderUnavailableError sur une reponse malformee (timezone ou hourly_units manquants)", async () => {
    server.use(
      http.get("https://open-meteo.test/v1/forecast", () =>
        HttpResponse.json({
          hourly: {
            time: ["2024-01-01T00:00"],
            shortwave_radiation: [0],
          },
          // timezone et hourly_units absents
        })
      )
    );

    await expect(
      buildProvider().getHourlyForecast({ latitude: 44.13, longitude: 4.08 })
    ).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("leve ProviderUnavailableError quand Open-Meteo repond en erreur", async () => {
    server.use(
      http.get("https://open-meteo.test/v1/forecast", () => new HttpResponse(null, { status: 500 }))
    );

    await expect(
      buildProvider().getHourlyForecast({ latitude: 44.13, longitude: 4.08 })
    ).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});
