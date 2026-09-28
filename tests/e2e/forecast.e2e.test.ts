import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { buildContainer } from "../../src/container.js";
import { createApp } from "../../src/presentation/createApp.js";
import { TYPES } from "../../src/types.js";
import type { ForecastHandler } from "../../src/presentation/ForecastHandler.js";

const NOMINATIM_BASE_URL = "https://nominatim.e2e-test";
const OPEN_METEO_BASE_URL = "https://open-meteo.e2e-test";
const BAN_BASE_URL = "https://ban.e2e-test";
const MET_NORWAY_BASE_URL = "https://met-norway.e2e-test";
const MET_NORWAY_USER_AGENT = "TP2-MeteoApi/1.0 e2e@example.com";

const server = setupServer();
const mockedHostnames = new Set(
  [NOMINATIM_BASE_URL, OPEN_METEO_BASE_URL, BAN_BASE_URL, MET_NORWAY_BASE_URL].map(
    (url) => new URL(url).hostname
  )
);

// Nombre d'appels reellement recus par chaque API externe simulee.
const hits = { nominatim: 0, openMeteo: 0, ban: 0, metNorway: 0 };
let metNorwayUserAgent: string | null = null;

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
afterEach(() => {
  server.resetHandlers();
  Object.assign(hits, { nominatim: 0, openMeteo: 0, ban: 0, metNorway: 0 });
  metNorwayUserAgent = null;
});
afterAll(() => server.close());

const originalEnv = { ...process.env };

function buildTestApp(envOverrides: Record<string, string> = {}): Express {
  Object.assign(process.env, {
    NOMINATIM_BASE_URL,
    OPEN_METEO_BASE_URL,
    BAN_BASE_URL,
    MET_NORWAY_BASE_URL,
    ...envOverrides,
  });
  const container = buildContainer();
  const controller = container.get<ForecastHandler>(TYPES.ForecastController);
  const testApp = createApp(controller);
  process.env = { ...originalEnv };
  return testApp;
}

let app: Express;
beforeEach(() => {
  app = buildTestApp();
});

function mockNominatimSuccess(): void {
  server.use(
    http.get(`${NOMINATIM_BASE_URL}/search`, () => {
      hits.nominatim += 1;
      return HttpResponse.json([{ lat: "44.1279", lon: "4.0817" }]);
    })
  );
}

function mockBanSuccess(): void {
  server.use(
    http.get(`${BAN_BASE_URL}/search/`, () => {
      hits.ban += 1;
      return HttpResponse.json({ features: [{ geometry: { coordinates: [4.0817, 44.1279] } }] });
    })
  );
}

function mockOpenMeteoSuccess(): void {
  server.use(
    http.get(`${OPEN_METEO_BASE_URL}/v1/forecast`, () => {
      hits.openMeteo += 1;
      return HttpResponse.json({
        timezone: "Europe/Paris",
        hourly: { time: [1704067200], temperature_2m: [5.2], shortwave_radiation: [0] },
        hourly_units: { temperature_2m: "°C", shortwave_radiation: "W/m²" },
      });
    })
  );
}

function mockMetNorwaySuccess(): void {
  server.use(
    http.get(`${MET_NORWAY_BASE_URL}/weatherapi/locationforecast/2.0/compact`, ({ request }) => {
      hits.metNorway += 1;
      metNorwayUserAgent = request.headers.get("User-Agent");
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
}

const EXPECTED_BODY = {
  address: "Ales",
  latitude: 44.1279,
  longitude: 4.0817,
  hourly: [{ time: "2024-01-01T00:00:00Z", temperatureCelsius: 5.2 }],
};

describe("GET /forecast (e2e)", () => {
  it("200 - renvoie la prevision pour une adresse valide", async () => {
    mockNominatimSuccess();
    mockOpenMeteoSuccess();

    const response = await request(app).get("/forecast").query({ address: "Ales" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(EXPECTED_BODY);
  });

  it("200 - fonctionne avec GEOCODER_PROVIDER=ban et WEATHER_PROVIDER=met-norway", async () => {
    mockBanSuccess();
    mockMetNorwaySuccess();
    const testApp = buildTestApp({
      GEOCODER_PROVIDER: "ban",
      WEATHER_PROVIDER: "met-norway",
      MET_NORWAY_USER_AGENT,
    });

    const response = await request(testApp).get("/forecast").query({ address: "Ales" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(EXPECTED_BODY);
    expect(metNorwayUserAgent).toBe(MET_NORWAY_USER_AGENT);
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

describe("Format de sortie unifie (TP3)", () => {
  const mockGeocoder = { nominatim: mockNominatimSuccess, ban: mockBanSuccess };
  const mockWeather = { "open-meteo": mockOpenMeteoSuccess, "met-norway": mockMetNorwaySuccess };

  it.each([
    ["nominatim", "open-meteo"],
    ["nominatim", "met-norway"],
    ["ban", "open-meteo"],
    ["ban", "met-norway"],
  ] as const)("meme reponse avec GEOCODER=%s et WEATHER=%s", async (geocoder, weather) => {
    mockGeocoder[geocoder]();
    mockWeather[weather]();
    const testApp = buildTestApp({
      GEOCODER_PROVIDER: geocoder,
      WEATHER_PROVIDER: weather,
      MET_NORWAY_USER_AGENT,
    });

    const response = await request(testApp).get("/forecast").query({ address: "Ales" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(EXPECTED_BODY);
  });
});

describe("Mode demo (TP3)", () => {
  it("demo=true : reponse au format unifie, sans aucun appel aux services externes", async () => {
    // Aucun mock installe : un appel externe ferait echouer le test (onUnhandledRequest).
    const response = await request(app).get("/forecast").query({ address: "Ales", demo: "true" });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual(Object.keys(EXPECTED_BODY));
    expect(response.body.hourly.length).toBeGreaterThan(0);
    for (const point of response.body.hourly) {
      expect(Object.keys(point)).toEqual(["time", "temperatureCelsius"]);
      expect(point.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(typeof point.temperatureCelsius).toBe("number");
    }
    expect(hits).toEqual({ nominatim: 0, openMeteo: 0, ban: 0, metNorway: 0 });
  });

  it("demo=true : la validation de l'adresse reste appliquee (400)", async () => {
    const response = await request(app).get("/forecast").query({ address: " ", demo: "true" });

    expect(response.status).toBe(400);
  });

  it("demo=false : appelle bien les services reels", async () => {
    mockNominatimSuccess();
    mockOpenMeteoSuccess();

    const response = await request(app).get("/forecast").query({ address: "Ales", demo: "false" });

    expect(response.body).toEqual(EXPECTED_BODY);
    expect(hits).toMatchObject({ nominatim: 1, openMeteo: 1 });
  });
});
