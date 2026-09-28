import { inject, injectable } from "inversify";
import { TYPES } from "../../types.js";
import type { Coordinates } from "../../domain/Coordinates.js";
import type { Geocoder } from "../../domain/ports/Geocoder.js";
import type { Cache } from "./Cache.js";

// Decorateur de Geocoder : seuls les succes sont caches (jamais une panne ni un "introuvable").
@injectable()
export class CachingGeocoder implements Geocoder {
  constructor(
    @inject(TYPES.GeocoderDelegate) private readonly delegate: Geocoder,
    @inject(TYPES.GeocodeCache) private readonly cache: Cache<Coordinates>
  ) {}

  async geocode(address: string): Promise<Coordinates> {
    const key = address.trim().replace(/\s+/g, " ").toLowerCase();
    const cached = await this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const coordinates = await this.delegate.geocode(address);
    await this.cache.set(key, coordinates);
    return coordinates;
  }
}
