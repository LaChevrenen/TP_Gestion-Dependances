import type { Coordinates } from "../../domain/Coordinates.js";
import type { Geocoder } from "../../domain/ports/Geocoder.js";

// Mode demo : aucune dependance reseau (ni HttpClient, ni config). Coordonnees d'Ales.
export class DemoGeocoder implements Geocoder {
  async geocode(): Promise<Coordinates> {
    return { latitude: 44.1279, longitude: 4.0817 };
  }
}
