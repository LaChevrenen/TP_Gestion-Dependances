import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { AppConfig } from "../../../src/config/Config.js";
import { AddressNotFoundError } from "../../../src/domain/errors/AddressNotFoundError.js";
import { ProviderUnavailableError } from "../../../src/domain/errors/ProviderUnavailableError.js";
import { FetchHttpClient } from "../../../src/infrastructure/http/FetchHttpClient.js";
import { NominatimGeocoder } from "../../../src/infrastructure/geocoding/NominatimGeocoder.js";

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
  openMeteoUserAgent: "tp-gestion-dependances-tests/1.0",
  banBaseUrl: "https://ban.test",
  metNorwayBaseUrl: "https://met-norway.test",
};

function buildGeocoder(): NominatimGeocoder {
  return new NominatimGeocoder(new FetchHttpClient(), config);
}

describe("NominatimGeocoder", () => {
  it("envoie l'URL, les query params et le User-Agent attendus, et mappe le JSON en Coordinates", async () => {
    let capturedUrl: URL | undefined;
    let capturedUserAgent: string | null = null;

    server.use(
      http.get("https://nominatim.test/search", ({ request }) => {
        capturedUrl = new URL(request.url);
        capturedUserAgent = request.headers.get("User-Agent");
        return HttpResponse.json([{ lat: "44.1279", lon: "4.0817" }]);
      })
    );

    const coordinates = await buildGeocoder().geocode("Ales");

    expect(coordinates).toEqual({ latitude: 44.1279, longitude: 4.0817 });
    expect(capturedUrl?.searchParams.get("q")).toBe("Ales");
    expect(capturedUrl?.searchParams.get("format")).toBe("json");
    expect(capturedUrl?.searchParams.get("limit")).toBe("1");
    expect(capturedUserAgent).toBe("tp-gestion-dependances-tests/1.0");
  });

  it("encode correctement une adresse contenant des caracteres speciaux", async () => {
    let capturedQuery: string | null = null;

    server.use(
      http.get("https://nominatim.test/search", ({ request }) => {
        capturedQuery = new URL(request.url).searchParams.get("q");
        return HttpResponse.json([{ lat: "44.13", lon: "4.08" }]);
      })
    );

    await buildGeocoder().geocode("Alès, France");

    expect(capturedQuery).toBe("Alès, France");
  });

  it("leve AddressNotFoundError quand Nominatim renvoie un tableau vide", async () => {
    server.use(http.get("https://nominatim.test/search", () => HttpResponse.json([])));

    await expect(buildGeocoder().geocode("Nulle part")).rejects.toBeInstanceOf(AddressNotFoundError);
  });

  it("leve ProviderUnavailableError sur une reponse malformee (lat/lon absents)", async () => {
    server.use(http.get("https://nominatim.test/search", () => HttpResponse.json([{}])));

    await expect(buildGeocoder().geocode("Ales")).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("leve ProviderUnavailableError quand Nominatim repond en erreur", async () => {
    server.use(
      http.get("https://nominatim.test/search", () => new HttpResponse(null, { status: 503 }))
    );

    await expect(buildGeocoder().geocode("Ales")).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});
