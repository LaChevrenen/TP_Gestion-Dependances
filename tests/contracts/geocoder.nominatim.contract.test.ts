import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import type { AppConfig } from "../../src/config/Config.js";
import type { Coordinates } from "../../src/domain/Coordinates.js";
import { NominatimGeocoder } from "../../src/infrastructure/geocoding/NominatimGeocoder.js";
import { FetchHttpClient } from "../../src/infrastructure/http/FetchHttpClient.js";
import { runGeocoderContract, type GeocoderContractFixtures } from "./geocoder.contract.js";

const BASE_URL = "https://nominatim.contract-test";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const config: AppConfig = {
  port: 3000,
  nominatimBaseUrl: BASE_URL,
  openMeteoBaseUrl: "https://open-meteo.unused",
  nominatimUserAgent: "tp-gestion-dependances-contract-tests/1.0",
  httpTimeoutMs: 2000,
  openMeteoTimezone: "auto",
  openMeteoUserAgent: "unused",
  banBaseUrl: "https://ban.unused",
  metNorwayBaseUrl: "https://met-norway.unused",
  geocoderProvider: "nominatim",
  weatherProvider: "open-meteo",
};

let lastSentQuery: string | undefined;

function handler(coordinates: Coordinates | undefined) {
  return http.get(`${BASE_URL}/search`, ({ request }) => {
    lastSentQuery = new URL(request.url).searchParams.get("q") ?? undefined;
    if (!coordinates) {
      return HttpResponse.json([]);
    }
    return HttpResponse.json([
      { lat: String(coordinates.latitude), lon: String(coordinates.longitude) },
    ]);
  });
}

const fixtures: GeocoderContractFixtures = {
  mockValidAddress(_address, coordinates) {
    server.use(handler(coordinates));
  },
  mockNotFound() {
    server.use(handler(undefined));
  },
  getSentQuery: () => lastSentQuery,
};

runGeocoderContract("Nominatim", () => new NominatimGeocoder(new FetchHttpClient(), config), fixtures);
