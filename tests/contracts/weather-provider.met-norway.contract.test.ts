import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import type { AppConfig } from "../../src/config/Config.js";
import { FetchHttpClient } from "../../src/infrastructure/http/FetchHttpClient.js";
import { MetNorwayWeatherProvider } from "../../src/infrastructure/weather/MetNorwayWeatherProvider.js";
import {
  runWeatherProviderContract,
  type WeatherProviderContractFixtures,
} from "./weather-provider.contract.js";

const BASE_URL = "https://met-norway.contract-test";
const PATH = "/weatherapi/locationforecast/2.0/compact";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const config: AppConfig = {
  port: 3000,
  nominatimBaseUrl: "https://nominatim.unused",
  openMeteoBaseUrl: "https://open-meteo.unused",
  nominatimUserAgent: "unused",
  httpTimeoutMs: 2000,
  openMeteoTimezone: "auto",
  openMeteoUserAgent: "unused",
  banBaseUrl: "https://ban.unused",
  metNorwayBaseUrl: BASE_URL,
  metNorwayUserAgent: "TP2-MeteoApi/1.0 contract-tests@example.com",
  geocoderProvider: "nominatim",
  weatherProvider: "met-norway",
};

let lastUserAgent: string | null | undefined;

const fixtures: WeatherProviderContractFixtures = {
  mockValidForecast() {
    server.use(
      http.get(`${BASE_URL}${PATH}`, ({ request }) => {
        lastUserAgent = request.headers.get("User-Agent");
        return HttpResponse.json({
          properties: {
            meta: { units: { air_temperature: "celsius", wind_speed: "m/s" } },
            timeseries: [
              {
                time: "2024-01-01T00:00:00Z",
                data: { instant: { details: { air_temperature: 5.2, wind_speed: 3.1 } } },
              },
            ],
          },
        });
      })
    );
  },
  mockEmpty() {
    server.use(
      http.get(`${BASE_URL}${PATH}`, ({ request }) => {
        lastUserAgent = request.headers.get("User-Agent");
        return HttpResponse.json({
          properties: { meta: { units: {} }, timeseries: [] },
        });
      })
    );
  },
  mockMalformed() {
    server.use(http.get(`${BASE_URL}${PATH}`, () => HttpResponse.json({ properties: {} })));
  },
  mockHttpError() {
    // 403 : cas d'erreur emblematique de MET Norway (User-Agent generique rejete).
    server.use(http.get(`${BASE_URL}${PATH}`, () => new HttpResponse(null, { status: 403 })));
  },
  getSentUserAgent: () => lastUserAgent,
};

runWeatherProviderContract(
  "MET Norway",
  () => new MetNorwayWeatherProvider(new FetchHttpClient(), config),
  fixtures
);
