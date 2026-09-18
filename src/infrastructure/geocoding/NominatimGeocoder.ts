import { inject, injectable } from "inversify";
import { TYPES } from "../../types.js";
import type { Coordinates } from "../../domain/Coordinates.js";
import { AddressNotFoundError } from "../../domain/errors/AddressNotFoundError.js";
import { ProviderUnavailableError } from "../../domain/errors/ProviderUnavailableError.js";
import type { Geocoder } from "../../domain/ports/Geocoder.js";
import type { AppConfig } from "../../config/Config.js";
import type { HttpClient } from "../http/HttpClient.js";
import type { NominatimResponse } from "./NominatimTypes.js";

const PROVIDER_NAME = "nominatim";

@injectable()
export class NominatimGeocoder implements Geocoder {
  constructor(
    @inject(TYPES.HttpClient) private readonly httpClient: HttpClient,
    @inject(TYPES.Config) private readonly config: AppConfig
  ) {}

  async geocode(address: string): Promise<Coordinates> {
    const url = `${this.config.nominatimBaseUrl}/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

    let results: NominatimResponse;
    try {
      results = await this.httpClient.getJson<NominatimResponse>(url, {
        headers: { "User-Agent": this.config.nominatimUserAgent },
        timeoutMs: this.config.httpTimeoutMs,
      });
    } catch (err) {
      throw new ProviderUnavailableError(PROVIDER_NAME, err);
    }

    if (!Array.isArray(results) || results.length === 0) {
      throw new AddressNotFoundError(address);
    }

    const [first] = results;
    const latitude = Number(first?.lat);
    const longitude = Number(first?.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new ProviderUnavailableError(
        PROVIDER_NAME,
        new Error("Malformed Nominatim response: missing or invalid lat/lon")
      );
    }

    return { latitude, longitude };
  }
}
