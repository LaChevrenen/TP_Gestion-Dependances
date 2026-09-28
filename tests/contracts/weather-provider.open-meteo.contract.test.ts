import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import type { AppConfig } from "../../src/config/Config.js";
import { FetchHttpClient } from "../../src/infrastructure/http/FetchHttpClient.js";
import { OpenMeteoWeatherProvider } from "../../src/infrastructure/weather/OpenMeteoWeatherProvider.js";
import {
  runWeatherProviderContract,
  type WeatherProviderContractFixtures,
} from "./weather-provider.contract.js";

const BASE_URL = "https://open-meteo.contract-test";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const config: AppConfig = {
  port: 3000,
  nominatimBaseUrl: "https://nominatim.unused",
  openMeteoBaseUrl: BASE_URL,
  nominatimUserAgent: "unused",
  httpTimeoutMs: 2000,
  openMeteoTimezone: "auto",
  openMeteoUserAgent: "tp-gestion-dependances-contract-tests/1.0",
  banBaseUrl: "https://ban.unused",
  metNorwayBaseUrl: "https://met-norway.unused",
  geocoderProvider: "nominatim",
  weatherProvider: "open-meteo",
};

let lastUserAgent: string | null | undefined;

const fixtures: WeatherProviderContractFixtures = {
  mockValidForecast() {
    server.use(
      http.get(`${BASE_URL}/v1/forecast`, ({ request }) => {
        lastUserAgent = request.headers.get("User-Agent");
        return HttpResponse.json({
          timezone: "Europe/Paris",
          hourly: { time: [1704067200], temperature_2m: [5.2], shortwave_radiation: [94] },
          hourly_units: { temperature_2m: "°C", shortwave_radiation: "W/m²" },
        });
      })
    );
  },
  mockEmpty() {
    server.use(
      http.get(`${BASE_URL}/v1/forecast`, ({ request }) => {
        lastUserAgent = request.headers.get("User-Agent");
        return HttpResponse.json({
          timezone: "Europe/Paris",
          hourly: { time: [], temperature_2m: [], shortwave_radiation: [] },
          hourly_units: { temperature_2m: "°C", shortwave_radiation: "W/m²" },
        });
      })
    );
  },
  mockMalformed() {
    server.use(http.get(`${BASE_URL}/v1/forecast`, () => HttpResponse.json({ unexpected: true })));
  },
  mockHttpError() {
    // 5xx generique : cas d'erreur representatif pour Open-Meteo.
    server.use(http.get(`${BASE_URL}/v1/forecast`, () => new HttpResponse(null, { status: 500 })));
  },
  getSentUserAgent: () => lastUserAgent,
};

runWeatherProviderContract(
  "Open-Meteo",
  () => new OpenMeteoWeatherProvider(new FetchHttpClient(), config),
  fixtures
);
