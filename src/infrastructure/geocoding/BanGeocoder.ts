import { inject, injectable } from "inversify";
import { TYPES } from "../../types.js";
import type { Coordinates } from "../../domain/Coordinates.js";
import { AddressNotFoundError } from "../../domain/errors/AddressNotFoundError.js";
import { ProviderUnavailableError } from "../../domain/errors/ProviderUnavailableError.js";
import type { Geocoder } from "../../domain/ports/Geocoder.js";
import type { AppConfig } from "../../config/Config.js";
import type { HttpClient } from "../http/HttpClient.js";
import { HttpRequestError } from "../http/HttpRequestError.js";
import type { BanResponse } from "./BanTypes.js";

const PROVIDER_NAME = "ban";

@injectable()
export class BanGeocoder implements Geocoder {
  constructor(
    @inject(TYPES.HttpClient) private readonly httpClient: HttpClient,
    @inject(TYPES.Config) private readonly config: AppConfig
  ) {}

  async geocode(address: string): Promise<Coordinates> {
    const url = `${this.config.banBaseUrl}/search/?q=${encodeURIComponent(address)}&limit=1`;

    let response: BanResponse;
    try {
      response = await this.httpClient.getJson<BanResponse>(url, {
        timeoutMs: this.config.httpTimeoutMs,
      });
    } catch (err) {
      // La BAN repond 400 (au lieu d'un simple resultat vide) pour une requete de
      // moins de 3 caracteres. On la traite comme "adresse introuvable" plutot que
      // d'introduire une erreur domaine specifique a cette contrainte d'un seul
      // fournisseur : voir README, section ADR.
      if (err instanceof HttpRequestError && err.status === 400) {
        throw new AddressNotFoundError(address);
      }
      throw new ProviderUnavailableError(PROVIDER_NAME, err);
    }

    const { features } = response;
    if (!Array.isArray(features) || features.length === 0) {
      throw new AddressNotFoundError(address);
    }

    const coordinates = features[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      throw new ProviderUnavailableError(
        PROVIDER_NAME,
        new Error("Malformed BAN response: missing or invalid geometry.coordinates")
      );
    }

    // GeoJSON : l'ordre est [longitude, latitude], inverse de notre domaine.
    const [longitude, latitude] = coordinates;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      throw new ProviderUnavailableError(
        PROVIDER_NAME,
        new Error("Malformed BAN response: geometry.coordinates must contain two numbers")
      );
    }

    return { latitude, longitude };
  }
}
