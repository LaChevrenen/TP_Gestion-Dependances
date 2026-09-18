import type { Coordinates } from "../Coordinates.js";

export interface Geocoder {
  geocode(address: string): Promise<Coordinates>;
}
