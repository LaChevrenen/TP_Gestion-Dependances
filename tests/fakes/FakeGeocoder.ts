import type { Coordinates } from "../../src/domain/Coordinates.js";
import type { Geocoder } from "../../src/domain/ports/Geocoder.js";

export class FakeGeocoder implements Geocoder {
  constructor(private readonly result: Coordinates | Error) {}

  async geocode(_address: string): Promise<Coordinates> {
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}
