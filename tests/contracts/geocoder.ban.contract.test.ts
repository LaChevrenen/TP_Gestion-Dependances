import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { AppConfig } from "../../src/config/Config.js";
import type { Coordinates } from "../../src/domain/Coordinates.js";
import { AddressNotFoundError } from "../../src/domain/errors/AddressNotFoundError.js";
import { BanGeocoder } from "../../src/infrastructure/geocoding/BanGeocoder.js";
import { FetchHttpClient } from "../../src/infrastructure/http/FetchHttpClient.js";
import { runGeocoderContract, type GeocoderContractFixtures } from "./geocoder.contract.js";

const BASE_URL = "https://ban.contract-test";
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
  banBaseUrl: BASE_URL,
  metNorwayBaseUrl: "https://met-norway.unused",
  geocoderProvider: "ban",
  weatherProvider: "open-meteo",
  geocodeCacheTtlMs: 60_000,
  geocodeCacheMaxEntries: 100,
};

function buildGeocoder(): BanGeocoder {
  return new BanGeocoder(new FetchHttpClient(), config);
}

let lastSentQuery: string | undefined;

function handler(coordinates: Coordinates | undefined) {
  return http.get(`${BASE_URL}/search/`, ({ request }) => {
    lastSentQuery = new URL(request.url).searchParams.get("q") ?? undefined;
    if (!coordinates) {
      return HttpResponse.json({ features: [] });
    }
    // GeoJSON : ordre [longitude, latitude], inverse du domaine.
    return HttpResponse.json({
      features: [{ geometry: { coordinates: [coordinates.longitude, coordinates.latitude] } }],
    });
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

runGeocoderContract("BAN", buildGeocoder, fixtures);

describe("BanGeocoder — cas specifique (hors contrat commun)", () => {
  it("requete de moins de 3 caracteres (400 BAN) -> AddressNotFoundError", async () => {
    // La BAN est la SEULE des deux implementations de Geocoder a repondre 400 pour
    // une requete trop courte (Nominatim ne connait pas cette contrainte). Ce n'est
    // donc pas un scenario partage par toutes les implementations du port -> il ne
    // peut pas vivre dans runGeocoderContract, qui ne doit tester que ce qui est
    // vrai pour n'importe quel Geocoder. Choix documente dans le README (section ADR).
    server.use(http.get(`${BASE_URL}/search/`, () => new HttpResponse(null, { status: 400 })));

    await expect(buildGeocoder().geocode("Al")).rejects.toBeInstanceOf(AddressNotFoundError);
  });
});
