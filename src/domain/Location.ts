import type { Coordinates } from "./Coordinates.js";

export interface Location {
  readonly address: string;
  readonly coordinates: Coordinates;
}
