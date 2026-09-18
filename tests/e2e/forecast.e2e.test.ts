import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { buildContainer } from "../../src/container.js";
import { createApp } from "../../src/presentation/createApp.js";
import { TYPES } from "../../src/types.js";
import { ForecastController } from "../../src/presentation/ForecastController.js";

const NOMINATIM_BASE_URL = "https://nominatim.e2e-test";
const OPEN_METEO_BASE_URL = "https://open-meteo.e2e-test";
const BAN_BASE_URL = "https://ban.e2e-test";
const MET_NORWAY_BASE_URL = "https://met-norway.e2e-test";

const server = setupServer();
const mockedHostnames = new Set([
  new URL(NOMINATIM_BASE_URL).hostname,
  new URL(OPEN_METEO_BASE_URL).hostname,
  new URL(BAN_BASE_URL).hostname,
  new URL(MET_NORWAY_BASE_URL).hostname,
]);

beforeAll(() =>
  server.listen({
    onUnhandledRequest(request, print) {
      // Ne fait echouer le test que si une requete vers une API externe mockee
      // n'a pas ete interceptee. Les appels locaux de supertest vers le serveur
      // Express ephemere sont laisses passer normalement.
      if (mockedHostnames.has(new URL(request.url).hostname)) {
        print.error();
      }
    },
  })
);
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let app: Express;
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.NOMINATIM_BASE_URL = NOMINATIM_BASE_URL;
  process.env.OPEN_METEO_BASE_URL = OPEN_METEO_BASE_URL;

  const container = buildContainer();
  const controller = container.get<ForecastController>(TYPES.ForecastController);
  app = createApp(controller);

  process.env = { ...originalEnv };
});

function buildTestApp(envOverrides: Record<string, string>): Express {
  Object.assign(process.env, envOverrides);
  const container = buildContainer();
  const controller = container.get<ForecastController>(TYPES.ForecastController);
  const testApp = createApp(controller);
  process.env = { ...originalEnv };
  return testApp;
}

function mockNominatimSuccess(): void {
  server.use(
    http.get(`${NOMINATIM_BASE_URL}/search`, () =>
      HttpResponse.json([{ lat: "44.1279", lon: "4.0817" }])
    )
  );
}

function mockOpenMeteoSuccess(): void {
  server.use(
    http.get(`${OPEN_METEO_BASE_URL}/v1/forecast`, () =>
      HttpResponse.json({
        timezone: "Europe/Paris",
        hourly: {
          time: ["2024-01-01T00:00"],
          shortwave_radiation: [0],
        },
        hourly_units: {
          time: "iso8601",
          shortwave_radiation: "W/m²",
        },
      })
    )
  );
}

describe("GET /forecast (e2e)", () => {
  it("200 - renvoie la prevision pour une adresse valide", async () => {
    mockNominatimSuccess();
    mockOpenMeteoSuccess();

    const response = await request(app).get("/forecast").query({ address: "Ales" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      address: "Ales",
      latitude: 44.1279,
      longitude: 4.0817,
      timezone: "Europe/Paris",
      hourly: [{ time: "2024-01-01T00:00", shortwaveRadiation: { value: 0, unit: "W/m²" } }],
    });
  });

  it("200 - fonctionne avec GEOCODER_PROVIDER=ban et WEATHER_PROVIDER=met-norway", async () => {
    let capturedMetNorwayUserAgent: string | null = null;

    server.use(
      http.get(`${BAN_BASE_URL}/search/`, () =>
        HttpResponse.json({
          features: [{ geometry: { coordinates: [4.0817, 44.1279] } }],
        })
      )
    );
    server.use(
      http.get(`${MET_NORWAY_BASE_URL}/weatherapi/locationforecast/2.0/compact`, ({ request }) => {
        capturedMetNorwayUserAgent = request.headers.get("User-Agent");
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

    const testApp = buildTestApp({
      GEOCODER_PROVIDER: "ban",
      WEATHER_PROVIDER: "met-norway",
      BAN_BASE_URL,
      MET_NORWAY_BASE_URL,
      MET_NORWAY_USER_AGENT: "TP2-MeteoApi/1.0 e2e@example.com",
    });

    const response = await request(testApp).get("/forecast").query({ address: "Ales" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      address: "Ales",
      latitude: 44.1279,
      longitude: 4.0817,
      timezone: "UTC",
      hourly: [
        {
          time: "2024-01-01T00:00:00Z",
          temperature: { value: 5.2, unit: "celsius" },
          windSpeed: { value: 3.1, unit: "m/s" },
        },
      ],
    });
    expect(capturedMetNorwayUserAgent).toBe("TP2-MeteoApi/1.0 e2e@example.com");
  });

  it("400 - address absente", async () => {
    const response = await request(app).get("/forecast");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("400 - address vide", async () => {
    const response = await request(app).get("/forecast").query({ address: "   " });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("404 - adresse introuvable", async () => {
    server.use(http.get(`${NOMINATIM_BASE_URL}/search`, () => HttpResponse.json([])));

    const response = await request(app).get("/forecast").query({ address: "Nulle part" });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error");
  });

  it("502 - Nominatim en erreur", async () => {
    server.use(
      http.get(`${NOMINATIM_BASE_URL}/search`, () => new HttpResponse(null, { status: 503 }))
    );

    const response = await request(app).get("/forecast").query({ address: "Ales" });

    expect(response.status).toBe(502);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).not.toMatch(/at .*\(.*:\d+:\d+\)/);
  });

  it("502 - Open-Meteo en erreur apres un geocodage reussi", async () => {
    mockNominatimSuccess();
    server.use(
      http.get(`${OPEN_METEO_BASE_URL}/v1/forecast`, () => new HttpResponse(null, { status: 500 }))
    );

    const response = await request(app).get("/forecast").query({ address: "Ales" });

    expect(response.status).toBe(502);
    expect(response.body).toHaveProperty("error");
  });
});
